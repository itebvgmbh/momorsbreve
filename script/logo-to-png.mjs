import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "client", "src", "assets", "logo.svg");
const svg = fs.readFileSync(svgPath);

// Nur Symbol (Buch-Icon), 40x48 in SVG
const width = 40;
const height = 48;

async function run() {
  const png = await sharp(svg)
    .resize(width, height)
    .png()
    .toBuffer();

  const outPublic = path.join(root, "client", "public", "logo.png");
  const outAssets = path.join(root, "client", "src", "assets", "logo.png");
  fs.writeFileSync(outPublic, png);
  fs.writeFileSync(outAssets, png);
  console.log("Logo PNG erstellt:", outPublic, outAssets);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
