import { expect, test } from "@playwright/test";

async function searchFor(page: import("@playwright/test").Page, recordId: string) {
  await page.getByLabel("検索条件").fill(recordId);
  await page.getByRole("button", { name: "検索" }).click();
}

test("Cookieへ保存すると、別タブで最後に検索したレコードがタブAへ混入する", async ({ browser }) => {
  const context = await browser.newContext();
  const tabA = await context.newPage();
  const tabB = await context.newPage();

  await tabA.goto("/");
  await searchFor(tabA, "record-a");

  await tabB.goto("/");
  await searchFor(tabB, "record-b");

  await tabA.getByRole("button", { name: "詳細を開く" }).click();
  await expect(tabA.locator("#record-id")).toHaveText("record-b");
  await expect(tabA.locator("#state-source")).toContainText("Cookie");
});

test("メモリとsessionStorageを使うと、各タブの検索状態が分離される", async ({ browser }) => {
  const context = await browser.newContext();
  const tabA = await context.newPage();
  const tabB = await context.newPage();

  await tabA.goto("/");
  await tabA.getByRole("radio", { name: /修正後を検証/ }).check();
  await searchFor(tabA, "record-a");

  await tabB.goto("/");
  await tabB.getByRole("radio", { name: /修正後を検証/ }).check();
  await searchFor(tabB, "record-b");

  await tabA.getByRole("button", { name: "詳細を開く" }).click();
  await expect(tabA.locator("#record-id")).toHaveText("record-a");
  await expect(tabA.locator("#state-source")).toContainText("メモリ");

  await tabA.reload();
  await tabA.getByRole("button", { name: "詳細を開く" }).click();
  await expect(tabA.locator("#record-id")).toHaveText("record-a");
});
