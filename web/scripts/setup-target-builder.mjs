import fs from "node:fs/promises";
import path from "node:path";
import { NUI_BUILDER_VERSION } from './nui-builder-version.mjs';


const targetArg = process.argv[2];

if (!targetArg) {
  console.error("Missing target path argument.");
  process.exit(1);
}

const targetDir = path.resolve(targetArg);
const nuiRoot = path.resolve(import.meta.dirname, "..");

const templatePath = path.join(nuiRoot, "scripts", "builder-template.mjs");
const builderPath = path.join(targetDir, "nui-builder.mjs");

await fs.mkdir(targetDir, { recursive: true });

let content = await fs.readFile(templatePath, "utf8");

content = content
  .replaceAll("{{NUI_PATH}}", nuiRoot)
  .replaceAll("{{TARGET_DIR}}", targetDir)
  .replaceAll("{{BUILDER_VERSION}}", NUI_BUILDER_VERSION);

await fs.writeFile(builderPath, content, "utf8");

console.log(`Created builder: ${builderPath}`);