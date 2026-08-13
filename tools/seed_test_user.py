"""Seed an isolated test-user sandbox with a full dummy life."""

from __future__ import annotations

import argparse
import os
import secrets
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from browser_workspace import (  # noqa: E402
    create_diary_entry,
    create_diary_folder,
    list_boards,
    list_diary_folders,
    load_health_memory,
    save_board,
    save_health_memory,
    update_diary_entry,
)
from local_storage import LocalStorage  # noqa: E402

SEED_VERSION = "1"
OWNER_ID = "aurea-test"
DISPLAY_NAME = "Pessoa Teste"
LOGIN_NAME = "teste"
BOARD_ID = "caderno-teste"
BOARD_NAME = "Caderno de teste"
DIARY_FOLDER_NAME = "Estudo"
DIARY_ENTRY_TITLE = "Primeira anotacao de teste"
HERMES_TOPIC_KEY = "estudo-teste"
HERMES_THREAD_TITLE = "Estudo de teste"


def is_forbidden_personal_data_dir(data_dir: Path) -> bool:
    local = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if not local:
        return False
    personal = (Path(local) / "Aurea Solaris" / "data").resolve()
    return data_dir.resolve() == personal


def _marker_path(data_dir: Path) -> Path:
    return data_dir / "memory" / "owners" / OWNER_ID / ".seed-version"


def _ensure_account(storage: LocalStorage) -> None:
    accounts = storage.list_private_accounts_for_bootstrap()
    if not accounts:
        storage.create_local_account_if_empty(
            OWNER_ID,
            DISPLAY_NAME,
            LOGIN_NAME,
            secrets.token_urlsafe(32),
        )
        return
    if len(accounts) == 1 and accounts[0]["account_id"] == OWNER_ID:
        return
    raise RuntimeError(
        "A configuração local do usuário de teste é ambígua; o seed foi recusado."
    )


def _seed_caderno() -> None:
    if any(board["id"] == BOARD_ID for board in list_boards(OWNER_ID)):
        return
    nodes = [
        {
            "id": 1,
            "type": "sticky",
            "x": 80,
            "y": 80,
            "w": 240,
            "h": 160,
            "text": "Nota A de teste",
            "color": "#FFFDE7",
        },
        {
            "id": 2,
            "type": "sticky",
            "x": 360,
            "y": 80,
            "w": 240,
            "h": 160,
            "text": "Nota B de teste",
            "color": "#E3F2FD",
        },
    ]
    edges = [{"id": 3, "from": 1, "to": 2}]
    save_board(OWNER_ID, BOARD_ID, BOARD_NAME, nodes, edges)


def _seed_diary() -> None:
    folders = list_diary_folders(OWNER_ID)
    folder = next((item for item in folders if item.get("name") == DIARY_FOLDER_NAME), None)
    if folder is None:
        folder = create_diary_folder(OWNER_ID, DIARY_FOLDER_NAME, "📘")

    from browser_workspace import list_diary_entries

    if any(entry.get("title") == DIARY_ENTRY_TITLE for entry in list_diary_entries(OWNER_ID)):
        return

    entry = create_diary_entry(OWNER_ID, DIARY_ENTRY_TITLE, folder_id=folder["id"], status="idea")
    update_diary_entry(
        OWNER_ID,
        entry["id"],
        {
            "content": "Anotacao ficticia para testes do Caderno Vivo e do diario.",
            "status": "idea",
        },
    )


def _seed_health() -> None:
    existing = load_health_memory(OWNER_ID, "aurea-reference-natal")
    if isinstance(existing, list) and existing:
        return
    save_health_memory(
        OWNER_ID,
        "aurea-reference-natal",
        [
            {
                "id": "health-teste-1",
                "date": "2026-01-15T12:00:00Z",
                "fileName": "preview-teste.txt",
                "rawText": "Previa ficticia para testes. Nao e um exame real.",
            }
        ],
    )


def _seed_hermes(storage: LocalStorage) -> None:
    if any(thread.get("topic_key") == HERMES_TOPIC_KEY for thread in storage.list_hermes_threads(OWNER_ID)):
        return

    opened = storage.open_hermes_thread(OWNER_ID, HERMES_TOPIC_KEY, HERMES_THREAD_TITLE)
    thread_id = opened["thread"]["id"]
    message = storage.append_hermes_message(
        OWNER_ID,
        thread_id,
        "user",
        "Pergunta ficticia de teste sobre o mapa.",
        "personal_note",
    )
    storage.propose_hermes_memory(
        OWNER_ID,
        "Memoria proposta de teste.",
        "study_note",
        evidence_note="Fixture de teste",
        topic_key=HERMES_TOPIC_KEY,
        source_thread_id=thread_id,
        source_message_id=message["id"],
        confidence="inferred",
    )
    approved = storage.propose_hermes_memory(
        OWNER_ID,
        "Memoria aprovada de teste.",
        "preference",
        evidence_note="Fixture de teste",
        topic_key=HERMES_TOPIC_KEY,
        confidence="stated",
    )
    storage.review_hermes_memory(OWNER_ID, approved["id"], "approve")


def seed_test_user(data_dir: Path) -> dict:
    data_dir = data_dir.expanduser().resolve()
    if is_forbidden_personal_data_dir(data_dir):
        raise ValueError("Seeding the real personal Aurea data directory is forbidden.")

    data_dir.mkdir(parents=True, exist_ok=True)
    os.environ["AUREA_DATA_DIR"] = str(data_dir)

    marker = _marker_path(data_dir)
    if marker.is_file() and marker.read_text(encoding="utf-8").strip() == SEED_VERSION:
        return {"seeded": False, "owner_id": OWNER_ID}

    storage = LocalStorage.from_environment()
    storage.initialize()
    _ensure_account(storage)
    _seed_caderno()
    _seed_diary()
    _seed_health()
    _seed_hermes(storage)

    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text(SEED_VERSION, encoding="utf-8")
    return {"seeded": True, "owner_id": OWNER_ID}


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the isolated Aurea test-user sandbox.")
    parser.add_argument("--data-dir", required=True, help="Target AUREA_DATA_DIR for the test user")
    args = parser.parse_args()
    result = seed_test_user(Path(args.data_dir))
    print(f"owner_id={result['owner_id']} seeded={str(result['seeded']).lower()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
