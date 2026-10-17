from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        response = {
            "service": "NetForge Python Simulation API",
            "version": "1.0.0",
            "status": "healthy",
            "runtime": "Python 3 Serverless"
        }
        self.wfile.write(json.dumps(response).encode("utf-8"))
