/**
 * Git-installed pdf-lib only ships `src/` (see package.json "files"), so there is no prebuilt
 * `cjs/` entry. This script bundles the fork's TypeScript sources with esbuild and copies
 * declaration files from the registry pdf-lib@1.17.1 tarball (plus src/types/pdf-lib-fork.d.ts
 * for fork-only APIs).
 */
import * as esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pkgRoot = path.join(root, "node_modules", "pdf-lib");
const srcRoot = path.join(pkgRoot, "src");
const entry = path.join(srcRoot, "index.ts");
const outfile = path.join(pkgRoot, "pdf-lib.bundled.mjs");

function ensureTypesFromRegistry() {
  const marker = path.join(pkgRoot, "cjs", "index.d.ts");
  if (fs.existsSync(marker)) return;

  const tmp = fs.mkdtempSync(path.join(root, "node_modules", ".pdf-lib-types-"));
  const r = spawnSync(
    "npm",
    ["pack", "pdf-lib@1.17.1", "--pack-destination", tmp, "--silent"],
    { cwd: root, stdio: "pipe", shell: process.platform === "win32" },
  );
  if (r.status !== 0) {
    throw new Error("npm pack pdf-lib@1.17.1 failed (needed for .d.ts alongside git install)");
  }
  const tgz = fs.readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  if (!tgz) throw new Error("npm pack did not produce a .tgz");
  const fullTgz = path.join(tmp, tgz);
  const extractDir = path.join(tmp, "extract");
  fs.mkdirSync(extractDir, { recursive: true });
  const u = spawnSync("tar", ["-xzf", fullTgz, "-C", extractDir], { stdio: "inherit" });
  if (u.status !== 0) throw new Error("tar extract of pdf-lib tarball failed");

  const packedRoot = fs.readdirSync(extractDir)[0];
  const cjsSrc = path.join(extractDir, packedRoot, "cjs");
  const cjsDest = path.join(pkgRoot, "cjs");
  fs.mkdirSync(cjsDest, { recursive: true });

  function copyDts(fromDir, toDir) {
    for (const name of fs.readdirSync(fromDir, { withFileTypes: true })) {
      const from = path.join(fromDir, name.name);
      const to = path.join(toDir, name.name);
      if (name.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        copyDts(from, to);
      } else if (name.name.endsWith(".d.ts") || name.name.endsWith(".d.ts.map")) {
        fs.copyFileSync(from, to);
      }
    }
  }
  copyDts(cjsSrc, cjsDest);
  fs.rmSync(tmp, { recursive: true, force: true });
}

function patchPackageJson() {
  const pkgPath = path.join(pkgRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.main = "pdf-lib.bundled.mjs";
  pkg.module = "pdf-lib.bundled.mjs";
  pkg.types = "cjs/index.d.ts";
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

async function main() {
  if (!fs.existsSync(entry)) {
    console.warn("bundle-pdf-lib: skip (pdf-lib source not installed)");
    return;
  }

  ensureTypesFromRegistry();

  const resolveSrcPlugin = {
    name: "pdf-lib-src-alias",
    setup(build) {
      build.onResolve({ filter: /^src\// }, (args) => {
        const rel = args.path.slice(4);
        const candidates = [
          path.join(srcRoot, `${rel}.ts`),
          path.join(srcRoot, rel, "index.ts"),
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) return { path: p };
        }
        return undefined;
      });
    },
  };

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    outfile,
    platform: "browser",
    logLevel: "info",
    plugins: [resolveSrcPlugin],
  });

  patchPackageJson();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
