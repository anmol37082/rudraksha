const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  const failures = [];
  page.on("pageerror", error => failures.push({ kind: "pageerror", name: error.name }));
  page.on("requestfailed", request => failures.push({ kind: "requestfailed", url: new URL(request.url()).pathname, error: request.failure()?.errorText }));
  try {
    await page.goto("http://127.0.0.1:3106/admin/login");
    await page.locator('input[name="email"]').fill(process.env.PHASE108_ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(process.env.PHASE108_ADMIN_PASSWORD);
    const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/login"), page.getByRole("button", { name: /log in/i }).click()]);
    const body = await response.json();
    const result = { loginHttp: response.status(), loginOk: body.success === true, failures };
    if (response.ok()) {
      const reportResponse = await page.goto("http://127.0.0.1:3106/admin/reports");
      result.reportsHttp = reportResponse?.status();
      result.reportsHeading = await page.getByRole("heading", { name: /reports/i }).count() > 0;
      await page.screenshot({ path: "phase10_6_artifacts/phase109-reports-1440.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "phase10_6_artifacts/phase109-reports-390.png", fullPage: true });
    }
    console.log(JSON.stringify(result));
  } catch (error) { console.log(JSON.stringify({ errorName: error.name, message: String(error.message).split(`\n`)[0], failures })); process.exitCode = 1; }
  finally { await browser.close(); }
})().catch(error => { console.log(JSON.stringify({ errorName: error.name, message: String(error.message).split(`\n`)[0] })); process.exitCode = 1; });


