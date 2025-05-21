/**
 * Mercata User Tool
 * This tool borrows USDST for the user from a reserve on the Mercata platform.
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { borrow } from "../../services/mercata.js";
import { handleToolError } from "../../utils/errorHandling.js";

// Tool definition
export const borrowTool = {
  name: "borrow-usdst-for-user",
  description:
    "Borrow an USDST for the user from a reserve on the mercata blockchain.",
  parameters: {
    reserveAddress: z.string().describe("Reserve Address to borrow from"),
    escrowAddress: z
      .string()
      .describe(
        "Escrow Address that represents the user position on the reserve"
      ),
    quantity: z.number().describe("Quantity to borrow"),
  },
  handler: async ({
    reserveAddress,
    escrowAddress,
    quantity,
  }: {
    reserveAddress: string;
    escrowAddress: string;
    quantity: number;
  }) => {
    try {
      // Purchase the asset
      const borrowResult = await borrow(
        reserveAddress,
        escrowAddress,
        quantity * 1e18
      );
      if (!borrowResult) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to borrow ${quantity} USDST from reserve: ${reserveAddress} with escrow: ${escrowAddress}`,
            },
          ],
        };
      }
      // Prepare the response
      const borrowText = `Successfully borrowed ${quantity} USDST from reserve: ${reserveAddress} with escrow: ${escrowAddress}`;
      return {
        content: [
          {
            type: "text" as const,
            text: borrowText,
          },
        ],
      };
    } catch (error) {
      // Handle errors
      const errorMessage = handleToolError(error, "borrow-usdst-for-user", {
        reserveAddress,
        escrowAddress,
        quantity,
      });
      console.error(
        `Error in borrow-usdst-for-user tool: ${errorMessage}`,
        error
      );
      return {
        content: [
          {
            type: "text" as const,
            text:
              typeof errorMessage === "string"
                ? errorMessage
                : JSON.stringify(errorMessage),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Register the Mercata User Tool
 * @param server - The McpServer instance to register the tool with
 */
export function registerBorrowTool(server: McpServer) {
  server.tool(
    borrowTool.name,
    borrowTool.description,
    borrowTool.parameters,
    borrowTool.handler
  );
}
