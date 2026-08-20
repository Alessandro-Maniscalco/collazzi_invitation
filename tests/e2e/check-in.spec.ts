import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});

test("staff can search, check in, and remove a guest on a phone", async ({ page }) => {
  await page.goto("/check-in");
  await expect(page).toHaveURL(/\/check-in\/login$/);
  await page.getByLabel("Staff PIN").fill("246810");
  await page.getByRole("button", { name: "Open check-in" }).click();
  await expect(page).toHaveURL(/\/check-in$/);

  const search = page.getByPlaceholder("First name or last name");
  await search.fill("Rus Tay");
  await page.getByRole("button", { name: "Check in Taylor Russo" }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(page.getByText("Taylor Russo is present.")).toBeVisible();

  await search.fill("Taylor Rossi");
  await expect(page.getByText("No guest found.", { exact: false })).toBeVisible();
  await search.fill("Taylor Russo");
  await page.getByRole("button", { name: "Remove check-in for Taylor Russo" }).click();
  await expect(page.getByText("Removed check-in for Taylor Russo.")).toBeVisible();
});
