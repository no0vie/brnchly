import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CameraTransitionOptions, GraphHighlightState, GraphRendererHandle, GraphRendererProps } from "./index";

void ({} as CameraTransitionOptions);
void ({} as GraphHighlightState);
void ({} as GraphRendererHandle);
void ({} as GraphRendererProps);

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(sourceRoot, "..");

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(path) ? [path] : [];
  });

describe("react package boundary", () => {
  it("declares the release metadata, peer range, dependency, and stylesheet export", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));

    expect(manifest).toMatchObject({
      name: "@no0vie/brnchly-react",
      version: "1.0.0",
      type: "module",
      dependencies: { "@no0vie/brnchly-core": "1.0.0" },
      peerDependencies: { react: ">=18 <20", "react-dom": ">=18 <20" },
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./styles.css": "./dist/styles.css",
      },
    });
    expect(manifest.files).toContain("dist");
  });

  it("does not import AntD, icons, editor, persistence, or application source", () => {
    const forbidden = /from\s+["'][^"']*(?:antd|@ant-design\/icons|editor|persistence|(?:\.\.\/){3,}src)[^"']*["']/;
    const violations = sourceFiles(sourceRoot)
      .filter((path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
      .flatMap((path) =>
        readFileSync(path, "utf8")
          .split("\n")
          .flatMap((line, index) =>
            forbidden.test(line) ? [`${relative(sourceRoot, path)}:${index + 1}: ${line.trim()}`] : [],
          ),
      );

    expect(violations).toEqual([]);
  });

  it("exposes only the curated runtime API from the package root", async () => {
    const api = await import("./index");

    expect(Object.keys(api)).toEqual(["GraphRenderer"]);
    expect(api.GraphRenderer).toBeTruthy();
    expect(existsSync(join(sourceRoot, "styles.css"))).toBe(true);
  });
});
