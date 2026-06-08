import sqlite3

from app.readers.state_db import HermesStateDbReader


def test_reader_supports_messages_created_at_column(tmp_path):
    db_path = tmp_path / "state.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE messages (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            role TEXT,
            content TEXT,
            created_at INTEGER
        );
        INSERT INTO messages VALUES ('msg-1', 'sess-1', 'user', 'hello', 1000);
        INSERT INTO messages VALUES ('msg-2', 'sess-1', 'assistant', 'hi', 2000);
        """
    )
    conn.close()

    reader = HermesStateDbReader(str(tmp_path))

    events = reader.read_events(1000)

    assert [event.id for event in events] == ["evt-msg-2"]
    assert events[0].timestamp == 2000
