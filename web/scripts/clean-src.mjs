import { readdir, rm } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(scriptDir, "../src");

const directories = [
  "debug",
  "drag-and-drop",
  "file-picker",
  "progress-status",
  "progress-bar",
  "media-viewer",
];

const excludedFiles = [
  // "keep-me.js",
];

for (const directory of directories) {
  const directoryPath = join(srcRoot, directory);
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (extname(entry.name) !== ".js") {
      continue;
    }

    if (excludedFiles.includes(entry.name)) {
      continue;
    }

    const filePath = join(directoryPath, entry.name);
    await rm(filePath);

    console.log(`Deleted ${filePath}`);
  }
}