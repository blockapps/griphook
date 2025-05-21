/**
 * Assets tools module
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { reserveTool, registerReserveTool } from "./reserve.js";
import { userTool, registerUserTool } from "./user.js";
import { purchaseTool, registerPurchaseTool } from "./purchase.js";
import { borrowTool, registerBorrowTool } from "./borrow.js";
import { stakeTool, registerStakeTool } from "./stake.js";

// Export all tools and their registration function
export const assetTools = {
  reserveTool,
  userTool,
  purchaseTool,
  borrowTool,
  stakeTool,

  /**
   * Register all asset tools with an MCP server
   * @param server The MCP server to register with
   */
  register(server: McpServer) {
    registerReserveTool(server);
    registerUserTool(server);
    registerPurchaseTool(server);
    registerBorrowTool(server);
    registerStakeTool(server);
  },
};
