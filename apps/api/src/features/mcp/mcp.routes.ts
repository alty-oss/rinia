import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Router, type Request } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth.middleware";
import { createMcpServer } from "./mcp.server";

/** Links in results open where the request came in, unless APP_URL says where Rinia lives. */
function appBaseUrl(req: Request) {
    return env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
}

/**
 * The MCP endpoint for AI tools such as Claude Code, over streamable HTTP. It is stateless: each request carries its
 * API token and gets a server of its own, so a revoked token stops working at the next call.
 */
export const mcpRouter = Router();

mcpRouter.use((_req, res, next) => {
    // Tells MCP clients that a refused request needs a bearer token, instead of leaving them to look for OAuth.
    res.set("WWW-Authenticate", 'Bearer realm="Rinia"');
    next();
}, requireAuth);

mcpRouter.post(
    "/",
    asyncHandler(async (req, res) => {
        const server = createMcpServer({ user: req.user!, baseUrl: appBaseUrl(req) });
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on("close", () => {
            void transport.close();
            void server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }),
);

// Without sessions there is no stream for the server to push on and nothing to end.
mcpRouter.all("/", (_req, res) => {
    res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
});
