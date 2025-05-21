/**
 * Mercata Stake Tool
 * This tool allows users to stake their stakeable assets on the Mercata platform.
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  stake,
  getUserCommonName,
  getUserDetails,
  getReserve,
} from "../../services/mercata.js";
import { handleToolError } from "../../utils/errorHandling.js";

// Tool definition
export const stakeTool = {
  name: "stake-asset-for-user",
  description:
    "Stake an asset of the user on a reserve on the mercata blockchain.",
  parameters: {
    assetName: z.string().describe("Asset Name"),
    quantity: z.number().describe("Quantity to stake"),
  },
  handler: async ({
    assetName,
    quantity,
  }: {
    assetName: string;
    quantity: number;
  }) => {
    try {
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
      // Find the asset inside the user details
      const asset = userDetails.assets.find(
        (asset: any) => asset.name === assetName
      );
      if (!asset) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No asset found for name "${assetName}" for user "${username}"`,
            },
          ],
        };
      }

      // Find the user's escrow address for the asset using asset root address
      const assetRootAddress = asset.root;
      let reserveAddress = userDetails.reserves.find(
        (reserve: any) => reserve.assetRootAddress === assetRootAddress
      )?.address;
      if (!reserveAddress) {
        // get the reserve address from the asset
        const reserveDetails = await getReserve(assetName);
        if (!reserveDetails) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No reserve found for asset: ${assetName}`,
              },
            ],
          };
        }
        reserveAddress = reserveDetails[0]?.address;
      }

      let escrowAddress = userDetails.reserves.find(
        (reserve: any) => reserve.address === reserveAddress
      )?.escrows[0]?.address;
      if (!escrowAddress) {
        escrowAddress = "0000000000000000000000000000000000000000";
      }

      // stake the asset
      const stakeResult = await stake(
        reserveAddress,
        escrowAddress,
        quantity * 1e18,
        username,
        assetRootAddress
      );
      if (!stakeResult) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to stake ${quantity} ${assetName} on reserve: ${reserveAddress} with escrow: ${escrowAddress}`,
            },
          ],
        };
      }
      // Prepare the response
      const stakeText = `Successfully staked ${quantity} ${assetName} on reserve: ${reserveAddress} with escrow: ${escrowAddress}`;
      return {
        content: [
          {
            type: "text" as const,
            text: stakeText,
          },
        ],
      };
    } catch (error) {
      // Handle errors
      const errorMessage = handleToolError(error, "stake-asset-for-user", {
        assetName,
        quantity,
      });
      console.error(
        `Error in stake-asset-for-user tool: ${errorMessage}`,
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
 * Register the Mercata Stake Tool
 * @param server - The McpServer instance to register the tool with
 */
export function registerStakeTool(server: McpServer) {
  server.tool(
    stakeTool.name,
    stakeTool.description,
    stakeTool.parameters,
    stakeTool.handler
  );
}
