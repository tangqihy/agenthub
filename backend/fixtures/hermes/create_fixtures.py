"""Create Hermes fixture state.db and JSON files for local development."""

import json
import sqlite3
import time
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent


def _now_ms(offset_hours: int = 0) -> int:
    return int((time.time() - offset_hours * 3600) * 1000)


def create_state_db(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            source TEXT,
            model TEXT,
            started_at INTEGER,
            ended_at INTEGER,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            tool_calls INTEGER DEFAULT 0,
            updated_at INTEGER
        );
        CREATE TABLE messages (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            role TEXT,
            content TEXT,
            tool_name TEXT,
            tool_input TEXT,
            tool_output TEXT,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            created_at INTEGER,
            metadata TEXT
        );
        """
    )
    sessions = [
        ("sess-1", "Android Build", "hermes", "claude-sonnet", _now_ms(2), None, 8000, 4000, 5, _now_ms(0)),
        ("sess-2", "Travel Planning", "wechat", "claude-sonnet", _now_ms(24), _now_ms(20), 2000, 1000, 1, _now_ms(20)),
        ("sess-3", "P4 Sync Job", "hermes", "claude-opus", _now_ms(48), _now_ms(40), 50000, 30000, 12, _now_ms(40)),
    ]
    conn.executemany(
        "INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?,?)", sessions
    )
    messages = [
        ("msg-1", "sess-1", "user", "Build the Android APK", None, None, None, 0, 0, _now_ms(2), "{}"),
        ("msg-2", "sess-1", "assistant", "Starting build...", None, None, None, 100, 50, _now_ms(2), "{}"),
        ("msg-3", "sess-1", "tool", None, "gradle_build", "{}", "BUILD SUCCESS", 0, 0, _now_ms(1), "{}"),
        ("msg-4", "sess-1", "assistant", "Build complete at 82%", None, None, None, 200, 100, _now_ms(1), "{}"),
        ("msg-5", "sess-3", "user", "Sync p4 depot", None, None, None, 0, 0, _now_ms(48), "{}"),
        ("msg-6", "sess-3", "tool", None, "p4_sync", "{}", "synced", 0, 0, _now_ms(47), "{}"),
    ]
    conn.executemany(
        "INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?,?,?)", messages
    )
    conn.commit()
    conn.close()


def create_gateway_json(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "gateways": [
            {
                "id": "gw-wechat",
                "platform": "wechat",
                "status": "online",
                "last_seen": _now_ms(0),
                "message_count": 128,
                "latency_ms": 230,
                "error_count": 0,
            },
            {
                "id": "gw-feishu",
                "platform": "feishu",
                "status": "online",
                "last_seen": _now_ms(0),
                "message_count": 45,
                "latency_ms": 180,
                "error_count": 1,
            },
            {
                "id": "gw-webhook",
                "platform": "webhook",
                "status": "offline",
                "last_seen": _now_ms(72),
                "message_count": 10,
                "latency_ms": None,
                "error_count": 3,
            },
        ]
    }
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def create_cron_json(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "jobs": [
            {
                "id": "cron-build",
                "name": "Nightly Android Build",
                "schedule": "0 2 * * *",
                "status": "active",
                "last_run_at": _now_ms(8),
                "next_run_at": _now_ms(-16),
                "payload": {"command": "build android"},
            },
            {
                "id": "cron-backup",
                "name": "Database Backup",
                "schedule": "0 4 * * 0",
                "status": "paused",
                "last_run_at": _now_ms(72),
                "next_run_at": None,
                "payload": {"command": "backup"},
            },
        ]
    }
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


if __name__ == "__main__":
    create_state_db(FIXTURES / "state.db")
    create_gateway_json(FIXTURES / "gateway_state.json")
    create_cron_json(FIXTURES / "cron" / "jobs.json")
    print("Fixtures created.")
