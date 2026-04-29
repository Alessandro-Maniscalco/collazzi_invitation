import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("guest preview invitation renders and accepts RSVP edits", async ({ page }) => {
  await page.goto("/i/preview-couple");
  await expect(page.getByRole("button", { name: "Will attend" }).first()).toBeVisible();
  await expect(page.getByText("Bona and Alessandro Maniscalco").first()).toBeVisible();
  await expect(page.getByTestId("recipient-to-name")).toHaveText("To: Taylor & Jordan Russo");
  await expect(page.getByRole("heading", { name: "Thursday, August 27th" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Friday, August 28th" })).toBeVisible();
  await expect(page.getByLabel("Please enter your email:")).toHaveCount(0);

  await page.getByRole("button", { name: "Will attend" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Will you attend, Taylor & Jordan Russo?" }),
  ).toBeVisible();
  const dialog = page.getByRole("dialog");
  await expect(page.getByText("Bona and Alessandro Maniscalco").nth(1)).toBeVisible();
  await expect(dialog.getByText("Who will attend?")).toBeVisible();
  await expect(dialog.getByLabel("Taylor Russo")).toBeChecked();
  await expect(dialog.getByLabel("Jordan Russo")).toBeChecked();
  await dialog.getByLabel("Walking Dinner - Thursday, August 27th, 19h30").check();
  await dialog.getByLabel("The Party - Friday, August 28th, 19h30").check();
  await expect(dialog.getByLabel("Transfer needed for the party")).toBeVisible();
  await dialog.getByPlaceholder("Private message to host (optional)").fill("See you there.");
  const rsvpResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/rsvp") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Confirm" }).click();
  const attendResponse = await rsvpResponse;
  expect(attendResponse.ok()).toBe(true);
  expect(attendResponse.request().postDataJSON()).toMatchObject({
    selections: {
      guest_taylor: true,
      guest_jordan: true,
    },
    answers: {
      question_walking_dinner: true,
      question_party: true,
    },
  });

  await expect(
    page.getByRole("heading", { name: "Will you attend, Taylor & Jordan Russo?" }),
  ).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Will attend" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Will not attend" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Will you attend, Taylor & Jordan Russo?" }),
  ).toBeVisible();
  await expect(page.getByText("Before you leave, kindly select your preferences below")).toHaveCount(
    0,
  );
  await expect(page.getByText("Who will attend?")).toHaveCount(0);
  await expect(page.getByLabel("The Party - Friday, August 28th, 19h30")).toHaveCount(0);
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
      question_walking_dinner: false,
      question_party: false,
    },
  });
});

test("guest invitation without an email can save one", async ({ page }) => {
  await page.goto("/host/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Password").fill("playwright-host-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/host$/);

  const token = await page.evaluate(async () => {
    const response = await fetch("/api/host/guests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        last_name: "Noemail",
        first_name: `Guest ${Date.now()}`,
        email: "",
        invited_by_ale: true,
        invited_by_bona: false,
        invited_by_mum: false,
        will_invite_to_walking_dinner: false,
        sent_whatsapp_save_the_date: false,
        sent_instagram_save_the_date: false,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { guest: { token: string } };
    return payload.guest.token;
  });

  await page.goto(`/i/${token}`);
  await expect(page.getByLabel("Please enter your email:")).toBeVisible();

  const email = `noemail-${Date.now()}@example.com`;
  await page.getByLabel("Please enter your email:").fill(email);
  const emailResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/guest/email") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save email" }).click();
  const emailResponse = await emailResponsePromise;
  expect(emailResponse.ok()).toBe(true);
  expect(emailResponse.request().postDataJSON()).toMatchObject({
    token,
    email,
  });
  await expect(page.getByText("Email saved.")).toBeVisible();
  await expect(page.getByLabel("Please enter your email:")).toHaveCount(0);
});

test("attending RSVP without a saved email requires and submits one", async ({ page }) => {
  await page.goto("/host/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Password").fill("playwright-host-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/host$/);

  const token = await page.evaluate(async () => {
    const response = await fetch("/api/host/guests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        last_name: "Requiredemail",
        first_name: `Guest ${Date.now()}`,
        email: "",
        invited_by_ale: true,
        invited_by_bona: false,
        invited_by_mum: false,
        will_invite_to_walking_dinner: false,
        sent_whatsapp_save_the_date: false,
        sent_instagram_save_the_date: false,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { guest: { token: string } };
    return payload.guest.token;
  });

  await page.goto(`/i/${token}`);
  await page.getByRole("button", { name: "Will attend" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Please enter your email:")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog.getByText("Please enter your email.")).toBeVisible();

  const email = `required-email-${Date.now()}@example.com`;
  await dialog.getByLabel("Please enter your email:").fill(email);
  const rsvpResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/rsvp") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Confirm" }).click();
  const rsvpResponse = await rsvpResponsePromise;
  expect(rsvpResponse.ok()).toBe(true);
  expect(rsvpResponse.request().postDataJSON()).toMatchObject({
    token,
    email,
  });
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText("Email saved.")).toBeVisible();
});

test("host dashboard login works in mock mode", async ({ page }) => {
  await page.goto("/host/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await page.getByLabel("Password").fill("playwright-host-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/host$/);
  await expect(page.getByText("Host Dashboard", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Taylor & Jordan Russo", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Invitation source")).toBeVisible();
  await expect(page.getByLabel("Invitation source")).toContainText("friends");
  await expect(page.getByRole("button", { name: "Send source invitations" })).toBeDisabled();
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
