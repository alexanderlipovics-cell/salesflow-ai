import os
import logging
import httpx

logger = logging.getLogger(__name__)

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")
BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


async def web_search(query: str, count: int = 10) -> dict:
    """
    Search the web using Brave Search API.

    Args:
        query: Search query string
        count: Number of results (max 20)

    Returns:
        dict with search results or error
    """
    if not BRAVE_API_KEY:
        return {"success": False, "error": "Brave API key not configured"}

    try:
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
            response.raise_for_status()
            data = response.json()

            results = []
            for item in data.get("web", {}).get("results", []):
                results.append(
                    {
                        "title": item.get("title"),
                        "url": item.get("url"),
                        "description": item.get("description", ""),
                    }
                )

            return {
                "success": True,
                "query": query,
                "results": results,
                "count": len(results),
            }

    except httpx.TimeoutException:
        return {"success": False, "error": "Search timeout"}
    except Exception as e:  # noqa: BLE001
        logger.error(f"Brave search error: {e}")
        return {"success": False, "error": str(e)}

