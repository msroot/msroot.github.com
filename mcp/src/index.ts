// MCP server for msroot.me: answers questions about Yannis Kolovos from the public profile
// Transport: Streamable HTTP, stateless JSON-RPC (POST /mcp)
const PROFILE_URL = "https://msroot.me/index.md";
const PROTOCOL_VERSION = "2025-06-18";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
};

type Sections = Record<string, string>;

// Split index.md into sections by "## " headings; the text before the first heading is "Summary"
async function loadProfile(): Promise<Sections> {
  const res = await fetch(PROFILE_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) throw new Error(`Could not load profile (${res.status})`);
  const md = (await res.text()).replace(/^---[\s\S]*?---\s*/, "");
  const sections: Sections = {};
  let name = "Summary";
  for (const line of md.split("\n")) {
    const heading = line.match(/^## (.+)/);
    if (heading) {
      name = heading[1].trim();
      continue;
    }
    sections[name] = (sections[name] ?? "") + line + "\n";
  }
  for (const key of Object.keys(sections)) sections[key] = sections[key].trim();
  return sections;
}

const TOOLS = [
  {
    name: "get_profile",
    description: "Summary of Yannis Kolovos: current role, location, experience and highlights.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_sections",
    description: "List the sections of the profile, for example Experience, Technologies or Recommendations.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_section",
    description: "Return one section of the profile in full, by name (case-insensitive).",
    inputSchema: {
      type: "object",
      properties: { section: { type: "string", description: "Section name, for example Experience" } },
      required: ["section"],
      additionalProperties: false,
    },
  },
  {
    name: "search_profile",
    description: "Search the profile for a technology, company or topic and return every matching line with its section.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "For example Kafka, GraphQL or Advocate" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "contact",
    description: "How to contact Yannis Kolovos.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const profile = await loadProfile();
  switch (name) {
    case "get_profile":
      return profile["Summary"];
    case "list_sections":
      return Object.keys(profile).join("\n");
    case "get_section": {
      const wanted = String(args.section ?? "").toLowerCase();
      const key = Object.keys(profile).find((k) => k.toLowerCase() === wanted);
      return key ? `## ${key}\n\n${profile[key]}` : `Unknown section. Available: ${Object.keys(profile).join(", ")}`;
    }
    case "search_profile": {
      const query = String(args.query ?? "").trim().toLowerCase();
      if (!query) return "Please give a search term.";
      const hits = Object.entries(profile).flatMap(([section, text]) =>
        text
          .split("\n")
          .filter((line) => line.toLowerCase().includes(query))
          .map((line) => `[${section}] ${line.trim()}`),
      );
      return hits.length ? hits.join("\n") : `No mention of "${args.query}" in the profile.`;
    }
    case "contact":
      return profile["Contact"];
    default:
      throw rpcError(-32602, `Unknown tool: ${name}`);
  }
}

function rpcError(code: number, message: string) {
  return Object.assign(new Error(message), { code });
}

async function handle(method: string, params: any) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "msroot.me", title: "Yannis Kolovos", version: "1.0.0" },
        instructions: "Answer questions about Yannis Kolovos, a Senior Backend Engineer, using only these tools.",
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      const text = await callTool(params?.name, params?.arguments ?? {});
      return { content: [{ type: "text", text }] };
    }
    case "resources/list":
      return {
        resources: [{ uri: PROFILE_URL, name: "profile", title: "Full profile", mimeType: "text/markdown" }],
      };
    case "resources/read": {
      if (params?.uri !== PROFILE_URL) throw rpcError(-32602, `Unknown resource: ${params?.uri}`);
      const text = await (await fetch(PROFILE_URL)).text();
      return { contents: [{ uri: PROFILE_URL, mimeType: "text/markdown", text }] };
    }
    default:
      throw rpcError(-32601, `Method not found: ${method}`);
  }
}

async function answer(msg: any) {
  try {
    return { jsonrpc: "2.0", id: msg.id, result: await handle(msg.method, msg.params) };
  } catch (e: any) {
    return { jsonrpc: "2.0", id: msg.id, error: { code: e.code ?? -32603, message: e.message } };
  }
}

// Shown when a person opens the server URL in a browser
const HELP_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>msroot.me MCP server</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 0 16px; color: #0b1220; background: #f7f9fc; }
  code { font-family: ui-monospace, monospace; background: #fff; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 6px; }
  a { color: #0891b2; }
  @media (prefers-color-scheme: dark) { body { color: #e6edf6; background: #05070d; } code { background: #0b1220; border-color: #1e293b; } a { color: #00e5ff; } }
</style></head><body>
<h1>msroot.me MCP server</h1>
<p>An <a href="https://modelcontextprotocol.io">MCP</a> server that lets AI assistants answer questions about <a href="https://msroot.me">Yannis Kolovos</a>, Senior Backend Engineer.</p>
<h2>Connect</h2>
<p>Add this URL to your MCP client as a remote (Streamable HTTP) server:</p>
<p><code>https://msroot-mcp.msroot.workers.dev/mcp</code></p>
<p><b>Claude:</b> Settings → Connectors → Add custom connector, then paste the URL.</p>
<h2>Tools</h2>
<p><code>get_profile</code> <code>list_sections</code> <code>get_section</code> <code>search_profile</code> <code>contact</code></p>
<p>Then ask, for example: “What has Yannis built with GraphQL?”</p>
<p><a href="https://github.com/msroot/msroot.github.com/tree/master/mcp">Source code</a></p>
</body></html>`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const wantsStream = (request.headers.get("Accept") ?? "").includes("text/event-stream");
    if (request.method === "GET" && !wantsStream) {
      return new Response(HELP_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } });
    }
    if (pathname !== "/mcp") return new Response("Not Found", { status: 404, headers: CORS });
    // Stateless server: no server-to-client stream
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
    }

    const messages = Array.isArray(body) ? body : [body];
    // Notifications and responses (no id) need no answer
    const requests = messages.filter((m) => m && m.id !== undefined && m.method);
    if (!requests.length) return new Response(null, { status: 202, headers: CORS });

    const results = await Promise.all(requests.map(answer));
    return json(Array.isArray(body) ? results : results[0]);
  },
};
