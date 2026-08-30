import { rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { NUI_BUILDER_VERSION } from './nui-builder-version.mjs';

/** @typedef {{
 * nuiPath: string,
 * outDir: string,
 * target: 'ESNext' | 'ES2022' | 'es6',
 * builderVersion: string,
 }} BuildConfig */

/**
 *
 * @param {BuildConfig} config
 * @returns {Promise<void>}
 */
export async function buildNuiComponents(config) {
  if (config.builderVersion !== NUI_BUILDER_VERSION) {
    console.log(`Nui Builder is on a different version. Expected: '${NUI_BUILDER_VERSION}' and got '${config.builderVersion}' - will try to update.`);

    throw new Error('Currently not implemented. Rerun builder script for now.');
  }

  await cleanOutputDirectory(config.outDir);
  await runTsc(config);
}

async function cleanOutputDirectory(outDir) {
  const entries = await readdir(outDir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (entry.name === "nui-builder.mjs") {
      continue;
    }

    await rm(join(outDir, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

function runTsc(config) {
  const srcPath = join(config.nuiPath, 'src');
  const tsconfigPath = join(srcPath, 'tsconfig.prod.json');

  return new Promise((resolve, reject) => {
    const child = spawn('tsc',
      [
        '-p', tsconfigPath,
        '--outDir', config.outDir,
        '--target', config.target,
      ],
      {
        cwd: srcPath,
        stdio: 'inherit',
        shell: true,
      },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`TypeScript exited with code ${code}`));
      }
    });
  });
}
