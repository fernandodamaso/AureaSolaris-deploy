"""Identity/account persistence boundary.

Passwords and legacy derived verifier arguments are forwarded to the canonical
storage backend unchanged so Argon2id and migration-only compatibility stay in
one audited implementation.
"""

from __future__ import annotations

from typing import Any


class IdentityRepository:
    __slots__ = ("_storage",)

    def __init__(self, storage: Any):
        self._storage = storage

    def list_accounts_for_bootstrap(self) -> list[dict]:
        return self._storage.list_private_accounts_for_bootstrap()

    def create_local_account_if_empty(
        self,
        account_id: str,
        display_name: str,
        login_name: str,
        password: str,
    ) -> dict:
        return self._storage.create_local_account_if_empty(
            account_id=account_id,
            display_name=display_name,
            login_name=login_name,
            password=password,
        )

    def create_account(
        self,
        account_id: str,
        display_name: str,
        login_name: str,
        password_verifier: str | None = None,
        password_salt: str | None = None,
        password_algorithm: str | None = None,
        *,
        password: str | None = None,
    ) -> dict:
        return self._storage.create_private_account(
            account_id=account_id,
            display_name=display_name,
            login_name=login_name,
            password_verifier=password_verifier,
            password_salt=password_salt,
            password_algorithm=password_algorithm,
            password=password,
        )

    def authenticate(self, login_name: str, password: str) -> dict:
        return self._storage.authenticate_private_account(login_name, password)
