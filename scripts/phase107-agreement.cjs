const { chromium } = require("playwright");
const fs = require("node:fs");
const base = "http://127.0.0.1:3106";
const results = [];
const responses = [];
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  let prompts = [];
  page.on("dialog", async (d) => d.accept(prompts.shift() ?? "Synthetic phase 10.7 evidence"));
  page.on("response", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) responses.push({ path: u.pathname, method: r.request().method(), status: r.status() }); });
  try {
    await page.goto(`${base}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(process.env.PHASE107_ADMIN_EMAIL); await page.locator('input[name="password"]').fill(process.env.PHASE107_ADMIN_PASSWORD);
    const [login] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === "/api/auth/login" && r.request().method() === "POST"), page.getByRole("button", { name: /log in/i }).click()]);
    if (login.status() !== 200) throw new Error("login unsuccessful");
    const selected = await page.evaluate(async () => {
      const [er, qr] = await Promise.all([fetch("/api/events"), fetch("/api/quotations")]);
      const e = await er.json(), q = await qr.json(); const events = Array.isArray(e.data) ? e.data : e.data?.items ?? [];
      const quotes = q.data?.items ?? []; const event = events.find((x) => quotes.some((y) => String(y.eventId?._id ?? y.eventId) === x._id && y.status === "SENT"));
      const quote = event && quotes.find((y) => String(y.eventId?._id ?? y.eventId) === event._id && y.status === "SENT");
      return event && quote ? { eventId: event._id, eventStatus: event.status, quoteId: quote._id } : null;
    });
    if (!selected) throw new Error("no sent quote fixture available");
    const { eventId, quoteId } = selected;
    await page.goto(`${base}/admin/quotations/${quoteId}`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(250);
    prompts = ["Synthetic phase 10.7 client approval"];
    const [approval] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/quotations/${quoteId}/status` && r.request().method() === "PUT"), page.getByRole("button", { name: "Record approval", exact: true }).click()]);
    results.push({ test: "quotation_approval_ui", status: approval.status() === 200 ? "PASS" : "FAIL", http: approval.status() });
    await page.goto(`${base}/admin/events/${eventId}`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(250);
    const statusSelect = page.locator('select[name="status"]').first();
    if (await statusSelect.locator('option[value="QUOTATION_APPROVED"]').count()) {
      await statusSelect.selectOption("QUOTATION_APPROVED");
      const [transition] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/events/${eventId}/status` && r.request().method() === "PUT"), page.getByRole("button", { name: "Update status" }).click()]);
      results.push({ test: "event_quotation_approved", status: transition.status() === 200 ? "PASS" : "FAIL", http: transition.status() });
    } else results.push({ test: "event_quotation_approved", status: "BLOCKED", reason: "transition option not available" });
    const response = await page.goto(`${base}/admin/events/${eventId}/agreements/new`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(250);
    const select = page.locator('select[name="quotationId"]'); const optionCount = await select.locator("option").count().catch(() => 0);
    if (optionCount < 2) throw new Error(`agreement page ${response.status()} has no approved quote option`);
    await select.selectOption({ index: 1 });
    const [created] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === "/api/agreements" && r.request().method() === "POST"), page.getByRole("button", { name: "Create agreement draft", exact: true }).click()]);
    results.push({ test: "agreement_create_ui", status: created.status() === 201 ? "PASS" : "FAIL", http: created.status() });
    await page.waitForURL(/\/admin\/agreements\/[a-f0-9]+$/); const agreementId = page.url().split("/").at(-1);
    const clauseCount = await page.locator("h2").count(); results.push({ test: "agreement_clauses_ui", status: clauseCount >= 17 ? "PASS" : "FAIL", headingCount: clauseCount });
    const pdf = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download PDF" }).click()]).then((x) => x[0]);
    const bytes = fs.readFileSync(await pdf.path()); results.push({ test: "agreement_pdf_download", status: pdf.suggestedFilename().endsWith(".pdf") && bytes.subarray(0,5).toString() === "%PDF-" ? "PASS" : "FAIL", bytes: bytes.length });
    prompts = ["Synthetic delivery evidence phase107"];
    const [sent] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/agreements/${agreementId}/status` && r.request().method() === "PUT"), page.getByRole("button", { name: "Record as sent", exact: true }).click()]);
    results.push({ test: "agreement_delivery", status: sent.status() === 200 ? "PASS" : "FAIL", http: sent.status() });
    prompts = ["Synthetic client signatory", "email", "Synthetic client evidence ref"];
    const [client] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/agreements/${agreementId}/acceptance` && r.request().method() === "POST"), page.getByRole("button", { name: "Record client acceptance", exact: true }).click()]);
    results.push({ test: "client_acceptance", status: client.status() === 201 ? "PASS" : "FAIL", http: client.status() });
    prompts = ["Synthetic provider signatory", "wet signature", "Synthetic provider evidence ref"];
    const [provider] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/agreements/${agreementId}/acceptance` && r.request().method() === "POST"), page.getByRole("button", { name: "Record provider acceptance", exact: true }).click()]);
    results.push({ test: "provider_acceptance", status: provider.status() === 201 ? "PASS" : "FAIL", http: provider.status() });
    await page.reload({ waitUntil: "domcontentloaded" });
    results.push({ test: "acceptance_persist_after_reload", status: (await page.locator("body").innerText()).includes("Synthetic client signatory") ? "PASS" : "FAIL" });
    await page.screenshot({ path: "phase10_6_artifacts/phase107-agreement-1440.png", fullPage: true });
  } catch (e) { results.push({ test: "harness", status: "INCOMPLETE", error: String(e.message).split("\n")[0] }); }
  console.log(JSON.stringify({ results, apiResponses: responses.slice(-20) })); await browser.close();
}
main().catch((e) => { console.log(JSON.stringify({ error: e.name })); process.exitCode = 1; });
