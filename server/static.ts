import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { isKnownRoute } from "./known-routes";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  app.use(express.static(distPath, {
    extensions: ["html"],
    redirect: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  app.use("/{*path}", (_req, res) => {
    if (/\.\w{2,5}$/.test(_req.path)) {
      return res.status(404).end();
    }

    const dirIndex = path.resolve(distPath, _req.path.slice(1), "index.html");
    if (fs.existsSync(dirIndex)) {
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).sendFile(dirIndex);
    }

    const status = isKnownRoute(_req.path) ? 200 : 404;
    res.setHeader("Cache-Control", "no-cache");
    res.status(status).sendFile(path.resolve(distPath, "index.html"));
  });
}
