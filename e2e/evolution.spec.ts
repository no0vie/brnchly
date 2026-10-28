import { expect, test } from "@playwright/test";

test("graph evolution smoke flow has no runtime errors", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Warning:")) runtimeErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "brnchly" })).toBeVisible();

  await page.getByText("Classic Mode", { exact: true }).click();
  await page.getByText("Graph Mode", { exact: true }).click();
  await expect(page.getByText("Three-Lane Evolution", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Stages").getByRole("button")).toHaveCount(4);
  await expect(page.getByLabel("Lanes").getByRole("button")).toHaveCount(3);

  await page.getByRole("button", { name: "Origin. Status: mastered" }).click();
  await expect(page.getByRole("combobox", { name: "Dependency highlight mode" })).toBeVisible();
  await expect(page.locator(".universal-node.is-highlighted")).toHaveCount(3);

  const zoom = page.locator(".graph-toolbar__zoom");
  const initialZoom = await zoom.textContent();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(zoom).not.toHaveText(initialZoom ?? "");
  const viewport = page.locator(".graph-viewport");
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 500, box!.y + 300);
  await page.mouse.down();
  await page.mouse.move(box!.x + 540, box!.y + 320);
  await page.mouse.up();

  await page.getByRole("button", { name: "Evolution Mode" }).click();
  await page.getByRole("button", { name: "Play evolution" }).click();
  await expect(page.getByRole("button", { name: "Pause evolution" })).toBeVisible();
  await page.getByRole("button", { name: "Pause evolution" }).click();
  await page.getByRole("button", { name: "Resume evolution" }).click();
  await page.getByRole("slider").press("ArrowRight");

  expect(runtimeErrors).toEqual([]);
});
