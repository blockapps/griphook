/**
 * Weather forecast tool
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NWS_API_BASE, makeNWSRequest, formatForecastPeriod } from "../../services/nws.js";
import { PointsResponse, ForecastResponse } from "../../types/weather.js";
import { handleToolError } from "../../utils/errorHandling.js";

// Tool definition
export const forecastTool = {
  name: "get-forecast",
  description: "Get weather forecast for a location",
  parameters: {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe("Longitude of the location"),
  },
  handler: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    try {
      // Get grid point data
      const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

      if (!pointsData) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
            },
          ],
        };
      }

      const forecastUrl = pointsData.properties?.forecast;
      if (!forecastUrl) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Failed to get forecast URL from grid point data",
            },
          ],
        };
      }

      // Get forecast data
      const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
      if (!forecastData) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Failed to retrieve forecast data",
            },
          ],
        };
      }

      const periods = forecastData.properties?.periods || [];
      if (periods.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No forecast periods available",
            },
          ],
        };
      }

      // Format forecast periods
      const formattedForecast = periods.map(formatForecastPeriod);

      const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join(
        "\n"
      )}`;

      return {
        content: [
          {
            type: "text" as const,
            text: forecastText,
          },
        ],
      };
    } catch (error) {
      return handleToolError(error, "get-forecast", { latitude, longitude });
    }
  }
};

/**
 * Register the forecast tool with an MCP server
 * @param server The MCP server to register with
 */
export function registerForecastTool(server: McpServer) {
  server.tool(
    forecastTool.name,
    forecastTool.description,
    forecastTool.parameters,
    forecastTool.handler
  );
}