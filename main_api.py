from dotenv import load_dotenv
"""
load_dotenv()
Aurea Solaris — Astro API Server (FastAPI Sidecar)
Roda como processo persistente na porta 9876.
Exposto ao Tauri via 127.0.0.1.

Start: python main_api.py
Env: ASTRO_API_PORT=9876 (default)
"""
import os
import sys
import io
import json
import math
import secrets
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional, List
from urllib.parse import urlparse

import httpx
import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ─── UTF-8 on Windows ───
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# ─── Importa o engine (cold start ÚNICO, uma vez) ───
from astro_engine import (
    calculate_astrology,
    calculate_transit_positions,
    HOUSE_SYSTEMS,
    SIGN_ORDER,
    SWE_AVAILABLE,
    KERYKEION_AVAILABLE,
)
from engine_governance import EngineGovernance

from local_storage import (
    StorageNotFoundError,
    StorageValidationError,
    get_storage,
)

# ─── Porta ───
API_PORT = int(os.environ.get("ASTRO_API_PORT", 9876))
API_HOST = "127.0.0.1"
SIDECAR_TOKEN_ENV = "AUREA_SIDECAR_TOKEN"


def require_sidecar_token(x_aurea_sidecar_token: Optional[str] = Header(default=None)) -> None:
    """Gate private storage routes with the token shared by the desktop shell."""
    expected = os.environ.get(SIDECAR_TOKEN_ENV)
    if not expected or not x_aurea_sidecar_token or not secrets.compare_digest(x_aurea_sidecar_token, expected):
        raise HTTPException(status_code=401, detail="Token do sidecar ausente ou inválido.")


# ─── Lifespan ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    storage_diagnostic = get_storage().diagnostic()
    print(f"[AureaSolaris] FastAPI sidecar rodando em http://{API_HOST}:{API_PORT}", flush=True)
    print(f"[AureaSolaris] SwissEphemeris: {'OK' if SWE_AVAILABLE else 'FALLBACK'}", flush=True)
    print(f"[AureaSolaris] Kerykeion: {'OK' if KERYKEION_AVAILABLE else 'N/A'}", flush=True)
    print(
        "[AureaSolaris] SQLite: "
        f"private={storage_diagnostic['private_database']['integrity']} "
        f"knowledge={storage_diagnostic['knowledge_database']['integrity']} "
        f"editorial_import={storage_diagnostic['editorial_import']['status']}",
        flush=True,
    )
    yield
    print("[AureaSolaris] Sidecar encerrando.", flush=True)


app = FastAPI(
    title="Aurea Solaris — Astro API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: apenas localhost (Tauri webview)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "tauri://localhost",
        "tauri://localhost:1420",
        "http://tauri.localhost",
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ─── Modelos Pydantic ───

class NatalRequest(BaseModel):
    """Complete parameters for a reproducible natal chart."""
    year: int = Field(ge=1900, le=2100)
    month: int = Field(ge=1, le=12)
    day: int = Field(ge=1, le=31)
    hour: float = Field(ge=0.0, lt=24.0)
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    timezone: str = Field(min_length=1, description="Confirmed IANA timezone, for example America/Sao_Paulo")
    utc_offset_minutes: Optional[int] = Field(default=None, ge=-840, le=840)
    house_system: str = Field(default="Regiomontanus")


class ChatMessage(BaseModel):
    """Mensagem individual no chat."""
    role: str = Field(description="Papel: 'system', 'user' ou 'assistant'")
    content: str = Field(description="Conteúdo da mensagem")


class ChatRequest(BaseModel):
    """Requisição de chat com Hermes."""
    messages: List[ChatMessage] = Field(description="Histórico de mensagens")
    context: Optional[str] = Field(default=None, description="Contexto adicional (página, dados astrológicos, etc.)")
    system_prompt_override: Optional[str] = Field(default=None, description="Substitui o prompt de sistema padrão (para agentes especializados)")
    allow_external: bool = Field(
        default=False,
        description="Consentimento explícito desta conversa para enviar o conteúdo a um provedor externo.",
    )


class HermesThreadOpenRequest(BaseModel):
    """Abre uma conversa privada por pessoa e tema, sem chamar provedor de IA."""

    owner_id: str = Field(min_length=1, max_length=128)
    topic_key: str = Field(min_length=1, max_length=160)
    title: Optional[str] = Field(default=None, max_length=240)


class HermesAccountCreateRequest(BaseModel):
    """Registro explícito de uma identidade local; a senha é derivada no sidecar."""

    account_id: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=240)
    login_name: str = Field(min_length=1, max_length=240)
    password: str = Field(min_length=12, max_length=1024)


class HermesLoginRequest(BaseModel):
    login_name: str = Field(min_length=1, max_length=240)
    password: str = Field(min_length=1, max_length=1024)


class HermesMessageCreateRequest(BaseModel):
    """Mensagem local classificada: a proveniência é sempre explícita."""

    owner_id: str = Field(min_length=1, max_length=128)
    role: str = Field(min_length=1, max_length=20)
    content: str = Field(min_length=1, max_length=50_000)
    provenance_kind: str = Field(min_length=1, max_length=40)
    calculation_receipt_hash: Optional[str] = Field(default=None, max_length=64)
    source_refs: Optional[List[str]] = Field(default=None, max_length=50)


class HermesMemoryProposeRequest(BaseModel):
    """Memoria proposta pelo Hermes ou pela pessoa; nunca nasce aprovada."""

    owner_id: str = Field(min_length=1, max_length=128)
    content: str = Field(min_length=1, max_length=20_000)
    memory_type: str = Field(min_length=1, max_length=40)
    evidence_note: Optional[str] = Field(default=None, max_length=2_000)
    topic_key: Optional[str] = Field(default=None, max_length=160)
    subject_kind: Optional[str] = Field(default=None, max_length=80)
    subject_ref: Optional[str] = Field(default=None, max_length=240)
    source_thread_id: Optional[str] = Field(default=None, max_length=128)
    source_message_id: Optional[str] = Field(default=None, max_length=128)
    confidence: str = Field(default="inferred", min_length=1, max_length=40)


class HermesMemoryReviewRequest(BaseModel):
    """A pessoa decide o destino de uma memoria proposta ou aprovada."""

    owner_id: str = Field(min_length=1, max_length=128)
    decision: str = Field(min_length=1, max_length=20)


class TransitRequest(BaseModel):
    """Transit parameters with explicit provenance for civil times."""
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    day: Optional[int] = Field(default=None, ge=1, le=31)
    hour: Optional[float] = Field(default=None, ge=0.0, lt=24.0)
    lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    timezone: Optional[str] = Field(default=None, min_length=1)
    utc_offset_minutes: Optional[int] = Field(default=None, ge=-840, le=840)
    include_asteroids: bool = Field(default=False)

class PdfExtractRequest(BaseModel):
    """Requisição para extração de texto de PDF."""
    file_path: str = Field(description="Caminho absoluto do arquivo PDF no disco local")


# ─── Chat provider config ───
# Ordem desejada: local primeiro.
# 1) Ollama local (provider padrão)
# 2) Providers externos apenas se explicitamente habilitados
HERMES_GATEWAY_URL = os.environ.get(
    "HERMES_GATEWAY_URL",
    "http://localhost:20128/v1/chat/completions",
)
HERMES_MODEL = os.environ.get("HERMES_MODEL", "hermes-combo")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
OPENAI_CHAT_URL = os.environ.get(
    "OPENAI_CHAT_URL",
    "https://api.openai.com/v1/chat/completions",
)
GEMINI_API_KEY = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

# Novas flags de provider
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5")
OLLAMA_FALLBACK_MODEL = os.environ.get("OLLAMA_FALLBACK_MODEL", "llama3")
LOCAL_ONLY = os.environ.get("LOCAL_ONLY", "true").lower() in ("1", "true", "yes", "y")
EXTERNAL_PROVIDERS_ENABLED = os.environ.get("EXTERNAL_PROVIDERS_ENABLED", "false").lower() in ("1", "true", "yes", "y")


SYSTEM_PROMPT = """Você é Hermes, assistente astrológico e de produtividade do Aurea Solaris.
Você é sábio, direto e empático. Fale em Português.
Use o contexto do usuário para dar conselhos personalizados.
Seja conciso mas completo. Use emojis com moderação para tornar a conversa agradável."""


# ─── Helpers de provider ────────────────────────────────────────────────

async def _ollama_available(session: httpx.AsyncClient) -> bool:
    try:
        resp = await session.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
        return resp.status_code == 200
    except Exception:
        return False


async def _ollama_list_models(session: httpx.AsyncClient) -> list[str]:
    try:
        resp = await session.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
        return [m.get("name", "") for m in data.get("models", []) if m.get("name")]
    except Exception:
        return []


async def _ollama_chat(session: httpx.AsyncClient, messages: list[dict], model: str) -> dict:
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "num_ctx": 8192,
        },
    }
    resp = await session.post(
        f"{OLLAMA_URL}/api/chat",
        json=payload,
        timeout=120.0,
    )
    resp.raise_for_status()
    data = resp.json()
    content = data.get("message", {}).get("content", "")
    if not content:
        raise HTTPException(
            status_code=502,
            detail={"error": "Ollama retornou resposta vazia."},
        )
    return {"reply": content}


async def _openai_chat(session: httpx.AsyncClient, messages: list[dict]) -> dict:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={"error": "OPENAI_API_KEY não configurada."},
        )
    payload = {"model": OPENAI_CHAT_MODEL, "messages": messages, "stream": False}
    resp = await session.post(
        OPENAI_CHAT_URL,
        json=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"},
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    choices = data.get("choices", [])
    if choices and choices[0].get("message", {}).get("content"):
        return {"reply": choices[0]["message"]["content"]}
    raise HTTPException(
        status_code=502,
        detail={"error": "OpenAI retornou resposta inválida."},
    )


async def _gemini_chat(session: httpx.AsyncClient, messages: list[dict], system_content: str) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={"error": "GOOGLE_GENERATIVE_AI_API_KEY não configurada."},
        )
    contents = []
    system_instruction = None
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        else:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    gemini_payload: dict = {"contents": contents}
    if system_instruction:
        gemini_payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    resp = await session.post(url, json=gemini_payload, headers={"Content-Type": "application/json"}, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates", [])
    if candidates and candidates[0].get("content", {}).get("parts", []):
        text = candidates[0]["content"]["parts"][0].get("text", "")
        if text:
            return {"reply": text}
    raise HTTPException(
        status_code=502,
        detail={"error": "Gemini retornou resposta inválida."},
    )


async def _openrouter_chat(session: httpx.AsyncClient, messages: list[dict]) -> dict:
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={"error": "OPENROUTER_API_KEY não configurada."},
        )
    payload = {"model": "google/gemini-3.5-flash", "messages": messages}
    resp = await session.post(
        "https://openrouter.ai/api/v1/chat/completions",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    choices = data.get("choices", [])
    if choices and choices[0].get("message", {}).get("content"):
        return {"reply": choices[0]["message"]["content"]}
    raise HTTPException(
        status_code=502,
        detail={"error": "OpenRouter retornou resposta inválida."},
    )


# ─── Request resolution ───

def _resolve_transit_request(req: TransitRequest) -> dict:
    """Resolve current transits in UTC; never fabricate a civil time or location."""
    supplied = {key: getattr(req, key) for key in ("year", "month", "day", "hour")}
    supplied_count = sum(value is not None for value in supplied.values())

    if supplied_count == 0:
        now_utc = datetime.now(timezone.utc)
        return {
            "year": now_utc.year,
            "month": now_utc.month,
            "day": now_utc.day,
            "hour": now_utc.hour + now_utc.minute / 60 + now_utc.second / 3600,
            "lat": req.lat,
            "lon": req.lon,
            "timezone": "UTC",
            "utc_offset_minutes": 0,
            "include_asteroids": req.include_asteroids,
            "input_time_source": "engine_clock_utc",
        }

    if supplied_count != len(supplied):
        raise HTTPException(
            status_code=422,
            detail={"error": "Transit calculations require year, month, day and hour together."},
        )
    if not req.timezone:
        raise HTTPException(
            status_code=422,
            detail={"error": "An IANA timezone is required when a civil transit time is supplied."},
        )

    return {
        **supplied,
        "lat": req.lat,
        "lon": req.lon,
        "timezone": req.timezone,
        "utc_offset_minutes": req.utc_offset_minutes,
        "include_asteroids": req.include_asteroids,
        "input_time_source": "request",
    }


def _raise_calculation_error(result: dict) -> None:
    """Expose an explicit failure instead of returning an approximate value."""
    message = str(result.get("error", "Calculation failed."))
    status_code = 503 if "unavailable" in message.lower() else 422
    raise HTTPException(status_code=status_code, detail=result)


# ─── Rotas ───

@app.get("/health")
async def health():
    """Health check para o Tauri verificar se o sidecar está vivo."""
    storage = get_storage().diagnostic()
    return {
        "status": "ok",
        "engine": "swisseph" if SWE_AVAILABLE else "kerykeion",
        "port": API_PORT,
        "timestamp_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "storage": {
            "private": storage["private_database"]["integrity"],
            "knowledge": storage["knowledge_database"]["integrity"],
            "legacy_import": storage["legacy_import_status"],
        },
    }


@app.get("/storage/diagnostic")
async def storage_diagnostic(_: None = Depends(require_sidecar_token)):
    """Expõe somente integridade e versões; nunca conteúdo privado."""
    try:
        return get_storage().diagnostic()
    except Exception as error:
        raise HTTPException(status_code=503, detail={"error": str(error)}) from error


@app.post("/storage/backup/private")
async def storage_backup_private(_: None = Depends(require_sidecar_token)):
    """Cria backup local verificado mediante ação explícita do aplicativo."""
    try:
        return get_storage().backup_private()
    except Exception as error:
        raise HTTPException(status_code=500, detail={"error": str(error)}) from error


def _raise_hermes_storage_error(error: Exception) -> None:
    """Map storage errors without exposing another person's private state."""
    if isinstance(error, StorageValidationError):
        raise HTTPException(status_code=422, detail={"error": str(error)}) from error
    if isinstance(error, StorageNotFoundError):
        raise HTTPException(status_code=404, detail={"error": str(error)}) from error
    raise HTTPException(status_code=503, detail={"error": "Memória local indisponível."}) from error


@app.post("/hermes/threads/open")
async def open_hermes_thread(req: HermesThreadOpenRequest, _: None = Depends(require_sidecar_token)):
    """Create/open a private study thread. No provider call or content inference occurs."""
    try:
        return get_storage().open_hermes_thread(req.owner_id, req.topic_key, req.title)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/accounts")
@app.post("/hermes/auth/register")
async def create_hermes_account(req: HermesAccountCreateRequest, _: None = Depends(require_sidecar_token)):
    """Register a local owner through the desktop shell's private channel."""
    try:
        return get_storage().create_private_account(
            account_id=req.account_id,
            display_name=req.display_name,
            login_name=req.login_name,
            password=req.password,
        )
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/auth/login")
async def login_hermes_account(req: HermesLoginRequest, _: None = Depends(require_sidecar_token)):
    """Authenticate an Argon2id local account."""
    try:
        return get_storage().authenticate_private_account(req.login_name, req.password)
    except StorageValidationError as error:
        raise HTTPException(status_code=401, detail="Credenciais inválidas.") from error
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/hermes/threads")
async def list_hermes_threads(
    owner_id: str = Query(min_length=1, max_length=128),
    limit: int = Query(default=30, ge=1, le=100),
    _: None = Depends(require_sidecar_token),
):
    """List only one owner's non-deleted Hermes threads."""
    try:
        return {"threads": get_storage().list_hermes_threads(owner_id, limit)}
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/hermes/threads/{thread_id}/context")
async def get_hermes_thread_context(
    thread_id: str,
    owner_id: str = Query(min_length=1, max_length=128),
    limit: int = Query(default=50, ge=1, le=100),
    _: None = Depends(require_sidecar_token),
):
    """Reopen a private thread with its recent, explicitly classified messages."""
    try:
        return get_storage().get_hermes_thread_context(owner_id, thread_id, limit)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/threads/{thread_id}/messages")
async def append_hermes_message(thread_id: str, req: HermesMessageCreateRequest, _: None = Depends(require_sidecar_token)):
    """Persist a message only in an active thread owned by req.owner_id."""
    try:
        return get_storage().append_hermes_message(
            owner_id=req.owner_id,
            thread_id=thread_id,
            role=req.role,
            content=req.content,
            provenance_kind=req.provenance_kind,
            calculation_receipt_hash=req.calculation_receipt_hash,
            source_refs=req.source_refs,
        )
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/memories/propose")
async def propose_hermes_memory(req: HermesMemoryProposeRequest, _: None = Depends(require_sidecar_token)):
    """Create a reviewable private memory; it does not enter approved recall automatically."""
    try:
        return get_storage().propose_hermes_memory(
            owner_id=req.owner_id,
            content=req.content,
            memory_type=req.memory_type,
            evidence_note=req.evidence_note,
            topic_key=req.topic_key,
            subject_kind=req.subject_kind,
            subject_ref=req.subject_ref,
            source_thread_id=req.source_thread_id,
            source_message_id=req.source_message_id,
            confidence=req.confidence,
        )
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/knowledge/search")
async def search_knowledge(
    query: str = Query(..., min_length=1, max_length=500),
    types: Optional[str] = Query(default=None, description="Comma-separated knowledge types: concept,claim,source"),
    limit: int = Query(default=20, ge=1, le=50),
):
    try:
        parsed_types = None
        if types:
            parsed_types = [part.strip().lower() for part in types.split(",") if part.strip()]
        return get_storage().search_knowledge(query, limit=limit, types=parsed_types)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/hermes/memories")
async def list_hermes_memories(
    owner_id: str = Query(min_length=1, max_length=128),
    status: Optional[str] = Query(default=None, max_length=20),
    limit: int = Query(default=50, ge=1, le=100),
    _: None = Depends(require_sidecar_token),
):
    """List only one owner's non-deleted Hermes memories."""
    try:
        return {"memories": get_storage().list_hermes_memories(owner_id, status, limit)}
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/memories/{memory_id}/review")
async def review_hermes_memory(memory_id: str, req: HermesMemoryReviewRequest, _: None = Depends(require_sidecar_token)):
    """Approve, revoke or forget one owned Hermes memory."""
    try:
        return get_storage().review_hermes_memory(req.owner_id, memory_id, req.decision)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/natal")
async def natal(req: NatalRequest):
    """Mapa natal completo — planetas, casas, aspectos, ângulos, Part of Fortune."""
    params = req.model_dump()

    try:
        result = calculate_astrology(
            year=params["year"],
            month=params["month"],
            day=params["day"],
            hour=params["hour"],
            lat=params["lat"],
            lon=params["lon"],
            house_system=params["house_system"],
            timezone_name=params["timezone"],
            utc_offset_minutes=params["utc_offset_minutes"],
        )
        if "error" in result:
            _raise_calculation_error(result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )


@app.post("/transit")
async def transit(req: TransitRequest):
    """Trânsitos — apenas posições planetárias, sem casas/aspectos."""
    params = _resolve_transit_request(req)

    try:
        result = calculate_transit_positions(
            year=params["year"],
            month=params["month"],
            day=params["day"],
            hour=params["hour"],
            lat=params["lat"],
            lon=params["lon"],
            include_asteroids=params["include_asteroids"],
            timezone_name=params["timezone"],
            utc_offset_minutes=params["utc_offset_minutes"],
        )
        if "error" in result:
            _raise_calculation_error(result)
        result.setdefault("meta", {}).setdefault("receipt", {}).setdefault("request", {})["time_source"] = params["input_time_source"]
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )


@app.get("/config")
async def config():
    """Retorna configuração do engine."""
    governance_status = {
        "available": False,
        "mode": None,
        "db_exists": False,
    }
    try:
        gov = EngineGovernance()
        governance_status = {
            "available": True,
            "mode": gov.mode,
            "db_exists": gov.db_path.exists(),
            "db_path": str(gov.db_path),
        }
    except Exception:
        pass
    return {
        "house_systems": list(HOUSE_SYSTEMS.keys()),
        "signs": SIGN_ORDER,
        "swisseph": SWE_AVAILABLE,
        "kerykeion": KERYKEION_AVAILABLE,
        "port": API_PORT,
        "governance": governance_status,
    }


@app.get("/governance/status")
async def governance_status():
    """Retorna status da governança do engine."""
    gov = EngineGovernance()
    gov.connect()
    try:
        preflight = gov.preflight("calculate_astrology")
        rules = [{
            "id": r.id,
            "name": r.name,
            "category": r.category,
            "rule_kind": r.rule_kind,
            "engine_ref": r.engine_ref,
            "library_path": r.library_path,
            "quality_state": r.quality_state,
            "compiled_at": r.compiled_at,
        } for r in preflight.rules_applied]
        review_targets = [{
            "id": t.id,
            "engine_ref": t.engine_ref,
            "library_path": t.library_path,
            "review_type": t.review_type,
            "priority": t.priority,
            "detail": t.detail,
        } for t in preflight.review_targets]
        return {
            "mode": gov.mode,
            "allowed": preflight.allowed,
            "calc_kind": preflight.calc_kind,
            "engine_refs": preflight.engine_refs,
            "rules_applied": rules,
            "review_targets": review_targets,
            "blocking_gaps": preflight.blocking_gaps,
        }
    finally:
        gov.close()


@app.post("/governance/preflight/{calc_kind}")
async def governance_preflight(calc_kind: str):
    """Executa preflight de governança para um ponto de entrada específico."""
    gov = EngineGovernance()
    gov.connect()
    try:
        preflight = gov.preflight(calc_kind)
        return {
            "mode": gov.mode,
            "allowed": preflight.allowed,
            "calc_kind": preflight.calc_kind,
            "engine_refs": preflight.engine_refs,
            "rules_applied": [
                {
                    "id": r.id,
                    "name": r.name,
                    "category": r.category,
                    "rule_kind": r.rule_kind,
                    "engine_ref": r.engine_ref,
                    "library_path": r.library_path,
                    "quality_state": r.quality_state,
                    "params_json": r.params_json,
                    "compiled_at": r.compiled_at,
                }
                for r in preflight.rules_applied
            ],
            "review_targets": [
                {
                    "id": t.id,
                    "engine_ref": t.engine_ref,
                    "library_path": t.library_path,
                    "review_type": t.review_type,
                    "priority": t.priority,
                    "detail": t.detail,
                }
                for t in preflight.review_targets
            ],
            "blocking_gaps": preflight.blocking_gaps,
        }
    finally:
        gov.close()


@app.post("/chat")
async def chat(req: ChatRequest):
    """Chat Hermes local-first; saída externa requer consentimento por conversa."""
    system_content = req.system_prompt_override if req.system_prompt_override else SYSTEM_PROMPT
    if req.context:
        system_content += f"\n\n--- CONTEXTO ATUAL ---\n{req.context}\n--- FIM DO CONTEXTO ---"

    messages = [{"role": "system", "content": system_content}]
    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    local_failures: list[str] = []
    async with httpx.AsyncClient(timeout=120.0) as session:
        if await _ollama_available(session):
            models = await _ollama_list_models(session)
            if models:
                model = OLLAMA_MODEL if OLLAMA_MODEL in models else models[0]
                try:
                    return await _ollama_chat(session, messages, model)
                except Exception:
                    local_failures.append("Ollama local não respondeu corretamente")
            else:
                local_failures.append("Ollama local não possui modelo instalado")
        else:
            local_failures.append("Ollama local não está em execução")

        gateway_host = urlparse(HERMES_GATEWAY_URL).hostname
        if gateway_host in {"localhost", "127.0.0.1", "::1"}:
            try:
                response = await session.post(
                    HERMES_GATEWAY_URL,
                    json={"model": HERMES_MODEL, "messages": messages, "stream": False},
                    headers={"Content-Type": "application/json"},
                    timeout=15.0,
                )
                response.raise_for_status()
                content = response.json().get("choices", [{}])[0].get("message", {}).get("content")
                if content:
                    return {"reply": content}
                local_failures.append("gateway local retornou resposta vazia")
            except Exception:
                local_failures.append("gateway local Hermes não está em execução")

        if not req.allow_external:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Hermes local indisponível. Nenhum conteúdo foi enviado para a internet.",
                    "local_status": local_failures,
                    "next_action": "Inicie um provedor local ou autorize explicitamente um provedor externo nesta conversa.",
                },
            )
        if LOCAL_ONLY or not EXTERNAL_PROVIDERS_ENABLED:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Provedores externos estão desativados pela configuração de privacidade do Aurea.",
                    "local_status": local_failures,
                },
            )

        for provider in (_openai_chat, _gemini_chat, _openrouter_chat):
            try:
                if provider is _gemini_chat:
                    return await provider(session, messages, system_content)
                return await provider(session, messages)
            except Exception:
                continue

    raise HTTPException(
        status_code=503,
        detail={"error": "Nenhum provedor Hermes configurado respondeu após consentimento explícito."},
    )


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Chat com Hermes via streaming SSE. Prioridade: Ollama local."""
    system_content = req.system_prompt_override if req.system_prompt_override else SYSTEM_PROMPT
    if req.context:
        system_content += f"\n\n--- CONTEXTO ATUAL ---\n{req.context}\n--- FIM DO CONTEXTO ---"

    messages = [{"role": "system", "content": system_content}]
    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    async def generate():
        async with httpx.AsyncClient(timeout=120.0) as session:
            if await _ollama_available(session):
                available_models = await _ollama_list_models(session)
                if not available_models:
                    yield f"data: {json.dumps({'error': 'Ollama sem modelos disponíveis.'})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                primary_model = OLLAMA_MODEL if OLLAMA_MODEL in available_models else available_models[0]
                fallback_model = OLLAMA_FALLBACK_MODEL if OLLAMA_FALLBACK_MODEL in available_models else None

                for model in [primary_model, fallback_model]:
                    if not model:
                        continue
                    try:
                        payload = {
                            "model": model,
                            "messages": messages,
                            "stream": True,
                            "options": {"num_ctx": 8192},
                        }
                        async with session.stream(
                            "POST",
                            f"{OLLAMA_URL}/api/chat",
                            json=payload,
                            timeout=120.0,
                        ) as resp:
                            resp.raise_for_status()
                            async for line in resp.aiter_lines():
                                if line.startswith("data: "):
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]":
                                        yield "data: [DONE]\n\n"
                                        return
                                    try:
                                        chunk = json.loads(data_str)
                                        delta = chunk.get("message", {}).get("content", "")
                                        if delta:
                                            yield f"data: {json.dumps({'content': delta})}\n\n"
                                    except json.JSONDecodeError:
                                        continue
                        yield "data: [DONE]\n\n"
                        return
                    except Exception as e:
                        print(f"[AureaSolaris] Stream Ollama falhou ({model}): {e}", flush=True)

                yield f"data: {json.dumps({'error': 'Ollama falhou para todos os modelos tentados.'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            if LOCAL_ONLY:
                yield f"data: {json.dumps({'error': 'Nenhum modelo de IA local está disponível.'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            if not EXTERNAL_PROVIDERS_ENABLED:
                yield f"data: {json.dumps({'error': 'Provedores externos desabilitados.'})}\n\n"
                yield "data: [DONE]\n\n"
                return

        yield f"data: {json.dumps({'error': 'Streaming indisponível para provedores externos no momento.'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    # The desktop executable is this FastAPI module bundled by PyInstaller.
    # Without this explicit entry point it exited successfully immediately,
    # leaving the Mandala and Hermes with a dead localhost gateway.  Binding
    # only to loopback keeps the local-first boundary intact.
    uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="warning")
