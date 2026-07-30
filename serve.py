#!/usr/bin/env python3
"""Start a local HTTP server for the SkateMap PWA.

This extended handler provides a small server-side proxy for the
Google Places Nearby Search API so the API key can remain secret in
an environment variable `GOOGLE_API_KEY`. If the key is not set the
endpoint returns a small fallback list of well-known skate spots.
"""

import http.server
import socketserver
import os
import json
import urllib.request
import urllib.parse

PORT = 8000
DIRECTORY = os.path.abspath(os.path.dirname(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/places":
            # Serve a proxied Google Places Nearby Search response
            qs = urllib.parse.parse_qs(parsed.query)
            lat = qs.get("lat", [None])[0]
            lng = qs.get("lng", [None])[0]
            radius = qs.get("radius", [1000])[0]

            if not lat or not lng:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "missing lat/lng"}).encode())
                return

            api_key = os.environ.get("GOOGLE_API_KEY")
            if api_key:
                params = urllib.parse.urlencode({
                    "location": f"{lat},{lng}",
                    "radius": radius,
                    "keyword": "skate|skatepark|skatepark",
                    "type": "park",
                    "key": api_key,
                })
                url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?{params}"
                try:
                    with urllib.request.urlopen(url, timeout=10) as resp:
                        body = resp.read()
                        # forward JSON response
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        # Allow browser JS on localhost to access
                        self.send_header("Access-Control-Allow-Origin", "*")
                        self.end_headers()
                        self.wfile.write(body)
                        return
                except Exception as exc:
                    print("Places proxy error:", exc)

            # Fallback static spots when no API key or request fails
            fallback = {
                "results": [
                    {"name": "Downtown Bowl", "vicinity": "Central Plaza", "geometry": {"location": {"lat": 37.7765, "lng": -122.4167}}},
                    {"name": "Riverside Rail", "vicinity": "Riverside", "geometry": {"location": {"lat": 37.7694, "lng": -122.4862}}},
                    {"name": "Harbor Plaza", "vicinity": "Harbor", "geometry": {"location": {"lat": 37.7924, "lng": -122.3933}}},
                    {"name": "Southside Skate Plaza", "vicinity": "Southside", "geometry": {"location": {"lat": 37.7587, "lng": -122.4148}}},
                ],
                "status": "OK",
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(fallback).encode())
            return

        return super().do_GET()


if __name__ == "__main__":
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving SkateMap at http://127.0.0.1:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
