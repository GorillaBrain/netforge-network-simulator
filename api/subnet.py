from http.server import BaseHTTPRequestHandler
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from netforge.addressing import calculate_subnet_info, is_same_subnet


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            req = json.loads(post_data.decode("utf-8"))
            ip = req.get("ip", "192.168.1.1")
            mask = req.get("mask", "24")

            info = calculate_subnet_info(ip, mask)

            compare_ip = req.get("compare_ip")
            if compare_ip:
                info["compare_result"] = {
                    "compare_ip": compare_ip,
                    "same_subnet": is_same_subnet(ip, compare_ip, info["subnet_mask"])
                }

            info["success"] = True

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(info).encode("utf-8"))

        except Exception as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            err_res = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(err_res).encode("utf-8"))
