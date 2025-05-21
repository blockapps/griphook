/**
 * Weather tools module
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { alertsTool, registerAlertsTool } from "./alerts.js";
import { forecastTool, registerForecastTool } from "./forecast.js";

// Export all tools and their registration function
export const weatherTools = {
  alerts: alertsTool,
  forecast: forecastTool,
  
  /**
   * Register all weather tools with an MCP server
   * @param server The MCP server to register with
   */
  register(server: McpServer) {
    registerAlertsTool(server);
    registerForecastTool(server);
  }
};