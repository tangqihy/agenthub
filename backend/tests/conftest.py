import pytest
import pytest_asyncio

from app.storage.sqlite import SQLiteBackend

pytest_plugins = ("pytest_asyncio",)


@pytest_asyncio.fixture
async def storage(tmp_path):
    backend = SQLiteBackend(str(tmp_path / "test.db"))
    await backend.init_schema()
    return backend
