import { expect, test } from "@playwright/test";

test("reduced motion disables graph transitions without disabling playback", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-reduced-motion", "Reduced-motion project only");
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Warning:")) runtimeErrors.push(message.text());
  });

  await page.goto("/");
  await page.getByText("Graph Mode", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Origin. Status: mastered" })).toBeVisible();
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

  const motion = await page.getByRole("button", { name: "Origin. Status: mastered" }).evaluate((node) => {
    const style = getComputedStyle(node);
    return { animationName: style.animationName, transitionDuration: style.transitionDuration };
  });
  expect(motion.animationName).toBe("none");
  expect(motion.transitionDuration).toMatch(/^(0s)(, 0s)*$/);

  await page.getByRole("button", { name: "Evolution Mode", exact: true }).click();
  await expect(page.getByLabel("Evolution playback controls")).toBeVisible();
  const progress = page.getByRole("slider");
  const before = await progress.getAttribute("aria-valuenow");
  await page.getByRole("button", { name: "Next stage" }).click();
  await expect(progress).not.toHaveAttribute("aria-valuenow", before ?? "0");
  expect(runtimeErrors).toEqual([]);
});
