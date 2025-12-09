import os
import logging
import httpx

logger = logging.getLogger(__name__)

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")
BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"

# Load-time logging
logger.info("=== WEB SEARCH MODULE LOADED ===")
logger.info(f"BRAVE_API_KEY exists: {bool(BRAVE_API_KEY)}")
if BRAVE_API_KEY:
    logger.info(f"BRAVE_API_KEY first 8 chars: {BRAVE_API_KEY[:8]}...")


async def web_search(query: str, count: int = 10) -> dict:
    """
    Search the web using Brave Search API.
    """
    logger.info(f"web_search called with query: {query}")

    if not BRAVE_API_KEY:
        logger.error("BRAVE_SEARCH_API_KEY is not set!")
        return {"success": False, "error": "Brave API key not configured", "results": []}

    try:
        logger.info(f"Making Brave API request for: {query}")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                BRAVE_SEARCH_URL,
                params={
                    "q": query,
                    "count": min(count, 20),
                    "search_lang": "de",
                    "country": "DE",
                },
                headers={
                    "X-Subscription-Token": BRAVE_API_KEY,
                    "Accept": "application/json",
                },
                timeout=10.0,
            )

            logger.info(f"Brave API response status: {response.status_code}")

            if response.status_code != 200:
                logger.error(f"Brave API error: {response.status_code} - {response.text}")
                return {"success": False, "error": f"API returned {response.status_code}", "results": []}

            data = response.json()
            logger.info(f"Brave API returned {len(data.get('web', {}).get('results', []))} results")

            results = []
            for item in data.get("web", {}).get("results", [])[:count]:
                results.append(
                    {
                        "title": item.get("title"),
                        "url": item.get("url"),
                        "description": item.get("description", ""),
                    }
                )

            logger.info(f"Returning {len(results)} search results")
            return {"success": True, "query": query, "results": results, "count": len(results)}

    except httpx.TimeoutException:
        logger.error("Brave API timeout")
        return {"success": False, "error": "Search timeout", "results": []}
    except Exception as e:  # noqa: BLE001
        logger.error(f"Brave search exception: {type(e).__name__}: {e}")
        return {"success": False, "error": str(e), "results": []}

