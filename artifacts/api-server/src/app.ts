import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import router from "./routes";
import { ogTagsMiddleware } from "./middlewares/og-tags";

const app: Express = express();

// Trust the first proxy (Railway reverse proxy)
app.set("trust proxy", 1);

// CORS: whitelist specific origins, keep development permissive, and fail closed in production.
const allowedOrigins = process.env.CORS_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

if ((!allowedOrigins || allowedOrigins.length === 0) && isProduction) {
  console.warn("[CORS] CORS_ORIGINS not set in production — rejecting cross-origin browser requests.");
}

const corsOrigin: cors.CorsOptions["origin"] = allowedOrigins && allowedOrigins.length > 0
  ? allowedOrigins
  : isProduction
    ? (origin, callback) => {
        callback(null, origin === undefined);
      }
    : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({
  limit: "10mb",
  verify: (req: any, _res, buf) => {
    if (req.originalUrl === "/api/webhooks/square") {
      req.rawBody = buf.toString("utf8");
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests, please try again later" } });
const orderLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests, please try again later" } });

app.use("/api/auth", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/customer/login", authLimiter);
app.use("/api/customer/register", authLimiter);
app.use("/api/orders", orderLimiter);
app.use("/api/bakery-orders", orderLimiter);
app.use("/api/fundraising", orderLimiter);
app.use("/api/catering", orderLimiter);
app.use("/api/store", orderLimiter);

// Serve uploaded files from database
import { db } from "@workspace/db";
import { mediaTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

app.get("/api/uploads/:filename", async (req, res) => {
  const [media] = await db
    .select()
    .from(mediaTable)
    .where(eq(mediaTable.filename, req.params.filename))
    .limit(1);

  if (!media) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.set("Content-Type", media.mimeType);
  res.set("Content-Length", String(media.sizeBytes));
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(media.data);
});

app.use("/api", router);

// Serve the built SPA static assets (JS, CSS, images, fonts, etc.)
// __dirname = api-server/src → go up 3 levels to workspace root
const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const spaDir = path.resolve(workspaceRoot, "artifacts/urban-churn/dist/public");
app.use(express.static(spaDir, { index: false }));

// SPA catch-all: serves index.html with dynamic OG tags for shareable routes
// Express 5: /*splat doesn't match "/" so we need both
const spaHandler = ogTagsMiddleware();
app.get("/", spaHandler);
app.get("/*splat", spaHandler);

// Global error handler — prevents unhandled errors from crashing the server
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err?.message || err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
  }
});

export default app;
