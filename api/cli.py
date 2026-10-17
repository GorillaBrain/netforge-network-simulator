from http.server import BaseHTTPRequestHandler
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from netforge.topology import Topology
from netforge.cli import DeviceCLI
from netforge.engine import SimulationEngine


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            req = json.loads(post_data.decode("utf-8"))
            topo_data = req.get("topology")
            device_id = req.get("device_id")
            command = req.get("command", "")
            mode = req.get("mode", "PRIV_EXEC")
            current_iface = req.get("current_interface")

            if not topo_data or not device_id:
                raise ValueError("Missing 'topology' or 'device_id' in request body")

            topo = Topology.from_dict(topo_data)
            engine = SimulationEngine(topo)
            cli = DeviceCLI(topo, device_id)
            cli.mode = mode
            cli.current_interface = current_iface

            result = cli.execute(command, engine=engine)
            result["topology"] = topo.to_dict()
            result["success"] = True

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            err_res = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(err_res).encode("utf-8"))
