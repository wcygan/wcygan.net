"""Generate controlled requests; HTTP 500 is an expected observation."""

import argparse
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError
from urllib.request import urlopen


def request(base_url, path):
    try:
        with urlopen(base_url + path, timeout=3) as response:
            response.read()
            return response.status
    except HTTPError as error:
        error.read()
        return error.code


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8080")
    parser.add_argument("--seconds", type=int, default=90)
    parser.add_argument("--mode", choices=["mixed", "healthy", "failing"], default="mixed")
    args = parser.parse_args()
    if args.seconds <= 0:
        parser.error("--seconds must be positive")

    paths = {
        "mixed": ["/fast", "/fast", "/slow", "/fail"],
        "healthy": ["/fast", "/fast", "/slow", "/fast"],
        "failing": ["/fail"] * 4,
    }[args.mode]
    statuses = Counter()
    deadline = time.monotonic() + args.seconds
    with ThreadPoolExecutor(max_workers=4) as pool:
        while time.monotonic() < deadline:
            statuses.update(pool.map(lambda path: request(args.url, path), paths))
            time.sleep(0.15)
    print(f"Completed requests by status: {dict(sorted(statuses.items()))}")


if __name__ == "__main__":
    run()
