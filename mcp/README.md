# msroot.me MCP server

A small [MCP](https://modelcontextprotocol.io) server that lets AI assistants answer questions about Yannis Kolovos. It reads the public profile at <https://msroot.me/index.md>, so it updates when the site does.

- **URL:** `https://msroot-mcp.msroot.workers.dev/mcp`
- **Tools:** `get_profile`, `list_sections`, `get_section`, `search_profile`, `contact`
- **Resource:** the full profile as Markdown

## Connect

- **Claude:** Settings → Connectors → Add custom connector, then paste `https://msroot-mcp.msroot.workers.dev/mcp`
- **Other MCP clients:** add the same URL as a remote (Streamable HTTP) server

Then ask, for example, "What has Yannis built with GraphQL?"

## Run locally

```bash
npx wrangler dev
```

## Deploy

Pushing a change in `mcp/` to `master` deploys it automatically with GitHub Actions (`.github/workflows/deploy-mcp.yml`). The workflow needs two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Until they exist, it skips the deploy.

To deploy by hand, run from this `mcp/` folder, not from the website folder:

```bash
npx wrangler deploy
```

Profile changes need no deploy: the server reads `index.md` live.
