import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(compression());

// Kanonische Domain: mormorsbreve.com (und www-Varianten) leiten per 301 auf
// mormorsbreve.dk um, damit Google nur EINE Version der Seite indexiert.
// Gilt nur für Web-Traffic — E-Mail-Versand von @mormorsbreve.com ist davon
// unberührt. Stripe-Webhooks dürfen NICHT auf die .com zeigen (Stripe folgt
// keinen Redirects); sie laufen über die replit.app- bzw. .dk-URL.
app.use((req, res, next) => {
  const rawHost = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  const host = rawHost.split(",")[0].trim().split(":")[0].toLowerCase();
  if (host === "mormorsbreve.com" || host.endsWith(".mormorsbreve.com") || host === "www.mormorsbreve.dk") {
    return res.redirect(301, `https://mormorsbreve.dk${req.originalUrl}`);
  }
  next();
});

const jsonParser = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

// Die Upload-Routen (/api/upload, /api/upload/chunk, /api/upload/complete) empfangen
// große Base64-JSON-Bodies (WAF-Workaround + Chunked Upload, siehe routes.ts) und
// parsen den Body in ihrer eigenen Route mit höherem Limit. Hier überspringen, damit
// der globale 100-kB-Parser den Upload nicht vorzeitig mit 413 abweist.
app.use((req, res, next) => {
  if (req.path === "/api/upload" || req.path.startsWith("/api/upload/")) return next();
  return jsonParser(req, res, next);
});

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        const skipBodyPatterns = [
          /\/api\/jobs\/\d+\/preview/,
          /\/api\/jobs\/\d+\/result/,
          /\/api\/jobs\/\d+\/transcribe/,
          /\/api\/tts/,
          /\/api\/analyze/,
          /\/api\/claim-analysis/,
        ];
        const skipBody = skipBodyPatterns.some((p) => p.test(path));

        if (!skipBody) {
          const body = JSON.stringify(capturedJsonResponse);
          logLine += ` :: ${body.length > 200 ? body.slice(0, 200) + "…" : body}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

// ─── SEO-critical: robots.txt & sitemap.xml sofort verfügbar ────────────────
// Vor allen API-Routen registriert, damit Google diese Dateien auch während
// eines Cold-Starts zuverlässig abrufen kann.
const ROBOTS_TXT = [
  "User-agent: *",
  "Allow: /",
  "",
  "Sitemap: https://mormorsbreve.dk/sitemap.xml",
  "",
].join("\n");

app.get("/robots.txt", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(ROBOTS_TXT);
});

app.get("/sitemap.xml", (_req, res) => {
  const candidates = [
    path.resolve(process.cwd(), "client", "public", "sitemap.xml"),
    path.resolve(process.cwd(), "dist", "public", "sitemap.xml"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.status(200).sendFile(p);
    }
  }
  res.status(404).end();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
