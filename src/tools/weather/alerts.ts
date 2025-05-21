/**
 * Weather alerts tool
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NWS_API_BASE, makeNWSRequest, formatAlert } from "../../services/nws.js";
import { AlertsResponse } from "../../types/weather.js";
import { handleToolError } from "../../utils/errorHandling.js";

// Tool definition
export const alertsTool = {
  name: "get-alerts",
  description: "Get weather alerts for a state",
  parameters: {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  handler: async ({ state }: { state: string }) => {
    try {
      const stateCode = state.toUpperCase();
      const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
      const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

      if (!alertsData) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Failed to retrieve alerts data",
            },
          ],
        };
      }

      const features = alertsData.features || [];
      if (features.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No active alerts for ${stateCode}`,
            },
          ],
        };
      }

      const formattedAlerts = features.map(formatAlert);
      const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join(
        "\n"
      )}`;

      return {
        content: [
          {
            type: "text" as const,
            text: alertsText,
          },
        ],
      };
    } catch (error) {
      return handleToolError(error, "get-alerts", { state });
    }
  }
};

/**
 * Register the alerts tool with an MCP server
 * @param server The MCP server to register with
 */
export function registerAlertsTool(server: McpServer) {
  server.tool(
    alertsTool.name,
    alertsTool.description,
    alertsTool.parameters,
    alertsTool.handler
  );
}