from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from netforge.topology import Topology
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
            if not topo_data:
                raise ValueError("Missing 'topology' object in request body")

            topo = Topology.from_dict(topo_data)
            engine = SimulationEngine(topo)

            action = req.get("action", "ping")
            events = []

            if action == "ping":
                source_id = req.get("source_id")
                target_ip = req.get("target_ip")
                count = int(req.get("count", 1))
                events = engine.ping(source_id, target_ip, count=count)

            validation = topo.validate()

            res = {
                "success": True,
                "topology": topo.to_dict(),
                "events": [e.to_dict() for e in events],
                "validation": validation
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))

        except Exception as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            err_res = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(err_res).encode("utf-8"))
