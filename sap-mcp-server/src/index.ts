import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import cors from "cors";
import express from "express";
import { HttpsProxyAgent } from "https-proxy-agent";
import { z } from "zod";

const server = new Server(
    {
        name: "sap-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

const SapLoginSchema = z.object({
    url: z.string().describe("The base URL of the SAP system"),
    username: z.string().describe("SAP username"),
    password: z.string().describe("SAP password"),
    client: z.string().optional().describe("SAP Client (e.g., 100)"),
    language: z.string().optional().describe("Login Language (e.g., EN)"),
    proxy: z.string().optional().describe("Proxy URL if required"),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "sap_login",
                description:
                    "Log in to an SAP system using basic authentication. Returns success status and session cookies if successful.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "The base URL of the SAP system",
                        },
                        username: {
                            type: "string",
                            description: "SAP username",
                        },
                        password: {
                            type: "string",
                            description: "SAP password",
                        },
                        client: {
                            type: "string",
                            description: "SAP Client (e.g., 100)",
                        },
                        language: {
                            type: "string",
                            description: "Login Language (e.g., EN)",
                        },
                        proxy: {
                            type: "string",
                            description: "Proxy URL if required",
                        },
                    },
                    required: ["url", "username", "password"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "sap_login") {
        try {
            const { url, username, password, client, language, proxy } = SapLoginSchema.parse(
                request.params.arguments
            );

            const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

            const params: Record<string, string> = {};
            if (client) params["sap-client"] = client;
            if (language) params["sap-language"] = language;

            const axiosConfig = {
                auth: {
                    username,
                    password,
                },
                params,
                httpsAgent: agent,
                validateStatus: (status: number) => status < 500,
            };

            const response = await axios.get(url, axiosConfig);

            if (response.status >= 200 && response.status < 300) {
                const cookies = response.headers["set-cookie"] || [];

                return {
                    content: [
                        {
                            type: "text",
                            text: `Login successful. Status: ${response.status
                                }.\nCookies received: ${JSON.stringify(cookies, null, 2)}`,
                        },
                    ],
                };
            } else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Login failed. Status: ${response.status
                                }. Response: ${JSON.stringify(response.data)}`,
                        },
                    ],
                    isError: true,
                };
            }
        } catch (error: any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error connecting to SAP: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
    const port = process.env.PORT;

    if (port) {
        // Run as HTTP/SSE Server (BTP mode if PORT env defined)
        const app = express();
        app.use(cors());

        let transport: SSEServerTransport;

        app.get("/sse", async (req, res) => {
            console.log("Received new SSE connection");
            transport = new SSEServerTransport("/message", res);
            await server.connect(transport);
        });

        app.post("/message", async (req, res) => {
            console.log("Received message");
            if (!transport) {
                res.sendStatus(400);
                return;
            }
            await transport.handlePostMessage(req, res);
        });

        app.listen(port, () => {
            console.log(`SAP MCP Server running on port ${port} (HTTP/SSE mode)`);
            console.log(`SSE endpoint: http://localhost:${port}/sse`);
            console.log(`Message endpoint: http://localhost:${port}/message`);
        });
    } else {
        // Run as Stdio Server (Local Development mode)
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("SAP MCP Server running on stdio");
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
