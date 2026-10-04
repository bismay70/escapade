"""Optional remote MCP; no missing local scripts or subprocess dependencies."""
import os


async def tavily_mcp_search(query: str):
    from langchain_mcp_adapters.client import MultiServerMCPClient

    client = MultiServerMCPClient({"tavily": {"transport": "streamable_http", "url": os.environ["TAVILY_MCP_URL"]}})
    tools = await client.get_tools()
    search = next((t for t in tools if t.name.endswith("tavily_search")), None)
    if search is None:
        raise RuntimeError("MCP server does not expose tavily_search.")
    return await search.ainvoke({"query": query, "max_results": 4})
