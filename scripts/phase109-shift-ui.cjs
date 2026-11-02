const { chromium } = require("playwright");
const base = "http://127.0.0.1:3106";
const eventId = "6ae5a7767e6b760ee141e84f";
const role = "Phase106 Synthetic Test Role 1793443577023";
const out = [];
const record = (name, response, extra = {}) => out.push({ name, http: response?.status?.(), ...extra });
(async () => {
 const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); page.setDefaultTimeout(12000); page.on("dialog", d => d.accept("Synthetic Phase10.9 test evidence"));
 try {
  await page.goto(`${base}/admin/login`); await page.locator('input[name="email"]').fill(process.env.PHASE108_ADMIN_EMAIL); await page.locator('input[name="password"]').fill(process.env.PHASE108_ADMIN_PASSWORD);
  const [login] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/login"), page.getByRole("button", { name: /log in/i }).click()]); record("admin_login", login);
  await page.goto(`${base}/admin/events/${eventId}`); await page.screenshot({ path: "phase10_6_artifacts/phase109-event-manpower-1440.png", fullPage: true });
  const forms = page.locator("form"); const manpower = forms.filter({ has: page.locator('input[name="role"]') }).last();
  await manpower.locator('input[name="role"]').fill(role); await manpower.locator('input[name="requiredQuantity"]').fill("1"); await manpower.locator('input[name="eventDate"]').fill("2027-05-01"); await manpower.locator('input[name="shiftStart"]').fill("09:00"); await manpower.locator('input[name="shiftEnd"]').fill("21:00"); await manpower.locator('input[name="standardShiftHours"]').fill("12");
  const [created] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === "/api/manpower-requirements" && r.request().method() === "POST"), manpower.getByRole("button", { name: /add pending requirement/i }).click()]); record("manpower_create", created);
  await page.waitForTimeout(300); await page.reload(); const reqCard = page.locator("article").filter({ hasText: role }).last();
  const [approved] = await Promise.all([page.waitForResponse(r => /\/api\/manpower-requirements\/[a-f0-9]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PUT"), reqCard.getByRole("button", { name: "Approve" }).click()]); record("manpower_approve", approved);
  const reqBody = await approved.json(); const reqId = reqBody.data?._id;
  await page.goto(`${base}/admin/events/${eventId}/quotations/new`); const qform = page.locator("form").last(); await qform.getByLabel("Quotation valid until").fill("2027-04-01"); const reqCheck = qform.locator(`input[name="req:${reqId}"]`); await reqCheck.check();
  const [quote] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === "/api/quotations" && r.request().method() === "POST"), qform.getByRole("button", { name: /create quotation draft/i }).click()]); const quoteBody = await quote.json(); record("manpower_quote_create", quote, { message: quoteBody.message });
  if (quote.ok()) { const q = await quote.json(); await page.waitForURL(/\/admin\/quotations\//); await page.screenshot({ path: "phase10_6_artifacts/phase109-manpower-quote-1440.png", fullPage: true }); const [sent] = await Promise.all([page.waitForResponse(r => /\/api\/quotations\/[a-f0-9]+\/status/.test(new URL(r.url()).pathname)), page.getByRole("button", { name: /record as sent/i }).click()]); record("quote_sent", sent); const [approvedQuote] = await Promise.all([page.waitForResponse(r => /\/api\/quotations\/[a-f0-9]+\/status/.test(new URL(r.url()).pathname)), page.getByRole("button", { name: /record approval/i }).click()]); record("quote_approved", approvedQuote); out.push({ name: "quote_manpower_snapshot", lineKind: q.data?.lines?.map(x => x.kind), quoteId: q.data?._id }); }
  console.log(JSON.stringify({ results: out }));
 } catch (error) { console.log(JSON.stringify({ results: out, incomplete: { name: error.name, message: String(error.message).split("\n")[0] } })); process.exitCode = 1; } finally { await browser.close(); }
})().catch(error => { console.log(JSON.stringify({ fatal: error.name })); process.exitCode = 1; });

