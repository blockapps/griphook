# Mercata MCP Server

MCP Server for the Mercata blockchain API, enabling Claude to interact with the Mercata marketplace, manage assets, stakes, and reserves.

## Tools

### get-reserve-details-of-assets

Get the current TVL (Total Value Locked), price, and reserve & escrow details of assets.
- Optional inputs:
  - `assetNames` (array of strings): List of asset names to get TVL, price, and reserve & escrow details for
- Returns: Detailed information about reserves including TVL, price, and escrow positions

### get-mercata-user-details

Get detailed profile information for a specific user.
- Optional inputs:
  - `user` (string): The username to look up (if omitted, uses the currently authenticated user)
- Returns: User's assets and reserves with detailed information

### purchase-asset-for-user

Purchase an asset for the user on the Mercata blockchain.
- Required inputs:
  - `asset` (string): Asset name to purchase
  - `quantity` (number): Quantity to purchase
- Returns: Purchase confirmation and transaction details

### borrow-usdst-for-user

Borrow USDST for the user from a reserve on the Mercata blockchain.
- Required inputs:
  - `reserveAddress` (string): The reserve address to borrow from
  - `escrowAddress` (string): The escrow address representing the user position on the reserve
  - `quantity` (number): Amount to borrow
- Returns: Borrow confirmation and transaction details

### stake-asset-for-user

Stake an asset of the user on a reserve on the Mercata blockchain.
- Required inputs:
  - `assetName` (string): The asset name to stake
  - `quantity` (number): Quantity to stake
- Returns: Staking confirmation and transaction details

## Weather Tools

The server also includes weather tools for retrieving weather alerts and forecasts:

### get-alerts

Get weather alerts for a specific state in the US.
- Required inputs:
  - `state` (string): Two-letter state code (e.g., CA, NY)
- Returns: List of active weather alerts for the specified state

### get-forecast

Get weather forecast for a specific location.
- Required inputs:
  - `latitude` (number): Latitude of the location
  - `longitude` (number): Longitude of the location
- Returns: Detailed weather forecast for the specified location

## Installation
Prerequisites

Node.js version 18.0.0 or higher is required

Clone the repository:

```bash
git clone https://github.com/blockapps/ba-mcp.git
cd ba-mcp
```

Install dependencies and build the project:

```bash
npm install
npm run build
```

## Usage with Claude Desktop

### Locating the Configuration File

The Claude Desktop configuration file is typically located at:

- **macOS**: `~/Library/Application Support/Claude Desktop/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude Desktop\claude_desktop_config.json`
- **Linux**: `~/.config/Claude Desktop/claude_desktop_config.json`

If the file doesn't exist yet, you'll need to create it.

### Configuring the MCP Server

Add the following to your `claude_desktop_config.json` file:


```json
{
  "mcpServers": {
    "mercata": {
      "command": "/path/to/your/node",
      "args": ["/path/to/ba-mcp/build/index.js"],
      "env": {
        "BA_USERNAME": "your-mercata-username",
        "BA_PASSWORD": "your-mercata-password"
      }
    }
  }
}
```

For example:

```json
{
  "mcpServers": {
    "mercata": {
      "command": "/Users/username/.nvm/versions/node/v21.7.1/bin/node",
      "args": ["/Users/username/Documents/projects/ba-mcp/build/index.js"],
      "env": {
        "BA_USERNAME": "youremail@example.com",
        "BA_PASSWORD": "yourpassword"
      }
    }
  }
}
```

## Environment Variables

Required environment variables:

- `BA_USERNAME`: Your Mercata platform username
- `BA_PASSWORD`: Your Mercata platform password

Optional environment variables:

- `CLIENT_ID`: Your OAuth client ID
- `CLIENT_SECRET`: Your OAuth client secret
- `OPENID_DISCOVERY_URL`: URL for OpenID discovery
- `MARKETPLACE_URL`: URL for the Mercata marketplace

## Troubleshooting

If you encounter permission errors, verify that:

- You have provided the correct credentials in your environment variables
- The user has sufficient permissions for the operations you're attempting
- The authentication token is being properly retrieved and used

## Development

To set up a development environment:

1. Clone the repository: `git clone https://github.com/blockapps/ba-mcp.git`
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run the server with proper credentials

## License

This MCP server is licensed under the ISC License. See the LICENSE file for details.