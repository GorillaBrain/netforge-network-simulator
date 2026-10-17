from http.server import BaseHTTPRequestHandler
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from netforge.topology import Topology
from netforge.labs import LAB_DEFINITIONS, evaluate_lab


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        # Return list of all available labs and their metadata
        labs_summary = []
        for lid, info in LAB_DEFINITIONS.items():
            labs_summary.append({
                "id": lid,
                "title": info["title"],
                "difficulty": info["difficulty"],
                "description": info["description"],
                "objectives": info["objectives"],
                "tasks": info["tasks"],
                "hints": info["hints"],
                "initial_topology": info["builder"]().to_dict()
            })

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"success": True, "labs": labs_summary}).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            req = json.loads(post_data.decode("utf-8"))
            lab_id = req.get("lab_id")
            topo_data = req.get("topology")

            if not lab_id or not topo_data:
                raise ValueError("Missing 'lab_id' or 'topology' in request body")

            topo = Topology.from_dict(topo_data)
            eval_res = evaluate_lab(lab_id, topo)
            eval_res["success"] = True

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(eval_res).encode("utf-8"))

        except Exception as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            err_res = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(err_res).encode("utf-8"))
