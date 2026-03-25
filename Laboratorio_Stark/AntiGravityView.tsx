import React, { useState, useEffect, useRef } from 'react';
import { safeInvoke } from '../utils/tauri';

// Types mapping AGM Python outputs
interface Body {
  id: string;
  mass: number;
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
}

interface Scene {
  time: number;
  timestep: number;
  settings: {
    gravityScale: number;
    repulsionStrength: number;
  };
  bodies: Body[];
}

interface IPCResponse {
  reqId: string;
  status: string;
  payload?: {
    scene?: Scene;
    message?: string;
  };
  message?: string;
}

const DEFAULT_SCENE: Scene = {
  time: 0,
  timestep: 0.016,
  settings: { gravityScale: 1500.0, repulsionStrength: 500000.0 }, // Exaggerated for visual effect
  bodies: [
    { id: 'Sol', mass: 100, position: { x: 400, y: 300 }, velocity: { vx: 0, vy: 0 } },
    { id: 'Mercurio', mass: 5, position: { x: 450, y: 300 }, velocity: { vx: 0, vy: 150 } },
    { id: 'Venus', mass: 10, position: { x: 500, y: 300 }, velocity: { vx: 0, vy: -120 } },
    { id: 'Terra', mass: 12, position: { x: 300, y: 300 }, velocity: { vx: 0, vy: -100 } },
  ]
};

import { Button } from './common/BaseComponents';
import { Play, Pause, SkipForward, RotateCcw, MessageSquareQuote } from 'lucide-react';

export const AntiGravityView: React.FC = () => {
  const [scene, setScene] = useState<Scene>(DEFAULT_SCENE);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef(0);
  
  // Need refs for loop access to latest state
  const sceneRef = useRef(scene);
  const isPlayingRef = useRef(isPlaying);
  
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const invokeEngine = async (action: string, payload: any) => {
    reqIdRef.current += 1;
    const env = {
      reqId: `agm_${reqIdRef.current}`,
      channel: 'AGM',
      action,
      payload
    };
    
    try {
      const resStr = await safeInvoke<string>('run_agm_engine', { payload: JSON.stringify(env) });
      if (resStr) {
        const res: IPCResponse = JSON.parse(resStr);
        if (res.status === 'ok' && res.payload?.scene) {
          setScene(res.payload.scene);
        } else {
          console.error("AGM Error:", res.message);
        }
      }
    } catch (e) {
      console.error("IPC AGM Error:", e);
    }
  };

  const handleStart = () => {
    setIsPlaying(true);
    invokeEngine('start_simulation', { scene: sceneRef.current });
  };

  const handleStep = () => {
    invokeEngine('step', { dt: 0.016, scene: sceneRef.current });
  };

  const handlePause = () => setIsPlaying(false);
  
  const handleReset = () => {
    setIsPlaying(false);
    setScene(DEFAULT_SCENE);
  };

  useEffect(() => {
    let animationId: number;
    const loop = async (_time: number) => {
      if (isPlayingRef.current) {
        await invokeEngine('step', { dt: 0.016, scene: sceneRef.current });
      }
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Gradient Background
    const gradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 50,
      canvas.width/2, canvas.height/2, canvas.width/2
    );
    gradient.addColorStop(0, '#0F172A'); // Deep Navy
    gradient.addColorStop(1, '#020617'); // Rich Black
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for(let i=0; i<100; i++) {
       const x = Math.sin(i * 123.45) * canvas.width;
       const y = Math.cos(i * 678.9) * canvas.height;
       ctx.beginPath();
       ctx.arc(Math.abs(x % canvas.width), Math.abs(y % canvas.height), 0.5, 0, 2*Math.PI);
       ctx.fill();
    }

    scene.bodies.forEach(b => {
      const r = Math.max(4, Math.sqrt(b.mass) * 2.5); 
      
      // Dynamic Colors
      let baseColor = '#94A3B8'; // Slate 400
      let secondaryColor = '#475569'; // Slate 600
      
      if (b.id === 'Sol') {
        baseColor = '#F59E0B'; // Warning Orange (Sun)
        secondaryColor = '#FB923C';
      } else if (b.id === 'Terra') {
        baseColor = '#2563EB'; // Primary Blue
        secondaryColor = '#60A5FA';
      } else if (b.id === 'Venus') {
        baseColor = '#D946EF'; // Fuchsia
        secondaryColor = '#F0ABFC';
      } else if (b.id === 'Mercurio') {
        baseColor = '#14B8A6'; // Secondary Teal
        secondaryColor = '#5EEAD4';
      }

      ctx.save();
      ctx.shadowBlur = b.id === 'Sol' ? 25 : 12;
      ctx.shadowColor = baseColor;
      
      // Body fill
      const bodyGrad = ctx.createRadialGradient(b.position.x, b.position.y, 0, b.position.x, b.position.y, r);
      bodyGrad.addColorStop(0, secondaryColor);
      bodyGrad.addColorStop(1, baseColor);
      ctx.fillStyle = bodyGrad;
      
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, r, 0, 2 * Math.PI);
      ctx.fill();
      
      // Ring for Terra (Atmosphere/Trail vibe)
      if (b.id === 'Terra') {
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, r + 4, 0, 2 * Math.PI);
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(b.id.toUpperCase(), b.position.x + r + 8, b.position.y + 3);
    });

  }, [scene]);

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-100 p-8 overflow-hidden font-sans">
      <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-black tracking-[0.2em] text-white uppercase mb-2">
            AntiGravity <span className="text-primary">Module</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-widest border border-primary/20">
              Active Simulation
            </span>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest leading-none">
               T - <span className="text-slate-300 font-mono">{scene.time.toFixed(2)}s</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm">
          {!isPlaying ? (
            <Button variant="primary" size="md" onClick={handleStart} className="gap-2 group">
              <Play size={14} className="fill-current group-hover:scale-110 transition-transform"/> Start
            </Button>
          ) : (
            <Button variant="danger" size="md" onClick={handlePause} className="gap-2">
              <Pause size={14} className="fill-current"/> Pause
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={handleStep} disabled={isPlaying} className="gap-2 grayscale hover:grayscale-0 disabled:opacity-30">
            <SkipForward size={14} /> Step
          </Button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <Button variant="ghost" size="md" onClick={handleReset} className="text-danger hover:bg-danger/10 gap-2">
            <RotateCcw size={14} /> Reset
          </Button>
        </div>
      </div>
      
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/5 shadow-[0_0_50px_-12px_rgba(37,99,235,0.2)]">
        <canvas 
          ref={canvasRef} 
          width={1000} 
          height={800} 
          className="w-full h-full object-cover cursor-crosshair"
        />
        
        {/* Rafiki Premium Overlay */}
        <div className="absolute bottom-6 right-6 max-w-sm">
          <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
            
            <h3 className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
              <MessageSquareQuote size={14} className="text-primary drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]"/> 
              Rafiki Insight
            </h3>
            
            <p className="text-[13px] text-slate-300 italic leading-relaxed font-medium">
              &quot;Observe como os corpos puxam e repelem. A tensão em 
              <span className="text-primary font-bold not-italic font-mono mx-1">{scene.bodies[1]?.id}</span> 
              nos lembra que mesmo em órbitas caóticas, há equilíbrio.&quot;
            </p>
            
            <div className="mt-4 flex gap-2">
               <div className="h-1 w-8 bg-primary/30 rounded-full overflow-hidden">
                 <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(scene.time % 10) * 10}%` }} />
               </div>
               <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Telemetria Astral Ativa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
