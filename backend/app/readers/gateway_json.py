from pathlib import Path

from app.readers.mapper import load_json_file, map_gateway


class GatewayJsonReader:
    def __init__(self, data_dir: str) -> None:
        self.path = Path(data_dir) / "gateway_state.json"

    def read_gateways(self):
        if not self.path.exists():
            return []
        data = load_json_file(self.path)
        items = data.get("gateways") or data
        if isinstance(items, dict):
            items = list(items.values())
        return [map_gateway(item) for item in items]
