# SAP MCP Server

An MCP server implementation for authenticating with SAP systems.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/dachienit/MCP.git
    cd MCP/sap-mcp-server
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```
    *Note: This will automatically build the TypeScript code (via `postinstall` script).*

## Usage

### 1. Local Testing (MCP Inspector)
To verify the tools with an interactive UI:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```
Then open the displayed local URL in your browser.

### 2. Integration with MCP Client (e.g., Claude Desktop)
Add the following to your MCP config file:
```json
{
  "mcpServers": {
    "sap-login": {
      "command": "node",
      "args": ["/path/to/MCP/sap-mcp-server/build/index.js"]
    }
  }
}
```

### 3. Deploy to SAP BTP
The server supports running as a web service (SSE) manifest for Cloud Foundry is included.
1.  Login to BTP: `cf login`
2.  Push app: `cf push`
