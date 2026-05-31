import { Hono } from "hono";

import { auth } from "../auth/index.js";
import { resolveAdminUser, validateMcpToken } from "../lib/mcp-token.js";
import {
  callPortoMcpTool,
  getPortoMcpCatalog,
  readPortoMcpResource,
  type PortoMcpContext,
} from "../mcp/server.js";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

export const mcpRoute = new Hono();

mcpRoute.get("/", async (c) => {
  const context = await requireMcpContext(c.req.raw);
  if (context instanceof Response) return context;
  return c.json({
    name: "porto-mcp",
    version: "0.1.0",
    transport: "streamable-http-json",
    context: {
      userEmail: context.userEmail,
      isAdmin: context.isAdmin,
    },
    catalog: getPortoMcpCatalog(),
  });
});

mcpRoute.post("/", async (c) => {
  const context = await requireMcpContext(c.req.raw);
  if (context instanceof Response) return context;
  const body = (await c.req.json()) as JsonRpcRequest | JsonRpcRequest[];
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((request) => handleJsonRpc(context, request)),
    );
    return c.json(responses);
  }
  return c.json(await handleJsonRpc(context, body));
});

async function requireMcpContext(
  request: Request,
): Promise<PortoMcpContext | Response> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!isAllowedOrigin(origin) || !isAllowedHost(host)) {
    return new Response("Forbidden MCP origin", { status: 403 });
  }

  // Jalur utama agent eksternal: Authorization: Bearer porto_mcp_xxx.
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (await validateMcpToken(token)) {
      const admin = await resolveAdminUser();
      if (!admin) {
        return new Response("Admin user not provisioned", { status: 500 });
      }
      return {
        requestedBy: admin.id,
        userId: admin.id,
        userEmail: admin.email,
        isAdmin: true,
        transport: "http-bearer",
      };
    }
    // Bearer ada tapi tidak valid → tolak (jangan diam-diam fallback ke cookie).
    return new Response("Invalid MCP token", { status: 401 });
  }

  // Fallback: cookie session (untuk uji langsung dari dashboard admin browser).
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  const role = user ? (user as { role?: string }).role : null;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin =
    role === "admin" || (!!adminEmail && user?.email === adminEmail);

  if (!user || !isAdmin) {
    return new Response("Admin session required", { status: 401 });
  }

  return {
    requestedBy: user.id,
    userId: user.id,
    userEmail: user.email ?? null,
    isAdmin,
    transport: "http",
  };
}

async function handleJsonRpc(context: PortoMcpContext, request: JsonRpcRequest) {
  try {
    const id = request.id ?? null;
    if (request.method === "initialize") {
      return ok(id, {
        protocolVersion: "2025-06-18",
        capabilities: {
          resources: {},
          tools: {},
        },
        serverInfo: {
          name: "porto-mcp",
          version: "0.1.0",
        },
      });
    }

    if (request.method === "resources/list") {
      const catalog = getPortoMcpCatalog();
      return ok(id, {
        resources: catalog.resources.map((resource) => ({
          uri: resource.uriTemplate,
          name: resource.name,
          title: resource.title,
          description: resource.description,
          mimeType: resource.mimeType,
        })),
      });
    }

    if (request.method === "resources/read") {
      const uri = String(request.params?.uri ?? "");
      const data = await readPortoMcpResource(context, uri);
      return ok(id, {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      });
    }

    if (request.method === "tools/list") {
      const catalog = getPortoMcpCatalog();
      return ok(id, {
        tools: catalog.tools.map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          annotations: tool.annotations,
        })),
      });
    }

    if (request.method === "tools/call") {
      const name = String(request.params?.name ?? "");
      const input = request.params?.arguments ?? {};
      const data = await callPortoMcpTool(context, name, input);
      return ok(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      });
    }

    return error(id, -32601, `Unsupported method: ${request.method}`);
  } catch (err) {
    return error(
      request.id ?? null,
      -32000,
      err instanceof Error ? err.message : "MCP request failed",
    );
  }
}

function ok(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function error(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  if (origin === "http://localhost:3000" || origin === "http://localhost:3001") {
    return true;
  }
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      protocol === "https:" &&
      (hostname === "pawa.my.id" || hostname.endsWith(".pawa.my.id"))
    );
  } catch {
    return false;
  }
}

function isAllowedHost(host: string | null) {
  if (!host) return false;
  const hostname = host.split(":")[0];
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "pawa.my.id" ||
    hostname.endsWith(".pawa.my.id")
  );
}
