import sys
from mcp.server import MCPServer

mcp = MCPServer("Demo")


@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers."""
    print("Adding... Gopall...", file=sys.stderr)
    return a + b


@mcp.resource("greeting://{name}")
def greeting(name: str) -> str:
    """Greet someone by name."""
    print("Greeting... Gopall...", file=sys.stderr)
    return f"Hello, {name}!"


if __name__ == "__main__":
    mcp.run()