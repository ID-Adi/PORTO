import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createPortoMcpServer, type PortoMcpContext } from "./registry.js";

const context: PortoMcpContext = {
  requestedBy: process.env.PORTO_MCP_USER_ID ?? null,
  userId: process.env.PORTO_MCP_USER_ID ?? null,
  userEmail: process.env.PORTO_MCP_USER_EMAIL ?? null,
  isAdmin: process.env.PORTO_MCP_ADMIN !== "false",
  transport: "stdio",
};

const server = createPortoMcpServer(context);
const transport = new StdioServerTransport();

await server.connect(transport);
