import sqlite3
from pathlib import Path

from app.readers.mapper import map_message_row, map_session_row


class HermesStateDbReader:
    def __init__(self, data_dir: str) -> None:
        self.db_path = Path(data_dir) / "state.db"

    def _connect(self) -> sqlite3.Connection:
        uri = f"file:{self.db_path}?mode=ro"
        return sqlite3.connect(uri, uri=True)

    def fetch_sessions_since(self, updated_after: int | None) -> list[dict]:
        if not self.db_path.exists():
            return []
        conn = self._connect()
        conn.row_factory = sqlite3.Row
        if updated_after is not None:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE updated_at > ? ORDER BY updated_at ASC",
                (updated_after,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM sessions ORDER BY updated_at ASC").fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def fetch_messages_since(self, created_after: int | None) -> list[dict]:
        if not self.db_path.exists():
            return []
        conn = self._connect()
        conn.row_factory = sqlite3.Row
        if created_after is not None:
            rows = conn.execute(
                "SELECT * FROM messages WHERE created_at > ? ORDER BY created_at ASC",
                (created_after,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM messages ORDER BY created_at ASC"
            ).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def read_sessions(self, updated_after: int | None = None):
        return [map_session_row(row) for row in self.fetch_sessions_since(updated_after)]

    def read_events(self, created_after: int | None = None):
        events = []
        for row in self.fetch_messages_since(created_after):
            event = map_message_row(row)
            if event:
                events.append(event)
        return events
