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

  test("creates and cancels visual connections while rejecting an invalid dependency", async ({ page }) => {
    const errors = runtimeErrors(page);
    await openEmptyEditor(page);
    await addTitledEntity(page, "branch", "branch-main", "Main branch");
    await addNode(page, "node-one", "Node one");
    await addNode(page, "node-two", "Node two");

    await page.getByRole("button", { name: "Start connection from Node one" }).press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Connecting from Node one" })).toBeVisible();
    await page.getByRole("button", { name: "Connect to Node two" }).press("Enter");
    await expect(page.getByRole("button", { name: /^node-one → node-two edge-/ })).toBeVisible();
    await expect(page.locator("[data-edge-id]")).toHaveCount(1);

    await page.getByRole("button", { name: "Start connection from Node two" }).press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("status").filter({ hasText: "Connecting from" })).toHaveCount(0);
    await expect(page.locator("[data-edge-id]")).toHaveCount(1);

    await page.getByRole("button", { name: "Start connection from Node two" }).press("Enter");
    await page.getByRole("button", { name: "Connect to Node one" }).press("Enter");
    await expect(page.getByRole("region", { name: "Validation issues" })).toContainText(/cycle/i);
    await expect(page.locator("[data-edge-id]")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^node-one → node-two edge-/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("moves a manual node with one undoable drag and cancels a drag with Escape", async ({ page }) => {
    const errors = runtimeErrors(page);
    await openEmptyEditor(page);
    await addTitledEntity(page, "branch", "branch-main", "Main branch");
    await addNode(page, "node-one", "Node one");
    await page.getByRole("button", { name: /^Node one node-one$/ }).click();
    const inspector = page.getByRole("complementary", { name: "Inspector" });
    await inspector.getByLabel("Manual X").fill("200");
    await inspector.getByLabel("Manual Y").fill("180");
    await inspector.getByRole("button", { name: "Save changes" }).click();
    await page.getByLabel("Layout").selectOption("manual");

    const node = page.getByRole("button", { name: /^Node one\. Status:/ });
    const box = await node.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + 40, box!.y + 30);
    await page.mouse.down();
    await page.mouse.move(box!.x + 100, box!.y + 70);
    await page.mouse.up();
    await page.getByRole("button", { name: /^Node one node-one$/ }).click();
    await expect(inspector.getByLabel("Manual X")).not.toHaveValue("200");
    const movedX = await inspector.getByLabel("Manual X").inputValue();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(inspector.getByLabel("Manual X")).toHaveValue("200");
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(inspector.getByLabel("Manual X")).toHaveValue(movedX);

    const movedBox = await node.boundingBox();
    expect(movedBox).not.toBeNull();
    await page.mouse.move(movedBox!.x + 40, movedBox!.y + 30);
    await page.mouse.down();
    await page.mouse.move(movedBox!.x + 140, movedBox!.y + 90);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.getByRole("button", { name: /^Node one node-one$/ }).click();
    await expect(inspector.getByLabel("Manual X")).toHaveValue(movedX);
    await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(errors).toEqual([]);
  });

  test("bulk deletes a multi-selection and restores every node with one undo", async ({ page }) => {
    const errors = runtimeErrors(page);
    await openEmptyEditor(page);
    await addTitledEntity(page, "branch", "branch-main", "Main branch");
    await addNode(page, "node-one", "Node one");
    await addNode(page, "node-two", "Node two");

    await page.getByRole("button", { name: /^Node one node-one$/ }).click();
    await page.getByRole("button", { name: /^Node two node-two$/ }).click({ modifiers: ["ControlOrMeta"] });
    await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bulk delete" }).click();
    await expect(page.getByRole("button", { name: /^Node (one|two) node-/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: /^Node one node-one$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Node two node-two$/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("imports valid JSON and preserves the current document after malformed input", async ({ page }) => {
    const errors = runtimeErrors(page);
    await openEmptyEditor(page);
    await page.getByRole("textbox", { name: "Graph title" }).fill("Original graph");
    await page.getByRole("button", { name: "Save metadata" }).click();
    await expect(page.getByRole("status")).toHaveText("saved", { timeout: 5_000 });

    const importedGraph = {
      schemaVersion: 2,
      id: "imported-graph",
      title: "Imported graph",
      description: "Imported safely",
      branches: [],
      stages: [],
      lanes: [],
      nodes: [],
      edges: [],
    };
    await page.getByRole("button", { name: "Import file" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importedGraph)),
    });
    await expect(page.getByRole("heading", { name: "Imported graph" })).toBeVisible();

    await page.getByRole("button", { name: "Import file" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{not-json"),
    });
    await expect(page.getByRole("alert")).toContainText(/JSON/i);
    await expect(page.getByRole("heading", { name: "Imported graph" })).toBeVisible();
    await expect(page.getByLabel("Open document").getByRole("option", { name: "Untitled graph" })).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test("keeps the current graph in memory when localStorage saving fails", async ({ page }) => {
    const errors = runtimeErrors(page);
    await openEmptyEditor(page);
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };
    });

    await page.getByRole("textbox", { name: "Graph title" }).fill("Unsaved but safe");
    await page.getByRole("button", { name: "Save metadata" }).click();
    await expect(page.getByRole("heading", { name: "Unsaved but safe" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("error", { timeout: 5_000 });
    await page.getByRole("button", { name: "New document" }).click();
    await expect(page.getByRole("heading", { name: "Unsaved but safe" })).toBeVisible();
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
