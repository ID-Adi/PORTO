import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { registerBlogMcp } from "./domains/blog.js";
import { registerCanvasMcp } from "./domains/canvas.js";
import { registerToolsImageMcp } from "./domains/tools-image.js";

export type PortoMcpContext = {
  requestedBy: string | null;
  userId: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  transport: "http" | "http-bearer" | "stdio";
};

export type PortoMcpResourceDefinition = {
  name: string;
  title: string;
  uriTemplate: string;
  description: string;
  mimeType?: string;
  read: (
    context: PortoMcpContext,
    variables: Record<string, string>,
    uri: string,
  ) => Promise<unknown>;
};

type PortoMcpInputShape = Record<string, z.ZodTypeAny>;

export type PortoMcpToolDefinition<TShape extends PortoMcpInputShape = PortoMcpInputShape> = {
  name: string;
  title: string;
  description: string;
  inputSchema: TShape;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  execute: (
    context: PortoMcpContext,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
};

export type PortoMcpRegistry = {
  resources: PortoMcpResourceDefinition[];
  tools: PortoMcpToolDefinition[];
};

export function createPortoMcpRegistry(): PortoMcpRegistry {
  const registry: PortoMcpRegistry = { resources: [], tools: [] };
  registerBlogMcp(registry);
  registerToolsImageMcp(registry);
  registerCanvasMcp(registry);
  return registry;
}

export function getPortoMcpCatalog() {
  const registry = createPortoMcpRegistry();
  return {
    resources: registry.resources.map((resource) => ({
      name: resource.name,
      title: resource.title,
      uriTemplate: resource.uriTemplate,
      description: resource.description,
      mimeType: resource.mimeType ?? "application/json",
    })),
    tools: registry.tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      annotations: tool.annotations ?? {},
    })),
  };
}

export function createPortoMcpServer(context: PortoMcpContext) {
  const registry = createPortoMcpRegistry();
  const server = new McpServer({
    name: "porto-mcp",
    version: "0.1.0",
  });

  for (const resource of registry.resources) {
    server.registerResource(
      resource.name,
      new ResourceTemplate(resource.uriTemplate, { list: undefined }),
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType ?? "application/json",
      },
      async (uri, variables) => {
        const data = await resource.read(
          context,
          normalizeVariables(variables),
          uri.toString(),
        );
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: resource.mimeType ?? "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );
  }

  for (const tool of registry.tools) {
    const registerTool = server.registerTool as unknown as (
      name: string,
      config: {
        title: string;
        description: string;
        inputSchema: unknown;
        annotations?: PortoMcpToolDefinition["annotations"];
      },
      callback: (input: Record<string, unknown>) => Promise<{
        content: Array<{ type: "text"; text: string }>;
      }>,
    ) => void;
    registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      async (input) => {
        const data = await tool.execute(context, input);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );
  }

  return server;
}

export async function readPortoMcpResource(
  context: PortoMcpContext,
  uri: string,
) {
  const registry = createPortoMcpRegistry();
  for (const resource of registry.resources) {
    const match = matchUriTemplate(resource.uriTemplate, uri);
    if (match) {
      return resource.read(context, match, uri);
    }
  }
  throw new Error(`Unknown MCP resource: ${uri}`);
}

export async function callPortoMcpTool(
  context: PortoMcpContext,
  name: string,
  input: unknown,
) {
  const registry = createPortoMcpRegistry();
  const tool = registry.tools.find((item) => item.name === name);
  if (!tool) throw new Error(`Unknown MCP tool: ${name}`);
  const parsed = z.object(tool.inputSchema).parse(input ?? {});
  return tool.execute(context, parsed);
}

function matchUriTemplate(template: string, uri: string) {
  const names: string[] = [];
  const pattern = template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    names.push(name);
    return "([^/]+)";
  });
  const match = new RegExp(`^${pattern}$`).exec(uri);
  if (!match) return null;
  return Object.fromEntries(
    names.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
  );
}

function normalizeVariables(value: Record<string, string | string[]>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, raw]) => [
      key,
      Array.isArray(raw) ? (raw[0] ?? "") : raw,
    ]),
  );
}
