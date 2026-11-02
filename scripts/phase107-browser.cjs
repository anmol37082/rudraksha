const { chromium } = require("playwright");

const base = "http://127.0.0.1:3106";
const browserErrors = [];
const failedRequests = [];
const results = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push(error.name));
  page.on("requestfailed", (request) => failedRequests.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText ?? "failed" }));
  const responseCodes = [];
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith("/api/")) responseCodes.push({ path, status: response.status() });
  });

  try {
    await page.goto(`${base}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(process.env.PHASE107_ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(process.env.PHASE107_ADMIN_PASSWORD);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((r) => new URL(r.url()).pathname === "/api/auth/login" && r.request().method() === "POST"),
      page.getByRole("button", { name: /log in/i }).click(),
    ]);
    await page.waitForTimeout(250);
    const me = await page.evaluate(async () => {
      const r = await fetch("/api/auth/me");
      const j = await r.json();
      return { status: r.status, role: j.data?.user?.role ?? j.data?.role };
    });
    if (loginResponse.status() !== 200 || me.status !== 200 || me.role !== "ADMIN") throw new Error("Synthetic admin session check failed");
    results.push({ test: "admin_login", status: "PASS", http: loginResponse.status() });

    const eventsResult = await page.evaluate(async () => {
      const r = await fetch("/api/events");
      const j = await r.json();
      const rows = Array.isArray(j.data) ? j.data : j.data?.items ?? j.events ?? [];
      return { status: r.status, items: rows.map((e) => ({ id: e._id, status: e.status })) };
    });
    if (eventsResult.status !== 200) throw new Error("Admin events listing failed");
    results.push({ test: "event_list", status: "PASS", count: eventsResult.items.length, statuses: eventsResult.items.map((e) => e.status) });

    for (const event of eventsResult.items.slice(0, 2)) {
      const route = `/admin/events/${event.id}/operations`;
      const res = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      results.push({ test: "operations_page", status: res.status() === 200 ? "PASS" : "FAIL", http: res.status() });
      if (res.status() !== 200) continue;
      await page.screenshot({ path: `phase10_6_artifacts/phase107-operations-${event.id}-1440.png`, fullPage: true });
      const taskName = `Phase107 task ${Date.now()}`;
      const [taskResponse] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === "/api/event-tasks" && r.request().method() === "POST"),
        (async () => {
          await page.getByLabel("Task", { exact: true }).fill(taskName);
          await page.getByLabel("Description", { exact: true }).fill("Synthetic browser regression task");
          await page.getByRole("button", { name: "Add task", exact: true }).click();
        })(),
      ]);
      results.push({ test: "task_create", status: taskResponse.status() === 201 ? "PASS" : "FAIL", http: taskResponse.status() });
      await page.getByText(taskName, { exact: true }).waitFor({ state: "visible", timeout: 5000 });
      page.once("dialog", (dialog) => dialog.accept("Synthetic phase 10.7 task transition"));
      const [startResponse] = await Promise.all([
        page.waitForResponse((r) => /\/api\/event-tasks\/[a-f0-9]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PUT"),
        page.getByRole("button", { name: "Start", exact: true }).click(),
      ]);
      results.push({ test: "task_start", status: startResponse.status() === 200 ? "PASS" : "FAIL", http: startResponse.status() });
      page.once("dialog", (dialog) => dialog.accept("Synthetic phase 10.7 task completion"));
      const [completeResponse] = await Promise.all([
        page.waitForResponse((r) => /\/api\/event-tasks\/[a-f0-9]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PUT"),
        page.getByRole("button", { name: "Complete", exact: true }).click(),
      ]);
      results.push({ test: "task_complete", status: completeResponse.status() === 200 ? "PASS" : "FAIL", http: completeResponse.status() });
      await page.reload({ waitUntil: "domcontentloaded" });
      results.push({ test: "task_persist_after_reload", status: await page.getByText(taskName, { exact: true }).isVisible() ? "PASS" : "FAIL" });

      const changeDescription = `Synthetic phase 10.7 venue change ${Date.now()}`;
      const [changeResponse] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === "/api/event-changes" && r.request().method() === "POST"),
        (async () => {
          await page.getByLabel("Requested scope/date/venue/manpower change").fill(changeDescription);
          await page.getByRole("button", { name: "Record change request", exact: true }).click();
        })(),
      ]);
      results.push({ test: "change_request_create", status: changeResponse.status() === 201 ? "PASS" : "FAIL", http: changeResponse.status() });
      page.once("dialog", (dialog) => dialog.accept("Synthetic written approval reference 107"));
      const [approveResponse] = await Promise.all([
        page.waitForResponse((r) => /\/api\/event-changes\/[a-f0-9]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PUT"),
        page.getByRole("button", { name: /Approve with written reference/ }).click(),
      ]);
      results.push({ test: "change_approval", status: approveResponse.status() === 200 ? "PASS" : "FAIL", http: approveResponse.status() });
      await page.reload({ waitUntil: "domcontentloaded" });
      results.push({ test: "change_persist_after_reload", status: await page.getByText(changeDescription, { exact: true }).isVisible() ? "PASS" : "FAIL" });

      const guestsPath = `/admin/events/${event.id}/guests`;
      const guestRoute = await page.goto(`${base}${guestsPath}`, { waitUntil: "domcontentloaded" });
      if (guestRoute.status() !== 200) {
        results.push({ test: "guest_page", status: "FAIL", http: guestRoute.status() });
        continue;
      }
      await page.screenshot({ path: `phase10_6_artifacts/phase107-guests-${event.id}-1440.png`, fullPage: true });
      const guestName = `Phase107 Guest ${Date.now()}`;
      const guestPromptValues = [];
      page.on("dialog", async (dialog) => dialog.accept(guestPromptValues.shift() ?? ""));
      const [guestResponse] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === "/api/guests" && r.request().method() === "POST"),
        (async () => {
          await page.getByLabel("Guest name", { exact: true }).fill(guestName);
          await page.getByLabel("Phone", { exact: true }).fill(`+919900${String(Date.now()).slice(-6)}`);
          await page.getByLabel("Email", { exact: true }).fill(`phase107-${Date.now()}@example.invalid`);
          await page.getByRole("button", { name: "Add guest", exact: true }).click();
        })(),
      ]);
      results.push({ test: "guest_create", status: guestResponse.status() === 201 ? "PASS" : "FAIL", http: guestResponse.status() });
      await page.getByText(guestName, { exact: true }).waitFor({ state: "visible", timeout: 5000 });
      guestPromptValues.push(`${guestName} Edited`, "+919911223344", "phase107-edited@example.invalid", "Synthetic VIP", "Phase107 Group");
      const [editGuestResponse] = await Promise.all([
        page.waitForResponse((r) => /\/api\/guests\/[a-f0-9]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PUT"),
        page.getByRole("button", { name: "Edit guest", exact: true }).click(),
      ]);
      results.push({ test: "guest_edit", status: editGuestResponse.status() === 200 ? "PASS" : "FAIL", http: editGuestResponse.status() });
      await page.reload({ waitUntil: "domcontentloaded" });
      results.push({ test: "guest_persist_after_reload", status: await page.getByText(`${guestName} Edited`, { exact: true }).isVisible() ? "PASS" : "FAIL" });
      const [exportDownload] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "Export CSV", exact: true }).click(),
      ]);
      results.push({ test: "guest_csv_export_download", status: exportDownload.suggestedFilename().endsWith(".csv") ? "PASS" : "FAIL" });
      await page.getByLabel(/Import guest CSV/).setInputFiles({
        name: "phase107-guests.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(`name,contactNumber,email,category,groupName\nPhase107 CSV ${Date.now()},+919911000001,phase107-csv-${Date.now()}@example.invalid,Guest,Test Group\n`),
      });
      const [importResponse] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === "/api/guests/import" && r.request().method() === "POST"),
        page.getByRole("button", { name: "Import CSV", exact: true }).click(),
      ]);
      results.push({ test: "guest_csv_import", status: importResponse.status() === 200 ? "PASS" : "FAIL", http: importResponse.status() });
    }
  } finally {
    console.log(JSON.stringify({ results, browserErrors, failedRequests: failedRequests.slice(0, 20), apiResponses: responseCodes.slice(-30) }));
    await browser.close();
  }
}

main().catch((error) => {
  console.log(JSON.stringify({ harnessError: error.name, message: String(error.message).split("\n")[0], results }));
  process.exitCode = 1;
});
