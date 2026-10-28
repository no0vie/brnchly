import { expect, type Page, test } from "@playwright/test";

const runtimeErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Warning:")) errors.push(message.text());
  });
  return errors;
};

const openEmptyEditor = async (page: Page) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByText("Editor Mode", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Universal graph editor" })).toBeVisible();
  await page.getByRole("button", { name: "New document" }).click();
  await expect(page.getByRole("heading", { name: "Untitled graph" })).toBeVisible();
};

const addTitledEntity = async (page: Page, kind: "branch" | "stage" | "lane", id: string, title: string) => {
  await page.getByRole("button", { name: `Add ${kind}` }).click();
  await page.getByRole("textbox", { name: `${kind[0].toUpperCase()}${kind.slice(1)} id` }).fill(id);
  await page.getByRole("textbox", { name: `${kind[0].toUpperCase()}${kind.slice(1)} title` }).fill(title);
  await page.getByRole("button", { name: `Create ${kind}` }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^${title} ${id}$`) })).toBeVisible();
};

const addNode = async (page: Page, id: string, title: string) => {
  await page.getByRole("button", { name: "Add node" }).click();
  await page.getByRole("textbox", { name: "Node id" }).fill(id);
  await page.getByRole("textbox", { name: "Node title" }).fill(title);
  await page.getByRole("button", { name: "Create node" }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^${title} ${id}$`) })).toBeVisible();
};

const addEdge = async (page: Page, id: string, source: string, target: string) => {
  await page.getByRole("button", { name: "Add edge" }).click();
  await page.getByRole("textbox", { name: "Edge id" }).fill(id);
  await page.getByLabel("Source").selectOption(source);
  await page.getByLabel("Target").selectOption(target);
  await page.getByLabel("Edge type", { exact: true }).selectOption("dependency");
  await page.getByRole("button", { name: "Create edge" }).click();
};

test.describe("Phase 4 universal editor", () => {
  test("creates, edits, connects, rejects a cycle, persists, and previews without mutation", async ({ page }) => {
    const errors = runtimeErrors(page);
    await openEmptyEditor(page);

    await page.getByRole("textbox", { name: "Graph title" }).fill("Phase 4 journey");
    await page.getByRole("textbox", { name: "Graph description" }).fill("Persistent editor coverage");
    await page.getByRole("button", { name: "Save metadata" }).click();
    await expect(page.getByRole("heading", { name: "Phase 4 journey" })).toBeVisible();

    await addTitledEntity(page, "branch", "branch-main", "Main branch");
    await addTitledEntity(page, "stage", "stage-one", "Stage one");
    await addTitledEntity(page, "lane", "lane-one", "Lane one");
    await addNode(page, "node-one", "Node one");
    await addNode(page, "node-two", "Node two");

    await page.getByRole("button", { name: /^Node one node-one$/ }).click();
    const inspector = page.getByRole("complementary", { name: "Inspector" });
    await inspector.getByLabel("Title").fill("Node one edited");
    await inspector.getByLabel("Description").fill("Edited through the inspector");
    await inspector.getByLabel("Status").selectOption("available");
    await inspector.getByLabel("Manual X").fill("240");
    await inspector.getByLabel("Manual Y").fill("160");
    await inspector.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("button", { name: /^Node one edited node-one$/ })).toBeVisible();

    await addEdge(page, "edge-forward", "node-one", "node-two");
    await expect(page.getByRole("button", { name: /^node-one → node-two edge-forward$/ })).toBeVisible();

    await addEdge(page, "edge-cycle", "node-two", "node-one");
    const validation = page.getByRole("region", { name: "Validation issues" });
    await expect(validation).toContainText("Command rejected");
    await expect(validation).toContainText(/cycle/i);
    await expect(page.getByRole("button", { name: /edge-cycle/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: /edge-forward/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByRole("button", { name: /^node-one → node-two edge-forward$/ })).toBeVisible();

    await expect(page.getByRole("status")).toHaveText("saved", { timeout: 5_000 });
    await page.reload();
    await page.getByText("Editor Mode", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "Phase 4 journey" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Node one edited node-one$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^node-one → node-two edge-forward$/ })).toBeVisible();

    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.getByRole("button", { name: "Node one edited. Status: available" })).toBeVisible();
    await expect(page.getByLabel("Evolution playback controls")).toBeVisible();
    await expect(page.getByRole("button", { name: /Pause evolution|Play evolution/ })).toBeVisible();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Node one edited node-one$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^node-one → node-two edge-forward$/ })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("exports the current document as JSON", async ({ page }) => {
    const errors = runtimeErrors(page);
    await openEmptyEditor(page);

    await page.getByRole("textbox", { name: "Graph title" }).fill("Exportable graph");
    await page.getByRole("button", { name: "Save metadata" }).click();
    await expect(page.getByRole("status")).toHaveText("saved", { timeout: 5_000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Exportable graph.json");
    expect(await download.createReadStream()).not.toBeNull();
    expect(errors).toEqual([]);
  });
});
