"""A deliberately small HTTP service: three routes, three metric types."""

import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    disable_created_metrics,
    generate_latest,
)

disable_created_metrics()

REQUESTS = Counter(
    "demo_http_requests_total",
    "Completed application requests.",
    ["route", "status"],
)
IN_FLIGHT = Gauge(
    "demo_http_requests_in_flight",
    "Application requests currently being handled.",
    ["route"],
)
DURATION = Histogram(
    "demo_http_request_duration_seconds",
    "Application request duration in seconds.",
    ["route"],
    buckets=[0.025, 0.05, 0.1, 0.25, 0.5, 1],
)

# Labels describe a bounded route vocabulary, never an arbitrary URL or user ID.
ROUTES = {"/fast": (200, 0.02), "/slow": (200, 0.35), "/fail": (500, 0.1)}
for route, (status, _) in {**ROUTES, "/other": (404, 0)}.items():
    REQUESTS.labels(route=route, status=str(status))
    IN_FLIGHT.labels(route=route)
    DURATION.labels(route=route)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/metrics":
            self.respond(200, generate_latest(), CONTENT_TYPE_LATEST)
            return
        if path == "/healthz":
            self.respond(200, b"ok\n")
            return

        route = path if path in ROUTES else "/other"
        status, delay = ROUTES.get(route, (404, 0))
        started = time.perf_counter()
        IN_FLIGHT.labels(route=route).inc()
        try:
            time.sleep(delay)
            self.respond(status, f"{route}: {status}\n".encode())
        finally:
            DURATION.labels(route=route).observe(time.perf_counter() - started)
            REQUESTS.labels(route=route, status=str(status)).inc()
            IN_FLIGHT.labels(route=route).dec()

    def respond(self, status, body, content_type="text/plain; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    print("App and /metrics listening on :8080")
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
