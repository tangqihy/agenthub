from app.config import settings
from app.storage.base import StorageBackend
from app.storage.postgres import PostgresBackend
from app.storage.sqlite import SQLiteBackend


def create_storage() -> StorageBackend:
    if settings.storage_backend == "postgres":
        return PostgresBackend(settings.database_url)
    return SQLiteBackend(settings.database_path)
