import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import os from "node:os";

const sizes = [100, 500, 1000] as const;
const sampleCount = Math.max(2, Number(process.env.PERF_SAMPLES ?? 3));

type Summary = { samples: number[]; median: number | null; p95: number | null; supported?: false; reason?: string };
type Samples = Record<string, number[]>;

const summarize = (samples: number[]): Summary => {
  if (!samples.length) return { samples: [], median: null, p95: null, supported: false };
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    samples,
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
  };
};

async function browserClick(page: Page, ariaLabel: string) {
  return page.evaluate(async (label) => {
    const element = document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
    if (!element) throw new Error(`Missing control: ${label}`);
    const start = performance.now();
    element.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return performance.now() - start;
  }, ariaLabel);
}

async function browserTextClick(page: Page, text: string) {
  return page.evaluate(async (label) => {
    const element = [...document.querySelectorAll<HTMLElement>("button")].find(
      (button) => button.textContent?.trim() === label,
    );
    if (!element) throw new Error(`Missing button: ${label}`);
    const start = performance.now();
    element.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return performance.now() - start;
  }, text);
}

async function selectAntOption(page: Page, label: string, option: string) {
  const start = await page.evaluate(() => performance.now());
  await page.getByRole("combobox", { name: label }).click();
  await page.getByText(option, { exact: true }).last().click();
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  const end = await page.evaluate(() => performance.now());
  return end - start;
}

test.describe("reproducible Chromium graph profiling", () => {
  test.setTimeout(10 * 60_000);

  test("profiles deterministic 100/500/1000 node graphs and writes JSON", async ({
    browser,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== "chromium" || testInfo.project.name !== "chromium", "Dedicated Chromium profile only");
    const browserVersion = browser.version();
    const results: Record<string, unknown> = {};

    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.addInitScript(() => {
        const state = { longTasks: [] as number[], frames: [] as number[], lastFrame: 0, longTaskSupported: false };
        Object.assign(window, { __BRNCHLY_BROWSER_METRICS__: state });
        try {
          new PerformanceObserver((list) =>
            state.longTasks.push(...list.getEntries().map((entry) => entry.duration)),
          ).observe({
            type: "longtask",
            buffered: true,
          });
          state.longTaskSupported = true;
        } catch {
          // The report distinguishes an unavailable observer from a supported observer with zero long tasks.
        }
        const frame = (now: number) => {
          if (state.lastFrame) state.frames.push(now - state.lastFrame);
          state.lastFrame = now;
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });

      const samples: Samples = {
        initialRender: [],
        svgEdgeRendering: [],
        fit: [],
        pan: [],
        zoom: [],
        dependencyHighlight: [],
        laneHighlight: [],
        playback: [],
      };
      let counts = { nodes: 0, edges: 0 };

      for (let sample = 0; sample < sampleCount; sample += 1) {
        await page.goto(`/?perf=${size}`, { waitUntil: "domcontentloaded" });
        await expect(page.locator("html[data-perf-ready=true]")).toBeAttached();
        const readiness = await page.evaluate(
          () => performance.getEntriesByName("brnchly-perf-ready").at(-1)?.startTime ?? 0,
        );
        samples.initialRender.push(readiness);

        counts = await page.getByTestId("performance-harness").evaluate((element) => ({
          nodes: Number(element.getAttribute("data-node-count")),
          edges: Number(element.getAttribute("data-edge-count")),
        }));
        await expect(page.locator(".universal-node")).toHaveCount(size);

        await browserTextClick(page, "Clear SVG edges");
        await expect(page.locator("[data-edge-id]")).toHaveCount(0);
        samples.svgEdgeRendering.push(await browserTextClick(page, "Render SVG edges"));
        await expect(page.locator("[data-edge-id]")).toHaveCount(counts.edges);

        samples.fit.push(await browserClick(page, "Fit to view"));
        samples.zoom.push(await browserClick(page, "Zoom in"));
        samples.pan.push(
          await page.locator(".graph-viewport").evaluate(async (viewport) => {
            const start = performance.now();
            const init = { bubbles: true, pointerId: 1, pointerType: "mouse", clientX: 600, clientY: 400 };
            viewport.dispatchEvent(new PointerEvent("pointerdown", init));
            viewport.dispatchEvent(new PointerEvent("pointermove", { ...init, clientX: 650, clientY: 430 }));
            viewport.dispatchEvent(new PointerEvent("pointerup", { ...init, clientX: 650, clientY: 430 }));
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            return performance.now() - start;
          }),
        );

        samples.dependencyHighlight.push(await browserClick(page, "Performance node 0. Status: mastered"));
        await expect(page.getByRole("combobox", { name: "Dependency highlight mode" })).toBeVisible();
        await page.getByRole("button", { name: "Close node details" }).click();

        samples.laneHighlight.push(await selectAntOption(page, "Highlight lanes", "Lane 1"));
        samples.playback.push(await browserTextClick(page, "Evolution Mode"));
        await expect(page.getByRole("button", { name: "Play evolution" })).toBeVisible();
        await browserClick(page, "Play evolution");
      }

      const observed = await page.evaluate(() => {
        const metrics = (
          window as unknown as {
            __BRNCHLY_BROWSER_METRICS__: { longTasks: number[]; frames: number[]; longTaskSupported: boolean };
          }
        ).__BRNCHLY_BROWSER_METRICS__;
        const memory = performance as Performance & { memory?: { usedJSHeapSize: number } };
        return {
          longTasks: metrics.longTasks,
          longTaskSupported: metrics.longTaskSupported,
          frames: metrics.frames,
          memory: memory.memory?.usedJSHeapSize ?? null,
          userAgent: navigator.userAgent,
          reactCommits: window.__BRNCHLY_PERF__?.reactCommits ?? [],
        };
      });

      const metrics = Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, summarize(values)]));
      results[String(size)] = {
        nodeCount: counts.nodes,
        edgeCount: counts.edges,
        metrics: {
          ...metrics,
          layoutExposure: {
            samples: [],
            median: null,
            p95: null,
            supported: false,
            reason: "Layout is synchronous inside the renderer and cannot be isolated without modifying renderer core.",
          },
          longTasks: observed.longTaskSupported
            ? observed.longTasks.length
              ? summarize(observed.longTasks)
              : { samples: [], median: null, p95: null, supported: true }
            : { samples: [], median: null, p95: null, supported: false },
          frameTiming: summarize(observed.frames),
          reactRenderCommit: summarize(observed.reactCommits.map(({ actualDuration }) => actualDuration)),
          memory:
            observed.memory === null
              ? { supported: false, value: null }
              : { supported: true, usedJSHeapBytes: observed.memory },
        },
        userAgent: observed.userAgent,
      };
      await context.close();
    }

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      methodology: { samplesPerGraph: sampleCount, percentile: "nearest-rank p95", reducedMotion: true },
      environment: {
        browserName,
        browserVersion,
        headless: true,
        os: `${os.type()} ${os.release()} ${os.arch()}`,
        cpuCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        nodeVersion: process.version,
      },
      graphs: results,
    };
    const artifact = testInfo.outputPath("performance-report.json");
    await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await testInfo.attach("performance-report", { path: artifact, contentType: "application/json" });
  });
});
