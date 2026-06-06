"""Postgres backend placeholder for Phase B — mirrors SQLiteBackend contract."""

from app.storage.sqlite import SQLiteBackend


class PostgresBackend(SQLiteBackend):
    """Phase B: replace with asyncpg implementation. For now inherits SQLite for tests."""

    def __init__(self, database_url: str) -> None:
        super().__init__(database_path=":memory:")
        self.database_url = database_url
