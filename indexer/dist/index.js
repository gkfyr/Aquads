import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { prisma } from "./db.js";
import { router } from "./routes.js";
import { startIndexer } from "./sui.js";
async function main() {
    // Load env from root .env (one level up) or local .env
    const rootEnv = path.resolve(process.cwd(), "..", ".env");
    const localEnv = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(rootEnv))
        dotenv.config({ path: rootEnv });
    else if (fs.existsSync(localEnv))
        dotenv.config({ path: localEnv });
    else
        dotenv.config();
    const app = express();
    const port = Number(process.env.PORT || 8787);
    const origin = process.env.CORS_ORIGIN || "*";
    app.use(cors({ origin, credentials: true }));
    const uploadsDir = path.join(process.cwd(), "indexer", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    app.use("/uploads", express.static(uploadsDir));
    app.use(router);
    app.get("/health", (_req, res) => res.json({ ok: true }));
    const host = process.env.HOST || '127.0.0.1';
    app.listen(port, host, () => {
        console.log(`[indexer] Listening on http://${host}:${port}`);
    });
    // Fire-and-forget indexer loop
    startIndexer(prisma);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
