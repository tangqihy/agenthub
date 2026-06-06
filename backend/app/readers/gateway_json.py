from pathlib import Path

from app.readers.mapper import load_json_file, map_gateway


class GatewayJsonReader:
    def __init__(self, data_dir: str) -> None:
        self.path = Path(data_dir) / "gateway_state.json"

    def read_gateways(self):
        if not self.path.exists():
            return []
        data = load_json_file(self.path)
        platforms = data.get("platforms", {})
        gateways = []
        for platform, info in platforms.items():
            gateways.append(map_gateway(info, platform))
        return gateways
