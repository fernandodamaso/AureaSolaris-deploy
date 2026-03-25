import json
import sys
import math
import io
from typing import List, Dict, Any, Optional

class Vector2D:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def add(self, other: 'Vector2D') -> 'Vector2D':
        return Vector2D(self.x + other.x, self.y + other.y)

    def sub(self, other: 'Vector2D') -> 'Vector2D':
        return Vector2D(self.x - other.x, self.y - other.y)

    def mul(self, scalar: float) -> 'Vector2D':
        return Vector2D(self.x * scalar, self.y * scalar)

    def distance_squared(self, other: 'Vector2D') -> float:
        dx = self.x - other.x
        dy = self.y - other.y
        return dx * dx + dy * dy

    def distance(self, other: 'Vector2D') -> float:
        return math.sqrt(self.distance_squared(other))

    def normalize(self) -> 'Vector2D':
        mag = self.distance(Vector2D(0, 0))
        if mag == 0:
            return Vector2D(0, 0)
        return Vector2D(self.x / mag, self.y / mag)

class Body:
    def __init__(self, id: str, mass: float, x: float, y: float, vx: float, vy: float):
        self.id = id
        self.mass = mass
        self.position = Vector2D(x, y)
        self.velocity = Vector2D(vx, vy)
        self.force = Vector2D(0, 0)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "mass": self.mass,
            "position": {"x": self.position.x, "y": self.position.y},
            "velocity": {"vx": self.velocity.x, "vy": self.velocity.y}
        }

class Scene:
    def __init__(self):
        self.time: float = 0.0
        self.bodies: List[Body] = []
        self.timestep: float = 0.016 # ~60fps default dt
        self.gravity_scale: float = 1.0
        self.repulsion_strength: float = 0.5
        self.softening: float = 0.1 # prevent division by zero near overlapping bodies

    def load_from_dict(self, data: Dict[str, Any]):
        self.time = float(data.get("time", 0.0))
        self.timestep = float(data.get("timestep", 0.016))
        
        settings = data.get("settings", {})
        self.gravity_scale = float(settings.get("gravityScale", 1.0))
        self.repulsion_strength = float(settings.get("repulsionStrength", 0.5))
        
        self.bodies = []
        for b in data.get("bodies", []):
            pos = b.get("position", {"x": 0, "y": 0})
            vel = b.get("velocity", {"vx": 0, "vy": 0})
            body = Body(
                str(b.get("id", "unknown")),
                float(b.get("mass", 1.0)),
                float(pos.get("x", 0.0)),
                float(pos.get("y", 0.0)),
                float(vel.get("vx", 0.0)),
                float(vel.get("vy", 0.0))
            )
            self.bodies.append(body)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "time": self.time,
            "timestep": self.timestep,
            "settings": {
                "gravityScale": self.gravity_scale,
                "repulsionStrength": self.repulsion_strength
            },
            "bodies": [b.to_dict() for b in self.bodies]
        }

    def compute_forces(self):
        # Reset forces
        for b in self.bodies:
            b.force = Vector2D(0, 0)
            
        n = len(self.bodies)
        for i in range(n):
            for j in range(i + 1, n):
                b1 = self.bodies[i]
                b2 = self.bodies[j]
                
                dist_sq = b1.position.distance_squared(b2.position) + self.softening
                dist = math.sqrt(dist_sq)
                direction = b2.position.sub(b1.position).normalize()
                
                # Gravity force magnitude (G * m1 * m2 / r^2)
                # Anti-gravity / repulsion: if repulsion_strength > 0, it subtracts from gravity.
                # Actually, let's just make net force = Gravity - Repulsion for simplicity in MVP.
                fg = (self.gravity_scale * b1.mass * b2.mass) / dist_sq
                fr = (self.repulsion_strength * b1.mass * b2.mass) / (dist_sq * dist) # repulsion falls off faster
                
                net_force_mag = fg - fr
                force_vec = direction.mul(net_force_mag)
                
                b1.force = b1.force.add(force_vec)
                b2.force = b2.force.sub(force_vec) # Newton's third law

    def step(self, dt: float):
        self.timestep = dt
        self.compute_forces()
        
        # Semi-implicit Euler integration
        for b in self.bodies:
            if b.mass <= 0:
                continue
            
            acc = b.force.mul(1.0 / b.mass)
            b.velocity = b.velocity.add(acc.mul(dt))
            b.position = b.position.add(b.velocity.mul(dt))
            
        self.time += dt

def handle_request(req: Dict[str, Any]) -> Dict[str, Any]:
    action = req.get("action", "")
    payload = req.get("payload", {})
    
    if action == "step":
        scene = Scene()
        scene.load_from_dict(payload.get("scene", {}))
        dt = float(payload.get("dt", 0.016))
        
        scene.step(dt)
        
        return {
            "status": "ok",
            "payload": {
                "scene": scene.to_dict()
            }
        }
        
    elif action == "start_simulation":
        # Just validates and echoes the initial scene with time=0
        scene = Scene()
        scene.load_from_dict(payload.get("scene", {}))
        scene.time = 0.0
        return {
            "status": "ok",
            "payload": {
                "scene": scene.to_dict(),
                "message": "simulation started"
            }
        }
        
    return {
        "status": "error",
        "message": f"Unknown action: {action}"
    }

if __name__ == "__main__":
    reconfig = getattr(sys.stdout, "reconfigure", None)
    if reconfig is not None:
        reconfig(encoding="utf-8")
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        
    try:
        if len(sys.argv) > 1:
            input_data = json.loads(sys.argv[1])
            req_id = input_data.get("reqId", "unknown")
            
            import time
            start_time = time.time()
            
            response = handle_request(input_data)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            envelope = {
                "reqId": req_id,
                "status": response.get("status", "error"),
                "payload": response.get("payload", {}),
                "meta": {
                    "durationMs": duration_ms
                }
            }
            if "message" in response:
                envelope["message"] = response["message"]
                
            print(json.dumps(envelope, ensure_ascii=False))
        else:
            print(json.dumps({
                "reqId": "none",
                "status": "error",
                "message": "No payload provided"
            }))
    except Exception as e:
        print(json.dumps({
            "reqId": "error",
            "status": "error",
            "message": str(e)
        }))
