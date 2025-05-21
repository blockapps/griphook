/**
 * Mercata User Tool
 * This tool retrieves user details from the Mercata platform, including asset and reserve information.
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  findAsset,
  purchaseAsset,
  getUserDetails,
  getUserCommonName,
} from "../../services/mercata.js";
import { handleToolError } from "../../utils/errorHandling.js";
import { BigNumber } from "bignumber.js";

// Tool definition
export const purchaseTool = {
  name: "purchase-asset-for-user",
  description:
    "Purchase an asset for the user. The user must be the one who is logged in.",
  parameters: {
    asset: z.string().describe("Asset Name"),
    quantity: z.number().describe("Quantity to purchase"),
  },
  handler: async ({ asset, quantity }: { asset: string; quantity: number }) => {
    try {
      // Find the asset along with its sale details
      const assetDetails = await findAsset(asset);
      if (!assetDetails) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No asset found for name: ${asset}`,
            },
          ],
        };
      }
      const totalCost = quantity * assetDetails.price;

      // Get user USDST balance to check if the user has enough balance
      const username = await getUserCommonName(undefined);
      const userDetails = await getUserDetails(username);
      if (!userDetails) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No user address found. Please log in first.",
            },
          ],
        };
      }
      const usdstAsset = userDetails.assets.find(
        (asset: any) => asset.name === "USDST"
      );
      const usdstBalance = usdstAsset
        ? new BigNumber(usdstAsset.quantity).dividedBy(
            new BigNumber(10).pow(usdstAsset.decimals || 18)
          )
        : null;
      if (!usdstBalance) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No USDST balance found. Please log in first.",
            },
          ],
        };
      }
      const decimals = assetDetails.decimals;
      if (usdstBalance.lt(totalCost)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Insufficient USDST balance. You have ${usdstBalance} USDST.`,
            },
          ],
        };
      }

      const quantityInUnits = new BigNumber(quantity).multipliedBy(
        Math.pow(10, decimals)
      );

      // Purchase the asset
      const purchaseResult = await purchaseAsset(
        assetDetails.sale,
        assetDetails.tokenPaymentService.address,
        username,
        quantityInUnits.toString(),
        decimals
      );
      if (!purchaseResult) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to purchase asset: ${asset}`,
            },
          ],
        };
      }
      // Prepare the response
      const purchaseText = `Purchased ${quantity} of ${asset} for ${totalCost} USDST.`;
      return {
        content: [
          {
            type: "text" as const,
            text: purchaseText,
          },
        ],
      };
    } catch (error) {
      // Handle errors
      const errorMessage = handleToolError(error, "purchase-asset-for-user", {
        asset,
        quantity,
      });
      console.error(
        `Error in purchase-asset-for-user tool: ${errorMessage}`,
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
 * Register the purchase tool with an MCP server
 * @param server The MCP server to register with
 */
export function registerPurchaseTool(server: McpServer) {
  server.tool(
    purchaseTool.name,
    purchaseTool.description,
    purchaseTool.parameters,
    purchaseTool.handler
  );
}
