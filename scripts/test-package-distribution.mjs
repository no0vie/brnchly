/* eslint-env node */
import { cp, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const packages = [
  { directory: "packages/core", name: "@no0vie/brnchly-core" },
  { directory: "packages/react", name: "@no0vie/brnchly-react" },
];
const dryRunOnly = process.argv.includes("--dry-run");
const npmCache = join(tmpdir(), "brnchly-package-test-npm-cache");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, npm_config_cache: npmCache },
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
  return result.stdout;
}

function packManifest(directory, dryRun, destination) {
  const args = ["pack", resolve(root, directory), "--json"];
  if (dryRun) args.push("--dry-run");
  if (destination) args.push("--pack-destination", destination);
  return JSON.parse(run("npm", args))[0];
}

function assertPackContents(pack) {
  const files = pack.files.map(({ path }) => path);
  const required = ["README.md", "LICENSE", "dist/index.js", "dist/index.d.ts"];
  if (pack.name === "@no0vie/brnchly-react") required.push("dist/styles.css");
  for (const path of required) {
    if (!files.includes(path)) throw new Error(`${pack.name} tarball is missing ${path}`);
  }
  const forbidden = /(^|\/)(src|tests?|editor|demo|antd)(\/|$)/i;
  const unexpected = files.filter((path) => forbidden.test(path));
  if (unexpected.length) throw new Error(`${pack.name} tarball contains forbidden files: ${unexpected.join(", ")}`);
}

async function assertBundles() {
  const coreJs = await readFile(join(root, "packages/core/dist/index.js"), "utf8");
  const reactJs = await readFile(join(root, "packages/react/dist/index.js"), "utf8");
  if (/\breact(?:-dom)?\b/i.test(coreJs)) throw new Error("core JavaScript contains React code or imports");
  if (/\bantd\b|ant-design/i.test(reactJs)) throw new Error("React JavaScript contains Ant Design code or imports");
  if (!/from\s*["']react(?:\/jsx-runtime)?["']/.test(reactJs)) {
    throw new Error("React JavaScript does not externalize React as an import");
  }
}

console.log("Building publishable packages...");
run("npm", ["run", "build:packages"]);
await assertBundles();

console.log("Checking npm pack --dry-run manifests...");
for (const pkg of packages) assertPackContents(packManifest(pkg.directory, true));

if (dryRunOnly) {
  console.log("Package dry-run assertions passed for 2 packages.");
  process.exit(0);
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "brnchly-consumer-"));
const artifacts = join(temporaryRoot, "artifacts");
const consumer = join(temporaryRoot, "consumer");
try {
  await mkdir(artifacts);
  await cp(join(root, "examples/react-vite-consumer"), consumer, { recursive: true });

  console.log(`Creating package tarballs in ${artifacts}...`);
  const tarballs = packages.map((pkg) => {
    const manifest = packManifest(pkg.directory, false, artifacts);
    assertPackContents(manifest);
    return join(artifacts, basename(manifest.filename));
  });

  console.log("Installing consumer dependencies and both tarballs in isolation...");
  run("npm", ["install", "--ignore-scripts", ...tarballs], consumer);

  const installedLock = JSON.parse(await readFile(join(consumer, "package-lock.json"), "utf8"));
  for (const [index, pkg] of packages.entries()) {
    const installed = installedLock.packages?.[`node_modules/${pkg.name}`];
    if (!installed?.resolved?.endsWith(basename(tarballs[index]))) {
      throw new Error(`${pkg.name} was not installed from its generated tarball`);
    }
  }

  const installedReact = JSON.parse(
    await readFile(join(consumer, "node_modules/@no0vie/brnchly-react/package.json"), "utf8"),
  );
  const installedCore = JSON.parse(
    await readFile(join(consumer, "node_modules/@no0vie/brnchly-core/package.json"), "utf8"),
  );
  if (installedReact.dependencies?.["@no0vie/brnchly-core"] !== installedCore.version) {
    throw new Error("installed React package does not resolve its declared core package version");
  }

  console.log("Running strict consumer typecheck and production build...");
  run("npm", ["run", "typecheck"], consumer);
  run("npm", ["run", "build"], consumer);
  console.log("Tarball installation and consumer validation passed.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
