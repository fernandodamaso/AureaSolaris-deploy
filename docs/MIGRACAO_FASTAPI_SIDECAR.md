# Relatório Técnico: Migração Backend Python → FastAPI Sidecar Tauri

**Projeto:** Aurea Solaris  
**Data:** 11/06/2026  
**Objetivo:** Eliminar a chamada repetida `python.exe astro_engine.py` pelo Rust, substituindo por um servidor FastAPI persistente (sidecar) acessível via HTTP local.

---

## 1. Problema Atual (Baseline)

### Fluxo atual (lento e frágil)
```
Frontend (React) 
  → invoke('run_astro_engine', payload)     [Tauri IPC]
    → lib.rs: run_astro_engine()            [spawns python.exe]
      → astro_engine.py __main__            [processo Python sobe, importa swisseph/kerykeion, calcula, imprime JSON, morre]
        → stdout → Rust → JSON.parse → React
```

**Problemas:**
- Cada chamada spawna um novo processo Python (~2-5s overhead de cold start com swisseph)
- `swisseph` + `kerykeion` + `numpy` precisam ser importados toda vez
- O payload via `sys.argv[1]` com JSON escapado é frágil
- Sem cache: cálculos de trânsito repetidos (ex: refresh automático a cada 60s) reimportam tudo
- No Windows, `python.exe` pode não estar no PATH para todos os usuários

### Fluxo proposto (rápido e estável)
```
Frontend (React)
  → invoke('run_astro_engine', payload)      [Tauri IPC — SEM MUDANÇA no frontend]
    → lib.rs: run_astro_engine()             [agora faz HTTP POST → 127.0.0.1:9876/natal]
      → FastAPI sidecar (main_api.py)        [servidor persistente, swisseph já carregado]
        → calculate_astrology()              [cálculo instantâneo, sem cold start]
          → JSON response → Rust → React
```

---

## 2. Arquitetura da Solução

### 2.1. Novo arquivo: `main_api.py`

Localização: `C:\AureaSolaris\main_api.py`  
Função: Servidor FastAPI que expõe o `astro_engine.py` via HTTP.

```
C:\AureaSolaris/
├── astro_engine.py          # EXISTENTE — não modificado
├── main_api.py              # NOVO — servidor FastAPI
├── requirements-api.txt     # NOVO — dependências do servidor
├── src-tauri/
│   ├── tauri.conf.json      # MODIFICADO — sidecar config
│   └── src/lib.rs           # MODIFICADO — HTTP client em vez de Command::new("python.exe")
└── ...
```

### 2.2. Estrutura de `main_api.py`

```python
"""
Aurea Solaris — Astro API Server (FastAPI Sidecar)
Roda como processo persistente na porta 9876.
Exposto ao Tauri via 127.0.0.1:9876.
"""
import os
import sys
import json
import uvicorn
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

# ─── Importa o engine (cold start ÚNICO, uma vez) ───
from astro_engine import (
    calculate_astrology,
    calculate_transit_positions,
)

# ─── Porta fixa — deve bater com a do sidecar no tauri.conf.json ───
API_PORT = int(os.environ.get("ASTRO_API_PORT", 9876))
API_HOST = "127.0.0.1"

# ─── Lifespan: configuração de arranque (equivalente ao antigo startup event) ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Executa na inicialização. Garante que swisseph está pronto."""
    print(f"[AureaSolaris] FastAPI sidecar rodando em http://{API_HOST}:{API_PORT}", flush=True)
    print(f"[AureaSolaris] SwissEphemeris: {'OK' if True else 'FALLBACK'}", flush=True)
    yield
    print("[AureaSolaris] Sidecar encerrando.", flush=True)

app = FastAPI(
    title="Aurea Solaris — Astro API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS liberado apenas para localhost (Tauri webview)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ─── Modelos Pydantic (validação de entrada) ───

class NatalRequest(BaseModel):
    """Parâmetros para cálculo de mapa natal."""
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    day: Optional[int] = Field(default=None, ge=1, le=31)
    hour: Optional[float] = Field(default=None, ge=0.0, le=24.0)
    lat: float = Field(default=-15.7833)
    lon: float = Field(default=-47.9333)
    house_system: str = Field(default="Regiomontanus")

class TransitRequest(BaseModel):
    """Parâmetros para cálculo de trânsitos."""
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    day: Optional[int] = Field(default=None, ge=1, le=31)
    hour: Optional[float] = Field(default=None, ge=0.0, le=24.0)
    lat: float = Field(default=-15.7833)
    lon: float = Field(default=-47.9333)
    include_asteroids: bool = Field(default=False)

# ─── Helper: preenche defaults com datetime.now() ───

def _fill_defaults(req: dict) -> dict:
    """Substitui None por valores do momento atual."""
    now = datetime.now()
    return {
        "year": req.get("year") or now.year,
        "month": req.get("month") or now.month,
        "day": req.get("day") or now.day,
        "hour": req.get("hour") or (now.hour + now.minute / 60),
        "lat": req.get("lat", -15.7833),
        "lon": req.get("lon", -47.9333),
    }

# ─── Rotas ───

@app.get("/health")
async def health():
    """Health check para o Tauri verificar se o sidecar está vivo."""
    return {"status": "ok", "engine": "swisseph"}

@app.post("/natal")
async def natal(req: NatalRequest):
    """Mapa natal — rota equivalente ao antigo 'run_astro_engine'."""
    params = _fill_defaults(req.model_dump())
    params["house_system"] = req.house_system

    try:
        result = calculate_astrology(
            year=params["year"],
            month=params["month"],
            day=params["day"],
            hour=params["hour"],
            lat=params["lat"],
            lon=params["lon"],
            house_system=params["house_system"],
        )
        return result
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )

@app.post("/transit")
async def transit(req: TransitRequest):
    """Trânsitos — rota equivalente ao antigo 'get_transit_positions'."""
    params = _fill_defaults(req.model_dump())

    try:
        result = calculate_transit_positions(
            year=params["year"],
            month=params["month"],
            day=params["day"],
            hour=params["hour"],
            lat=params["lat"],
            lon=params["lon"],
            include_asteroids=req.include_asteroids,
        )
        return result
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )

@app.get("/config")
async def config():
    """Retorna configuração do engine (ephe path, planetas, house systems)."""
    from astro_engine import HOUSE_SYSTEMS, SIGN_ORDER, SWE_AVAILABLE, KERYKEION_AVAILABLE
    return {
        "house_systems": list(HOUSE_SYSTEMS.keys()),
        "signs": SIGN_ORDER,
        "swisseph": SWE_AVAILABLE,
        "kerykeion": KERYKEION_AVAILABLE,
    }

# ─── Entry point ───

if __name__ == "__main__":
    # Garante UTF-8 no Windows
    if sys.platform == "win32":
        sys.stdout = __import__("io").TextIOWrapper(
            sys.stdout.buffer, encoding="utf-8"
        )
    uvicorn.run(
        "main_api:app",
        host=API_HOST,
        port=API_PORT,
        log_level="info",
        # single_worker: garante que o engine não é importado 2x
        workers=1,
    )
```

### 2.3. Dependências: `requirements-api.txt`

```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
pydantic>=2.0
```

> **Nota:** `swisseph`, `kerykeion` e eventuais dependências de `astro_engine.py` já devem estar instalados no ambiente Python do usuário. Se não estiverem, listar em `requirements.txt` separado ou adicionar ao `requirements-api.txt`.

---

## 3. Mudanças no Rust (`src-tauri/src/lib.rs`)

### 3.1. Substituir `run_astro_engine` e `get_transit_positions`

A função atual faz `Command::new("python.exe")`. A nova faz HTTP para `127.0.0.1:9876`.

```rust
// ─── NOVA CONSTANTE ───
const ASTRO_API_URL: &str = "http://127.0.0.1:9876";

// ─── NOVA FUNÇÃO AUXILIAR ───
/// Verifica se o sidecar Python está respondendo.
async fn astro_api_health_check() -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let res = client.get(format!("{}/health", ASTRO_API_URL))
        .send().await
        .map_err(|e| format!("Sidecar Python não está respondendo: {}", e))?;

    if res.status().is_success() {
        Ok(())
    } else {
        Err(format!("Sidecar retornou status {}", res.status()))
    }
}

// ─── run_astro_engine MODIFICADA ───
#[tauri::command]
async fn run_astro_engine(payload: Option<String>) -> Result<String, String> {
    // 1. Verificar se sidecar está vivo
    if astro_api_health_check().await.is_err() {
        return Err(
            "O servidor astrológico (sidecar) não está rodando. \
             Verifique se main_api.py está ativo na porta 9876.".to_string()
        );
    }

    // 2. Parse do payload (aceita JSON ou None)
    let body: serde_json::Value = match payload {
        Some(ref p) => serde_json::from_str(p)
            .map_err(|e| format!("JSON inválido no payload: {}", e))?,
        None => serde_json::json!({}),
    };

    // 3. Verificar se é natal ou transit
    let is_transit = body.get("transit")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let url = if is_transit {
        format!("{}/transit", ASTRO_API_URL)
    } else {
        format!("{}/natal", ASTRO_API_URL)
    };

    // 4. POST para o FastAPI sidecar
    let res = client.post(&url)
        .json(&body)
        .send().await
        .map_err(|e| format!("Erro de rede ao conectar ao sidecar: {}", e))?;

    let status = res.status();
    let text = res.text().await
        .map_err(|e| format!("Falha ao ler resposta do sidecar: {}", e))?;

    if status.is_success() {
        println!("Stark: sidecar retornou {} bytes", text.len());
        Ok(text)
    } else {
        Err(format!("Erro no sidecar ({}): {}", status, text))
    }
}

// ─── get_transit_positions SIMPLIFICADA ───
// Agora delega para run_astro_engine, que detecta "transit: true"
#[tauri::command]
async fn get_transit_positions(payload: String) -> Result<String, String> {
    // Injeta "transit": true no payload se não estiver presente
    let mut data: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|e| format!("JSON inválido: {}", e))?;

    if data.get("transit").and_then(|v| v.as_bool()) != Some(true) {
        data["transit"] = serde_json::json!(true);
    }

    run_astro_engine(Some(data.to_string())).await
}
```

### 3.2. Gerenciamento do Sidecar (start/stop)

Adicionar no `lib.rs` a lógica para iniciar o sidecar quando o app abre e encerrar quando fecha:

```rust
use std::process::{Command, Child};

// ─── State para gerenciar o processo sidecar ───
struct SidecarState {
    child: std::sync::Mutex<Option<Child>>,
}

impl SidecarState {
    fn new() -> Self {
        Self {
            child: std::sync::Mutex::new(None),
        }
    }

    fn start(&self, api_path: &std::path::Path) -> Result<(), String> {
        let mut guard = self.child.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(()); // já rodando
        }

        let child = Command::new("python")
            .arg(api_path)
            .current_dir(api_path.parent().unwrap_or(std::path::Path::new(".")))
            .env("ASTRO_API_PORT", "9876")
            .spawn()
            .map_err(|e| format!("Falha ao iniciar sidecar: {}", e))?;

        *guard = Some(child);
        println!("[AureaSolaris] Sidecar Python iniciado (PID esperado na porta 9876)");
        Ok(())
    }

    fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(ref mut child) = *guard {
                let _ = child.kill();
                println!("[AureaSolaris] Sidecar Python encerrado.");
            }
            *guard = None;
        }
    }
}
```

### 3.3. Integração no `run()` do Tauri

```rust
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Inicializar sidecar state
    let sidecar = Arc::new(SidecarState::new());

    // Caminho para main_api.py
    let api_path = std::path::PathBuf::from("C:\\AureaSolaris\\main_api.py");

    // Tentar iniciar o sidecar
    if let Err(e) = sidecar.start(&api_path) {
        eprintln!("[AureaSolaris] AVISO: Não foi possível iniciar sidecar: {}", e);
        eprintln!("[AureaSolaris] O app funcionará, mas cálculos astrológicos falharão.");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(sidecar.clone())   // Disponível via State<SidecarState>
        .invoke_handler(tauri::generate_handler![
            // ... (todas as commands existentes, sem mudar)
            openrouter_chat,
            ollama_chat,
            // ...
            run_astro_engine,
            get_transit_positions,
            // ...
        ])
        // Encerrar sidecar quando o app fecha
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    // Cleanup (não é perfeito com Tauri, mas funciona em maioria dos casos)
    // Alternativa: usar um drop guard
    sidecar.stop();
}
```

---

## 4. Configuração do Sidecar em `tauri.conf.json`

O Tauri 2 suporta sidecars nativamente. O binário empacotado (via PyInstaller) vai para `src-tauri/binaries/`.

### 4.1. Estrutura de binários esperada

```
src-tauri/
├── binaries/
│   └── astro-engine-x86_64-pc-windows-msvc.exe    # Output do PyInstaller
├── tauri.conf.json
└── src/lib.rs
```

### 4.2. `tauri.conf.json` — Seção sidecar + permissões

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Aurea Solaris",
  "version": "0.1.0",
  "identifier": "com.vivic.aurea-solaris",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Aurea Solaris",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "minWidth": 900,
        "minHeight": 650
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "externalBin": [
      "binaries/astro-engine"
    ]
  },
  "plugins": {}
}
```

**Nota:** A chave `"externalBin"` faz o Tauri empacotar o executável junto com o app. O binário precisa seguir a nomenclatura `<name>-<target-triple>.exe`.

---

## 5. Empacotamento com PyInstaller

### 5.1. Instalação do PyInstaller

```bash
pip install pyinstaller
```

### 5.2. Arquivo de spec (recomendado): `build_sidecar.spec`

```python
# build_sidecar.spec — PyInstaller spec para o sidecar
# Executar: pyinstaller build_sidecar.spec

a = Analysis(
    ['main_api.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('astro_engine.py', '.'),        # Engine original (importado como módulo)
        ('ephe', 'ephe'),                # Arquivos de efemérides Swiss Ephemeris (se existirem)
    ],
    hiddenimports=[
        'astro_engine',
        'swisseph',                     # Swiss Ephemeris Python bindings
        'kerykeion',                    # Fallback engine
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'pydantic',
        'starlette',
        'anyio',
        'h11',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='astro-engine-x86_64-pc-windows-msvc',   # Nome que o Tauri espera
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,                   # IMPORTANTE: sidecar precisa de console para logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

### 5.3. Comando para compilar

```bash
# No diretório C:\AureaSolaris
pyinstaller build_sidecar.spec --clean

# O executável gerado fica em:
# dist/astro-engine-x86_64-pc-windows-msvc.exe
```

### 5.4. Copiar para o diretório do Tauri

```bash
# Criar diretório de binários (se não existir)
mkdir -p src-tauri/binaries/

# Copiar o executável
cp dist/astro-engine-x86_64-pc-windows-msvc.exe src-tauri/binaries/
```

---

## 6. Passo a Passo da Migração (Checklist)

### Fase 1: Criar o servidor FastAPI
- [ ] **1.1** Criar `C:\AureaSolaris\main_api.py` (conforme Seção 2.2)
- [ ] **1.2** Criar `C:\AureaSolaris\requirements-api.txt`
- [ ] **1.3** Instalar dependências: `pip install fastapi uvicorn[standard] pydantic`
- [ ] **1.4** Testar manualmente: `python main_api.py`
- [ ] **1.5** Validar com curl/PowerShell:
  ```powershell
  # Health check
  Invoke-RestMethod http://127.0.0.1:9876/health

  # Natal
  Invoke-RestMethod -Method POST http://127.0.0.1:9876/natal -ContentType "application/json" -Body '{"year":1990,"month":5,"day":15,"hour":14.5}'

  # Transit
  Invoke-RestMethod -Method POST http://127.0.0.1:9876/transit -ContentType "application/json" -Body '{"transit":true}'
  ```

### Fase 2: Modificar o Rust
- [ ] **2.1** Adicionar `reqwest` se não estiver no Cargo.toml (já está: `features = ["json", "rustls-tls", "stream"]`)
- [ ] **2.2** Modificar `run_astro_engine()` em `lib.rs` (conforme Seção 3.1)
- [ ] **2.3** Simplificar `get_transit_positions()` em `lib.rs`
- [ ] **2.4** Adicionar `SidecarState` e gerenciamento de processo (conforme Seção 3.2/3.3)
- [ ] **2.5** `cargo build` para validar compilação

### Fase 3: Testar integração
- [ ] **3.1** Iniciar sidecar manualmente: `python main_api.py`
- [ ] **3.2** Iniciar Tauri em dev mode: `npm run tauri dev`
- [ ] **3.3** Verificar que mapa natal carrega normalmente no frontend
- [ ] **3.4** Verificar que trânsitos atualizam normalmente
- [ ] **3.5** Testar cenário: fechar e reabrir o app (sidecar deve reiniciar)

### Fase 4: Empacotar com PyInstaller
- [ ] **4.1** Criar `build_sidecar.spec` (conforme Seção 5.2)
- [ ] **4.2** Executar `pyinstaller build_sidecar.spec --clean`
- [ ] **4.3** Testar o executável standalone: `dist/astro-engine-x86_64-pc-windows-msvc.exe`
- [ ] **4.4** Copiar para `src-tauri/binaries/`

### Fase 5: Configurar Tauri para bundle
- [ ] **5.1** Atualizar `tauri.conf.json` com `"externalBin"` (conforme Seção 4.2)
- [ ] **5.2** Criar `src-tauri/capabilities/default.json` (se não existir) com permissão para sidecar:
  ```json
  {
    "identifier": "default",
    "description": "Default capabilities",
    "windows": ["main"],
    "permissions": [
      "core:default",
      "opener:default",
      "fs:default",
      "dialog:default",
      "process:default",
      "shell:allow-execute"
    ]
  }
  ```
- [ ] **5.3** Testar build de produção: `npm run tauri build`

### Fase 6: Limpeza (pós-validação)
- [ ] **6.1** Remover código morto: `Command::new("python.exe")` em `lib.rs`
- [ ] **6.2** Remover chamadas `run_agm_engine` se o AGM também migrar para sidecar
- [ ] **6.3** Documentar no README como iniciar em dev mode vs. produção

---

## 7. Porta e Nomes

| Elemento | Valor |
|----------|-------|
| Porta do sidecar | `9876` (configurável via `ASTRO_API_PORT`) |
| Host | `127.0.0.1` (somente localhost) |
| Nome do binário empacotado | `astro-engine-x86_64-pc-windows-msvc.exe` |
| Health check | `GET /health` |
| Mapa natal | `POST /natal` |
| Trânsitos | `POST /transit` |
| Config do engine | `GET /config` |

---

## 8. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Sidecar não inicia | Cálculos astrológicos indisponíveis | Health check no Rust; fallback para `calculateFallback()` JS já existe no frontend |
| PyInstaller não inclui swisseph | Exceção no cold start | Incluir `swisseph` em `hiddenimports`; testar executável standalone |
| Porta 9876 já em uso | Sidecar falha ao bind | Usar `ASTRO_API_PORT` como variável de ambiente; implementar retry com porta alternativa |
| Sidecar morre durante sessão | Próxima chamada falha | Health check antes de cada POST; reiniciar automaticamente se necessário |
| Tauri `externalBin` não resolve caminho no dev | Binário não encontrado | Em dev, usar `Command::new("python").arg("main_api.py")` direto (já existente como fallback) |

---

## 9. Validação de Compatibilidade

### Frontend (zero mudanças)
- `useAstroData.ts` chama `invoke('run_astro_engine', { payload })` → **NÃO MUDA**
- `useTransitData.ts` chama `invoke('get_transit_positions', { payload })` → **NÃO MUDA**
- `safeInvoke` em `tauri.ts` → **NÃO MUDA**
- Formato de retorno JSON → **IDENTICO** (mesmo `calculate_astrology()` e `calculate_transit_positions()`)

### Backend (astro_engine.py)
- `astro_engine.py` → **NÃO MODIFICADO** — importado como módulo pelo `main_api.py`
- Funções `calculate_astrology()` e `calculate_transit_positions()` → **ASSINATURAS MANTIDAS**

### Rust (lib.rs)
- `run_astro_engine()` → assinatura idêntica `async fn(payload: Option<String>) -> Result<String, String>`
- `get_transit_positions()` → assinatura idêntica `async fn(payload: String) -> Result<String, String>`
- Frontend não percebe a mudança

---

## 10. Decisão Técnica: Por que não Tauri Sidecar Nativo?

O Tauri 2 tem suporte nativo a sidecars via `externalBin` + `tauri::process::Command`. Porém, para este caso específico, a abordagem híbrida (Rust gerencia o processo, mas comunica por HTTP) é superior porque:

1. **Health checks e restart**: HTTP permite verificar se o sidecar está vivo e reiniciar
2. **Debugging**: O sidecar pode ser testado independentemente com curl
3. **Futuro**: A porta pode ser compartilhada com outros microserviços locais
4. **Simplicidade**: Não precisa de plugin adicional do Tauri para sidecar
5. **Compatibilidade**: Funciona tanto em dev (`python main_api.py`) quanto em produção (PyInstaller)

---

*Fim do relatório.*
