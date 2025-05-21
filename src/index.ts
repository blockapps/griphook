#!/usr/bin/env node
/**
 * MCP Server for weather and asset tools
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

// Create server instance
const server = new McpServer({
  name: "multi-tool-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register all tools
registerAllTools(server);

/**
 * Main application entry point
 */
async function main() {
  // Connect the server to the stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

// Execute main and handle errors
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});