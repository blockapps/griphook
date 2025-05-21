/**
 * Mercata User Tool
 * This tool retrieves user details from the Mercata platform, including asset and reserve information.
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getUserDetails, getUserCommonName } from "../../services/mercata.js";
import { handleToolError } from "../../utils/errorHandling.js";
import { BigNumber } from "bignumber.js";

// Tool definition
export const userTool = {
  name: "get-mercata-user-details",
  description:
    "Get the user details of a mercata username, if the user is me, the username parameter is not required",
  parameters: {
    user: z.string().optional().describe("User Name"),
  },
  handler: async ({ user }: { user?: string }) => {
    try {
      // If no user is provided, use the default username from the config
      const username = await getUserCommonName(user);
      if (!username || username === '') {
        return {
          content: [
            {
              type: "text" as const,
              text: "No username provided and no default username configured. Ask for the exact username or user address",
            },
          ],
        };
      }

      // Get the reserve address for the asset(s), or all if none specified
      const userDetails = await getUserDetails(username);

      if (!userDetails) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No user found for username: ${username}`,
            },
          ],
        };
      }
      const { assets, reserves } = userDetails;

      // Prepare asset details
      const assetsText = assets
        .map(
          (asset: any) =>
            `- ${asset.name}: ${(
              asset.quantity / Math.pow(10, asset.decimals)
            ).toFixed(2)} (in asset quantity)`
        )
        .join("\n");

      for (const reserve of reserves) {
        if (reserve.escrows && Array.isArray(reserve.escrows)) {
          const totalCollateral = reserve.escrows.reduce(
            (sum: BigNumber, escrow: any) =>
              sum.plus(new BigNumber(escrow.collateralValue || 0)),
            new BigNumber(0)
          );
          // Divide by 1e18 and convert to number with 2 decimals
          reserve.tvl = Number(
            totalCollateral.dividedBy(new BigNumber(10).pow(18)).toFixed(2)
          );
          // Safely compute and format lastUpdatedOraclePrice using BigNumber
          const price = new BigNumber(reserve.lastUpdatedOraclePrice || 0);
          const decimals = new BigNumber(reserve.decimals || 0);
          // price * 10^decimals
          reserve.lastUpdatedOraclePrice = price
            .multipliedBy(new BigNumber(10).pow(decimals))
            .toFixed(2);
        } else {
          reserve.tvl = 0;
        }
      }

      // Prepare reserve details including escrow information
      const reservesText = reserves
        .map((reserve: any) => {
          // If there are escrow entries, map them to a formatted string; otherwise note that there are none.
          const escrowsText =
            reserve.escrows && Array.isArray(reserve.escrows)
              ? reserve.escrows
                  .map(
                    (e: any, idx: number) =>
                      `    Escrow with address ${e.address}: collateralValue=${(
                        e.collateralValue / 1e18
                      ).toFixed(2)} (in USD), borrowAmount=${(
                        e.borrowedAmount / 1e18
                      ).toFixed(2)} (in USD),\n      borrowerAddress=${
                        e.borrower || "N/A"
                      }, borrowerCommonName=${e.borrowerCommonName || "N/A"}`
                  )
                  .join("\n")
              : "    No escrows";

          // Combine reserve details with its associated escrows
          return [
            `- ${reserve.name}:`,
            `  Price: ${reserve.lastUpdatedOraclePrice ?? "N/A"} (in USD)`,
            `  Reserve Address: ${reserve.address ?? "N/A"}`,
            `  Escrows for reserve:\n${escrowsText}`,
          ].join("\n");
        })
        .join("\n");

      // Combine user details including assets and reserves (with escrow details)
      const userDetailsText = `User: ${username}\n\nAssets:\n${assetsText}\n\nReserves:\n${reservesText}`;

      // If you want to ensure commas are followed by a new line, you can further format it.
      const formattedUserDetails = userDetailsText.replace(/,/g, ",\n");
      return {
        content: [
          {
            type: "text" as const,
            text: formattedUserDetails,
          },
        ],
      };
    } catch (error) {
      // Handle the error using the utility function
      return handleToolError(error, "get-mercata-user-details", { user });
    }
  },
};

/**
 * Register the Mercata User Tool
 * @param server - The McpServer instance to register the tool with
 */
export function registerUserTool(server: McpServer) {
  server.tool(
    userTool.name,
    userTool.description,
    userTool.parameters,
    userTool.handler
  );
}
