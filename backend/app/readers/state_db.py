import sqlite3
from pathlib import Path

from app.readers.mapper import map_message_row, map_session_row


class HermesStateDbReader:
    def __init__(self, data_dir: str) -> None:
        self.db_path = Path(data_dir) / "state.db"

    def _connect(self) -> sqlite3.Connection:
        uri = f"file:{self.db_path}?mode=ro"
        return sqlite3.connect(uri, uri=True)

    def fetch_sessions_since(self, started_after: int | None) -> list[dict]:
        """读 sessions，用 started_at 做增量（无 updated_at 字段）。"""
        if not self.db_path.exists():
            return []
        conn = self._connect()
        conn.row_factory = sqlite3.Row
        if started_after is not None:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE started_at > ? ORDER BY started_at ASC",
                (started_after,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM sessions ORDER BY started_at ASC"
            ).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def fetch_messages_since(self, timestamp_after: int | None) -> list[dict]:
        """读 messages，用 timestamp 做增量。"""
        if not self.db_path.exists():
            return []
        conn = self._connect()
        conn.row_factory = sqlite3.Row
        if timestamp_after is not None:
            rows = conn.execute(
                "SELECT * FROM messages WHERE timestamp > ? ORDER BY timestamp ASC",
                (timestamp_after,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM messages ORDER BY timestamp ASC"
            ).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def read_sessions(self, started_after: int | None = None):
        return [
            map_session_row(row) for row in self.fetch_sessions_since(started_after)
        ]

    def read_events(self, timestamp_after: int | None = None):
        events = []
        for row in self.fetch_messages_since(timestamp_after):
            event = map_message_row(row)
            if event:
                events.append(event)
        return events
