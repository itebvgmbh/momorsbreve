import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "resend",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function prerenderStaticPages() {
  const ssrModule = await import("../dist/ssr/entry-server.js");
  const { render, getStaticRoutes } = ssrModule;

  const template = await readFile("dist/public/index.html", "utf-8");

  const routes = (getStaticRoutes() as string[]).sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    return depthB - depthA;
  });

  for (const url of routes) {
    const { html, helmet } = render(url) as {
      html: string;
      helmet: {
        title: { toString(): string };
        meta: { toString(): string };
        link: { toString(): string };
        script: { toString(): string };
      };
    };

    let output = template;

    output = output.replace(
      '<div id="root"></div>',
      `<div id="root">${html}</div>`,
    );

    if (helmet) {
      const titleStr = helmet.title.toString();
      if (titleStr) {
        output = output.replace(/<title>.*?<\/title>/, titleStr);
      }
      const metaStr = helmet.meta.toString();
      if (metaStr) {
        output = output.replace(
          /<meta name="description"[^>]*\/?>/,
          metaStr,
        );
      }
      const linkStr = helmet.link.toString();
      if (linkStr) {
        output = output.replace(/<link rel="canonical"[^>]*\/?>/, linkStr);
      }
      // Inject any additional scripts from Helmet (e.g. JSON-LD structured data)
      // right before </head> so they are visible to crawlers without needing JS.
      const scriptStr = helmet.script.toString();
      if (scriptStr) {
        output = output.replace("</head>", `${scriptStr}\n  </head>`);
      }
    }

    let filename: string;
    if (url === "/") {
      filename = "dist/public/index.html";
    } else {
      const candidateDir = `dist/public${url}`;
      const candidateFile = `dist/public${url}.html`;
      // If a directory already exists at this path (e.g. /blog has blog/ with sub-pages),
      // write as index.html inside it to avoid express.static directory redirect conflict
      const dirExists = await import("fs").then(f =>
        f.existsSync(candidateDir) && f.statSync(candidateDir).isDirectory()
      );
      filename = dirExists ? `${candidateDir}/index.html` : candidateFile;
    }
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, output);
    console.log(`  ✓ ${url} → ${filename}`);
  }
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building SSR bundle...");
  await viteBuild({
    ssr: { noExternal: true },
    build: {
      ssr: "src/entry-server.tsx",
      outDir: path.resolve("dist/ssr"),
      emptyOutDir: true,
    },
  });

  console.log("pre-rendering static pages...");
  await prerenderStaticPages();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
