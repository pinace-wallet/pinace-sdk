# Example: MCP server for Pinace

A minimal Model Context Protocol server that exposes Pinace agent actions as tools any MCP-compatible LLM client (Claude Desktop, OpenAI Operator, Cursor, etc.) can call.

## Run locally

```bash
# Set env vars (see .env.example)
export AGENT_SECRET_KEY=suiprivkey1...
export PINACE_PACKAGE_ID=0x...
export PINACE_POOL_ID=0x...

pnpm dev
```

Wire it into Claude Desktop by adding to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pinace": {
      "command": "node",
      "args": ["/absolute/path/to/pinace-sdk/examples/mcp-server/dist/server.js"],
      "env": {
        "AGENT_SECRET_KEY": "suiprivkey1...",
        "PINACE_PACKAGE_ID": "0x...",
        "PINACE_POOL_ID": "0x..."
      }
    }
  }
}
```

## Tools exposed

- `pinace.propose_and_settle` — execute an action through the user's BalancePool, bounded by the configured policies.
- `pinace.get_pool_summary` — read-only view of pool state for the LLM to reason about balance and policy headroom.

This is an **example**, not a published package. Promote to `packages/mcp-server` if external users want to install it via npm.
