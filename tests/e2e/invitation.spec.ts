import { expect, test } from "@playwright/test";

test("guest preview invitation renders and accepts RSVP edits", async ({ page }) => {
  await page.goto("/i/preview-couple");
  await expect(page.getByRole("button", { name: "RSVP" }).first()).toBeVisible();
  await expect(page.getByText("Bona Alessandro Maniscalco").first()).toBeVisible();

  await page.getByRole("button", { name: "RSVP" }).first().click();
  await expect(page.getByRole("heading", { name: /Can you make it/i })).toBeVisible();
  await page.getByLabel("Jordan Russo").uncheck();
  await page.getByPlaceholder("Private message to host (optional)").fill("See you there.");
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText("1 of 2 attending")).toBeVisible();
});

test("host dashboard login works in mock mode", async ({ page }) => {
  await page.goto("/host/login");
  await page.getByLabel("Email").fill("alessandro@collazzi.host");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/host$/);
  await expect(page.getByText("Host Dashboard", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Taylor & Jordan Russo", { exact: true }).first()).toBeVisible();
});
