# ai_scaling/simulate_load.py

import argparse
import asyncio
from typing import Any

import httpx
import structlog

logger = structlog.get_logger()

async def worker(name: int, url: str, duration: int, concurrency_delay: float) -> None:
    async with httpx.AsyncClient(timeout=5.0) as client:
        end_time = asyncio.get_event_loop().time() + duration
        while asyncio.get_event_loop().time() < end_time:
            try:
                resp = await client.get(url)
                logger.info(
                    "Request",
                    worker=name,
                    status=resp.status_code,
                    length=len(resp.text),
                )
            except Exception as e:
                logger.warning("Request failed", worker=name, error=str(e))
            await asyncio.sleep(concurrency_delay)

async def main() -> None:
    parser = argparse.ArgumentParser(description="Simulate load for autoscaling tests.")
    parser.add_argument("--url", required=True, help="Target URL (e.g. https://api.example.com/health)")
    parser.add_argument("--users", type=int, default=100, help="Number of concurrent virtual users.")
    parser.add_argument("--duration", type=int, default=300, help="Duration of test in seconds.")
    args = parser.parse_args()

    tasks: list[Any] = []
    for i in range(args.users):
        t = asyncio.create_task(worker(i, args.url, args.duration, concurrency_delay=0.5))
        tasks.append(t)
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
