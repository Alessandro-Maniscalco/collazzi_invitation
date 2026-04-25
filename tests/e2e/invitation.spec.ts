import { expect, test } from "@playwright/test";

test("guest preview invitation renders and accepts RSVP edits", async ({ page }) => {
  await page.goto("/i/preview-couple");
  await expect(page.getByRole("button", { name: "Will attend" }).first()).toBeVisible();
  await expect(page.getByText("Bona Alessandro Maniscalco").first()).toBeVisible();

  await page.getByRole("button", { name: "Will attend" }).first().click();
  await expect(page.getByRole("heading", { name: /Can you make it/i })).toBeVisible();
  await page.getByLabel("Jordan Russo").uncheck();
  await page.getByPlaceholder("Private message to host (optional)").fill("See you there.");
  const rsvpResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/rsvp") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Confirm" }).click();
  expect((await rsvpResponse).ok()).toBe(true);

  await expect(page.getByRole("heading", { name: /Can you make it/i })).toBeHidden({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Will attend" }).first()).toBeVisible();
});

test("host dashboard login works in mock mode", async ({ page }) => {
  await page.goto("/host/login");
  await page.getByLabel("Email").fill("bona18ale20@gmail.com");
  await page.getByLabel("Password").fill("playwright-host-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/host$/);
  await expect(page.getByText("Host Dashboard", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Taylor & Jordan Russo", { exact: true }).first()).toBeVisible();
});

test("home page redirects to host login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/host\/login$/);
  await expect(page.getByRole("heading", { name: "Open the host shell" })).toBeVisible();
  await expect(page.getByText("Preview Guest")).toHaveCount(0);
});

test("host dashboard rejects unsigned cookies", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "collazzi-host",
      value: "host_bona_ale",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/host");
  await expect(page).toHaveURL(/\/host\/login$/);
});
