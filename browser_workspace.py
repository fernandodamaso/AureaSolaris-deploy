"""Private file workspace used by the browser runtime.

The desktop shell stores these same user-owned documents below its app-data
directory.  The browser runtime uses ``AUREA_DATA_DIR`` as that directory's
portable root, so both runtimes keep the editorial database separate from
per-person files and never trust an owner id supplied by the browser.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


_SAFE_ID = re.compile(r"^[A-Za-z0-9_.-]{1,128}$")


def is_workspace_safe_owner_id(value: str) -> bool:
    return isinstance(value, str) and bool(_SAFE_ID.fullmatch(value)) and not value.startswith(".")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _validate_id(value: str, label: str) -> str:
    if not is_workspace_safe_owner_id(value):
        raise ValueError(f"{label} inválido.")
    return value


def _data_root() -> Path:
    configured = os.environ.get("AUREA_DATA_DIR")
    if configured:
        return Path(configured).expanduser().resolve()
    local_app_data = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if not local_app_data:
        raise RuntimeError("AUREA_DATA_DIR não foi informado.")
    return (Path(local_app_data) / "Aurea Solaris" / "data").resolve()


def list_owner_workspace_ids() -> set[str]:
    owners_dir = _data_root() / "memory" / "owners"
    if not owners_dir.is_dir():
        return set()
    result: set[str] = set()
    for entry in owners_dir.iterdir():
        if not entry.is_dir():
            continue
        try:
            result.add(_validate_id(entry.name, "owner_id"))
        except ValueError:
            continue
    return result


def _owner_root(owner_id: str) -> Path:
    owner_id = _validate_id(owner_id, "owner_id")
    root = _data_root() / "memory" / "owners" / owner_id
    root.mkdir(parents=True, exist_ok=True)
    return root


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Não foi possível ler o arquivo privado {path.name}: {error}") from error


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except OSError:
            pass
        raise


def _board_dir(owner_id: str) -> Path:
    directory = _owner_root(owner_id) / "boards"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def save_board(owner_id: str, board_id: str, name: str, nodes: Any, edges: Any) -> int:
    board_id = _validate_id(board_id, "board_id")
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    data = {
        "nodes": nodes if isinstance(nodes, list) else [],
        "edges": edges if isinstance(edges, list) else [],
        "name": str(name or "Caderno"),
        "owner_id": owner_id,
        "updated_at": timestamp,
    }
    directory = _board_dir(owner_id)
    _write_json(directory / f"{board_id}.json", data)
    index_path = directory / "boards_index.json"
    entries = _read_json(index_path, [])
    if not isinstance(entries, list):
        entries = []
    entries = [item for item in entries if item.get("id") != board_id]
    entries.append({
        "id": board_id,
        "name": data["name"],
        "owner_id": owner_id,
        "updated_at": timestamp,
    })
    _write_json(index_path, entries)
    return timestamp


def load_board(owner_id: str, board_id: str) -> dict[str, Any]:
    board_id = _validate_id(board_id, "board_id")
    data = _read_json(_board_dir(owner_id) / f"{board_id}.json", {"nodes": [], "edges": []})
    if not isinstance(data, dict):
        raise RuntimeError("O caderno privado não contém um objeto JSON válido.")
    data["owner_id"] = owner_id
    return data


def list_boards(owner_id: str) -> list[dict[str, Any]]:
    entries = _read_json(_board_dir(owner_id) / "boards_index.json", [])
    if not isinstance(entries, list):
        return []
    return [{**item, "owner_id": owner_id} for item in entries if isinstance(item, dict)]


def delete_board(owner_id: str, board_id: str) -> bool:
    board_id = _validate_id(board_id, "board_id")
    directory = _board_dir(owner_id)
    board_path = directory / f"{board_id}.json"
    if board_path.exists():
        board_path.unlink()
    entries = _read_json(directory / "boards_index.json", [])
    if isinstance(entries, list):
        _write_json(directory / "boards_index.json", [item for item in entries if item.get("id") != board_id])
    return True


def load_health_memory(owner_id: str, profile_id: str) -> Any:
    profile_id = _validate_id(profile_id, "profile_id")
    return _read_json(_owner_root(owner_id) / "health" / f"{profile_id}_memory.json", [])


def save_health_memory(owner_id: str, profile_id: str, memory: Any) -> bool:
    profile_id = _validate_id(profile_id, "profile_id")
    _write_json(_owner_root(owner_id) / "health" / f"{profile_id}_memory.json", memory)
    return True


def _diary_dir(owner_id: str) -> Path:
    directory = _owner_root(owner_id) / "diary"
    (directory / "entries").mkdir(parents=True, exist_ok=True)
    return directory


def _folders(owner_id: str) -> list[dict[str, Any]]:
    directory = _diary_dir(owner_id)
    path = directory / "folders.json"
    folders = _read_json(path, None)
    if not isinstance(folders, list):
        folders = [{
            "id": "general",
            "owner_id": owner_id,
            "name": "Geral",
            "icon": "📁",
            "order": 0,
            "created_at": _now(),
        }]
        _write_json(path, folders)
    return [{**folder, "owner_id": owner_id} for folder in folders if isinstance(folder, dict)]


def list_diary_folders(owner_id: str) -> list[dict[str, Any]]:
    return _folders(owner_id)


def create_diary_folder(owner_id: str, name: str, icon: str = "📁") -> dict[str, Any]:
    folders = _folders(owner_id)
    folder = {
        "id": str(uuid.uuid4()),
        "owner_id": owner_id,
        "name": str(name or "Nova pasta"),
        "icon": str(icon or "📁"),
        "order": len(folders),
        "created_at": _now(),
    }
    folders.append(folder)
    _write_json(_diary_dir(owner_id) / "folders.json", folders)
    return folder


def _entry_path(owner_id: str, entry_id: str) -> Path:
    return _diary_dir(owner_id) / "entries" / f"{_validate_id(entry_id, 'entry_id')}.json"


def list_diary_entries(owner_id: str, folder_id: str | None = None) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    entries_dir = _diary_dir(owner_id) / "entries"
    for path in entries_dir.glob("*.json"):
        entry = _read_json(path, None)
        if not isinstance(entry, dict):
            continue
        if entry.get("owner_id") not in (None, owner_id):
            continue
        entry["owner_id"] = owner_id
        if folder_id is None or entry.get("folder_id") == folder_id:
            entries.append(entry)
    return sorted(entries, key=lambda item: item.get("created_at", ""), reverse=True)


def get_diary_entry(owner_id: str, entry_id: str) -> dict[str, Any] | None:
    entry = _read_json(_entry_path(owner_id, entry_id), None)
    if entry is None:
        return None
    if not isinstance(entry, dict) or entry.get("owner_id") not in (None, owner_id):
        raise ValueError("A entrada solicitada pertence a outro proprietário.")
    entry["owner_id"] = owner_id
    return entry


def create_diary_entry(owner_id: str, title: str, folder_id: str = "general", status: str = "idea") -> dict[str, Any]:
    now = _now()
    entry = {
        "id": str(uuid.uuid4()),
        "owner_id": owner_id,
        "title": str(title or "Nova Nota"),
        "content": "",
        "folder_id": str(folder_id or "general"),
        "created_at": now,
        "updated_at": now,
        "word_count": 0,
        "status": str(status or "idea"),
    }
    _write_json(_entry_path(owner_id, entry["id"]), entry)
    return entry


def update_diary_entry(owner_id: str, entry_id: str, changes: dict[str, Any]) -> dict[str, Any]:
    entry = get_diary_entry(owner_id, entry_id)
    if entry is None:
        raise LookupError("Entrada não encontrada.")
    for key in ("title", "content", "folder_id", "status"):
        if key in changes and changes[key] is not None:
            entry[key] = changes[key]
    if "content" in changes and changes["content"] is not None:
        entry["word_count"] = len(str(entry["content"]).split())
    entry["updated_at"] = _now()
    _write_json(_entry_path(owner_id, entry_id), entry)
    return entry


def delete_diary_entry(owner_id: str, entry_id: str) -> bool:
    path = _entry_path(owner_id, entry_id)
    if path.exists():
        path.unlink()
    return True


def delete_diary_folder(owner_id: str, folder_id: str) -> bool:
    folders = _folders(owner_id)
    folder = next((item for item in folders if item.get("id") == folder_id), None)
    if folder is None:
        raise LookupError("Pasta não encontrada.")
    if folder_id == "general":
        raise ValueError("Não é permitido excluir a pasta Geral padrão.")
    folders = [item for item in folders if item.get("id") != folder_id]
    _write_json(_diary_dir(owner_id) / "folders.json", folders)
    for entry in list_diary_entries(owner_id, folder_id):
        update_diary_entry(owner_id, entry["id"], {"folder_id": "general"})
    return True
