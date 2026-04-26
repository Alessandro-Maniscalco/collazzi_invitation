import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("guest preview invitation renders and accepts RSVP edits", async ({ page }) => {
  await page.goto("/i/preview-couple");
  await expect(page.getByRole("button", { name: "Will attend" }).first()).toBeVisible();
  await expect(page.getByText("Bona Alessandro Maniscalco").first()).toBeVisible();

  await page.getByRole("button", { name: "Will attend" }).first().click();
  await expect(page.getByRole("heading", { name: /Can you make it/i })).toBeVisible();
  await expect(page.getByText("Guest attendance")).toHaveCount(0);
  await page.getByLabel("The Party - Friday August 28th").check();
  await page.getByPlaceholder("Private message to host (optional)").fill("See you there.");
  const rsvpResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/rsvp") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Confirm" }).click();
  const attendResponse = await rsvpResponse;
  expect(attendResponse.ok()).toBe(true);
  expect(attendResponse.request().postDataJSON()).toMatchObject({
    selections: {
      guest_taylor: true,
      guest_jordan: true,
    },
  });

  await expect(page.getByRole("heading", { name: /Can you make it/i })).toBeHidden({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Will attend" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Will not attend" }).first().click();
  await expect(page.getByRole("heading", { name: /Can you make it/i })).toBeVisible();
  await expect(page.getByText("Before you leave, kindly select your preferences below")).toHaveCount(
    0,
  );
  await expect(page.getByLabel("The Party - Friday August 28th")).toHaveCount(0);
  await page.getByPlaceholder("Private message to host (optional)").fill("Sorry to miss it.");
  const declineResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/rsvp") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Confirm" }).click();
  const declineResponse = await declineResponsePromise;
  expect(declineResponse.ok()).toBe(true);
  expect(declineResponse.request().postDataJSON()).toMatchObject({
    selections: {
      guest_taylor: false,
      guest_jordan: false,
    },
    answers: {
      question_party: false,
    },
  });
});

test("host dashboard login works in mock mode", async ({ page }) => {
  await page.goto("/host/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await page.getByLabel("Password").fill("playwright-host-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/host$/);
  await expect(page.getByText("Host Dashboard", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Taylor & Jordan Russo", { exact: true }).first()).toBeVisible();
});

test("home page redirects to host login", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
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

  await page.goto("/host", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/host\/login$/);
});
