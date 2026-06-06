from pathlib import Path

from app.readers.mapper import load_json_file, map_cron_job


class CronJsonReader:
    def __init__(self, data_dir: str) -> None:
        self.path = Path(data_dir) / "cron" / "jobs.json"

    def read_jobs(self):
        if not self.path.exists():
            return []
        data = load_json_file(self.path)
        items = data.get("jobs") or data
        if isinstance(items, dict):
            items = list(items.values())
        return [map_cron_job(item) for item in items]
