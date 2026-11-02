const { chromium } = require("playwright");
const fs = require("node:fs");
const base = "http://127.0.0.1:3106";
const results = [];
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const apiEvidence = [];
  page.on("response", (r) => { const path = new URL(r.url()).pathname; if (path.startsWith("/api/")) apiEvidence.push({ path, method: r.request().method(), status: r.status() }); });
  let promptQueue = [];
  page.on("dialog", async (dialog) => dialog.accept(promptQueue.shift() ?? "Synthetic phase 10.7 evidence"));
  try {
    await page.goto(`${base}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(process.env.PHASE107_ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(process.env.PHASE107_ADMIN_PASSWORD);
    const [login] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === "/api/auth/login" && r.request().method() === "POST"), page.getByRole("button", { name: /log in/i }).click()]);
    if (login.status() !== 200) throw new Error("admin login failed");
    const eventId = await page.evaluate(async () => { const r = await fetch("/api/events"); const j = await r.json(); const rows = Array.isArray(j.data) ? j.data : j.data?.items ?? []; return rows.find((e) => e.status === "DRAFT")?._id; });
    if (!eventId) throw new Error("no synthetic draft event available");
    async function setEventStatus(next) {
      await page.goto(`${base}/admin/events/${eventId}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      await page.locator('select[name="status"]').first().selectOption(next);
      const [r] = await Promise.all([page.waitForResponse((x) => new URL(x.url()).pathname === `/api/events/${eventId}/status` && x.request().method() === "PUT"), page.getByRole("button", { name: "Update status" }).click()]);
      results.push({ test: `event_status_${next}`, status: r.status() === 200 ? "PASS" : "FAIL", http: r.status() });
    }
    await setEventStatus("REQUIREMENTS_PENDING");
    await setEventStatus("QUOTATION_PENDING");
    await page.goto(`${base}/admin/events/${eventId}/quotations/new`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const serviceBoxes = page.locator('input[type="checkbox"][name^="service:"]');
    const count = await serviceBoxes.count();
    if (!count) throw new Error("quotation form has no active service options");
    const boxName = await serviceBoxes.first().getAttribute("name");
    await serviceBoxes.first().check();
    await page.locator(`input[name="rate:${boxName.slice(8)}"]`).fill("1000");
    const future = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel("Quotation valid until", { exact: true }).fill(future);
    await page.screenshot({ path: `phase10_6_artifacts/phase107-quotation-form-390.png`, fullPage: true });
    const [quoteCreate] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === "/api/quotations" && r.request().method() === "POST"), page.getByRole("button", { name: "Create quotation draft", exact: true }).click()]);
    results.push({ test: "quotation_create_ui", status: quoteCreate.status() === 201 ? "PASS" : "FAIL", http: quoteCreate.status() });
    await page.waitForURL(/\/admin\/quotations\/[a-f0-9]+$/);
    const firstQuoteUrl = page.url();
    const firstQuoteId = firstQuoteUrl.split("/").at(-1);
    const pdf = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download PDF" }).click()]).then((v) => v[0]);
    const pdfPath = await pdf.path();
    const pdfBytes = fs.readFileSync(pdfPath);
    results.push({ test: "quotation_pdf_download", status: pdf.suggestedFilename().endsWith(".pdf") && pdfBytes.subarray(0, 5).toString() === "%PDF-" ? "PASS" : "FAIL", bytes: pdfBytes.length });
    promptQueue = ["Synthetic delivery evidence phase107"];
    const [sent] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/quotations/${firstQuoteId}/status` && r.request().method() === "PUT"), page.getByRole("button", { name: "Record as sent", exact: true }).click()]);
    results.push({ test: "quotation_delivery_evidence", status: sent.status() === 200 ? "PASS" : "FAIL", http: sent.status() });
    await page.waitForTimeout(250);
    await page.reload({ waitUntil: "domcontentloaded" });
    promptQueue = ["Synthetic client approval reference phase107"];
    const [approved] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/quotations/${firstQuoteId}/status` && r.request().method() === "PUT"), page.getByRole("button", { name: "Record approval", exact: true }).click()]);
    results.push({ test: "quotation_approval", status: approved.status() === 200 ? "PASS" : "FAIL", http: approved.status() });
    await page.reload({ waitUntil: "domcontentloaded" });
    results.push({ test: "quotation_approval_persist", status: (await page.locator("body").innerText()).includes("APPROVED") ? "PASS" : "FAIL" });

    await page.goto(`${base}/admin/events/${eventId}/quotations/new?revise=${firstQuoteId}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(350);
    await page.getByLabel("Reason for revision", { exact: true }).fill("Synthetic phase 10.7 revision test");
    const reviseBoxes = page.locator('input[type="checkbox"][name^="service:"]');
    await reviseBoxes.first().check();
    const reviseName = await reviseBoxes.first().getAttribute("name");
    await page.locator(`input[name="rate:${reviseName.slice(8)}"]`).fill("1200");
    await page.getByLabel("Quotation valid until", { exact: true }).fill(future);
    const [revision] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/quotations/${firstQuoteId}/revise` && r.request().method() === "POST"), page.getByRole("button", { name: "Create quotation draft", exact: true }).click()]);
    results.push({ test: "quotation_revision", status: revision.status() === 201 ? "PASS" : "FAIL", http: revision.status() });
    await page.waitForURL(/\/admin\/quotations\/[a-f0-9]+$/);

    const agreementFormResponse = await page.goto(`${base}/admin/events/${eventId}/agreements/new`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(350);
    const quoteSelect = page.locator('select[name="quotationId"]');
    const quoteOptionCount = await quoteSelect.locator("option").count().catch(() => 0);
    if (quoteOptionCount < 2) {
      results.push({ test: "agreement_quote_available", status: "FAIL", pageHttp: agreementFormResponse.status(), options: quoteOptionCount });
      throw new Error("agreement form did not render an approved quotation option");
    }
    results.push({ test: "agreement_quote_available", status: "PASS", options: quoteOptionCount - 1 });
    await quoteSelect.selectOption({ index: 1 });
    const [agreement] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === "/api/agreements" && r.request().method() === "POST"), page.getByRole("button", { name: "Create agreement draft", exact: true }).click()]);
    results.push({ test: "agreement_create_ui", status: agreement.status() === 201 ? "PASS" : "FAIL", http: agreement.status() });
    await page.waitForURL(/\/admin\/agreements\/[a-f0-9]+$/);
    const agreementId = page.url().split("/").at(-1);
    const clauses = await page.locator("h2").count();
    results.push({ test: "agreement_clauses", status: clauses >= 17 ? "PASS" : "FAIL", headings: clauses });
    const agreementPdf = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download PDF" }).click()]).then((v) => v[0]);
    const agreementBytes = fs.readFileSync(await agreementPdf.path());
    results.push({ test: "agreement_pdf_download", status: agreementPdf.suggestedFilename().endsWith(".pdf") && agreementBytes.subarray(0, 5).toString() === "%PDF-" ? "PASS" : "FAIL", bytes: agreementBytes.length });
    promptQueue = ["Synthetic manual delivery evidence"];
    const [agreementSent] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/agreements/${agreementId}/status` && r.request().method() === "PUT"), page.getByRole("button", { name: "Record as sent", exact: true }).click()]);
    results.push({ test: "agreement_delivery_evidence", status: agreementSent.status() === 200 ? "PASS" : "FAIL", http: agreementSent.status() });
    promptQueue = ["Synthetic client signatory", "email", "Synthetic signature reference"];
    const [clientAccept] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/agreements/${agreementId}/acceptance` && r.request().method() === "POST"), page.getByRole("button", { name: "Record client acceptance", exact: true }).click()]);
    results.push({ test: "agreement_client_acceptance", status: clientAccept.status() === 201 ? "PASS" : "FAIL", http: clientAccept.status() });
    promptQueue = ["Synthetic provider signatory", "wet signature", "Synthetic provider signature reference"];
    const [providerAccept] = await Promise.all([page.waitForResponse((r) => new URL(r.url()).pathname === `/api/agreements/${agreementId}/acceptance` && r.request().method() === "POST"), page.getByRole("button", { name: "Record provider acceptance", exact: true }).click()]);
    results.push({ test: "agreement_provider_acceptance", status: providerAccept.status() === 201 ? "PASS" : "FAIL", http: providerAccept.status() });
    await page.reload({ waitUntil: "domcontentloaded" });
    results.push({ test: "acceptances_persist", status: (await page.locator("body").innerText()).includes("Synthetic client signatory") ? "PASS" : "FAIL" });
  } catch (error) {
    results.push({ test: "harness", status: "INCOMPLETE", error: String(error.message).split("\n")[0] });
  }
  console.log(JSON.stringify({ results, apiEvidence: apiEvidence.slice(-25) }));
  await browser.close();
}
main().catch((e) => { console.log(JSON.stringify({ error: e.name })); process.exitCode = 1; });
