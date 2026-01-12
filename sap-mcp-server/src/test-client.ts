import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["build/index.js"],
    });

    const client = new Client(
        {
            name: "example-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    console.log("Connecting to server...");
    await client.connect(transport);
    console.log("Connected!");

    console.log("Listing tools...");
    const tools = await client.request(ListToolsRequestSchema, {});
    console.log("Available tools:", JSON.stringify(tools, null, 2));

    // Example: requesting the tool (mock data since we probably don't have a real SAP URL yet)
    console.log("\nCalling sap_login tool (expecting failure or mock response)...");
    try {
        const result = await client.request(CallToolRequestSchema, {
            name: "sap_login",
            arguments: {
                url: "https://example.com/sap-mock",
                username: "testuser",
                password: "testpassword"
            }
        });
        console.log("Tool result:", JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.log("Tool call failed as expected (or strictly valid URL needed):", e.message);
    }

    await client.close();
}

main().catch(console.error);
