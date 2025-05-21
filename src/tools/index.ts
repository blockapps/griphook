/**
 * Tools registry module
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { weatherTools } from "./weather/index.js";
import { assetTools } from "./mercata/index.js";

/**
 * Register all tools with an MCP server
 * @param server The MCP server to register with
 */
export function registerAllTools(server: McpServer) {
  // Register all tool categories
  weatherTools.register(server);
  assetTools.register(server);

  // When adding new tool categories, register them here
}

// Export all tool modules
export { weatherTools, assetTools };
