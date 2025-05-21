/**
 * Asset TVL (Total Value Locked) tool
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getReserve } from "../../services/mercata.js";
import { handleToolError } from "../../utils/errorHandling.js";
import { BigNumber } from "bignumber.js";

// Tool definition
export const reserveTool = {
  name: "get-reserve-details-of-assets",
  description:
    "Get the current tvl, price, and reserve & escrow details of assets",
  parameters: {
    assetNames: z
      .array(z.string())
      .optional()
      .describe(
        "List of asset names to get tvl, price, and reserve & escrow details for (optional)"
      ),
  },
  handler: async ({ assetNames }: { assetNames?: string[] }) => {
    try {
      // Get the reserve address for the asset(s), or all if none specified
      const reserves = await getReserve(assetNames);

      if (!reserves || reserves.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                assetNames && assetNames.length > 0
                  ? `No reserve found for asset: ${assetNames.join(", ")}`
                  : "No reserves found.",
            },
          ],
        };
      }
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

      const reserveDetailsText = reserves
        .map((r) => {
          const escrowsText =
            r.escrows && Array.isArray(r.escrows)
              ? r.escrows
                  .map(
                    (e: any, idx: number) =>
                      `    Escrow with address #${e.address}: collateralValue=${
                        (e.collateralValue / 1e18).toFixed(2) || "N/A"
                      } (in USD), borrowAmount=${
                        (e.borrowedAmount / 1e18).toFixed(2) || "N/A"
                      } (in USD), 
                      borrowerAddress=${e.borrower || "N/A"},
                      borrowerCommonName=${e.borrowerCommonName || "N/A"},`
                  )
                  .join("\n")
              : "    No escrows";
          return [
            `Asset: ${r.name}`,
            `  TVL: ${r.tvl}`,
            `  Price: ${r.lastUpdatedOraclePrice ?? "N/A"} (in USD)`,
            `  Reserve: ${r.address ?? "N/A"}`,
            `  Escrows for reserve:\n${escrowsText}`,
          ].join("\n");
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text:
              reserves.length > 0 ? reserveDetailsText : "No reserves found.",
          },
        ],
      };
    } catch (error) {
      return handleToolError(error, "get-tvl-of-asset", { assetNames });
    }
  },
};

/**
 * Register the TVL tool with an MCP server
 * @param server The MCP server to register with
 */
export function registerReserveTool(server: McpServer) {
  server.tool(
    reserveTool.name,
    reserveTool.description,
    reserveTool.parameters,
    reserveTool.handler
  );
}
