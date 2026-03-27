const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto(
    "file:///F:/pola_homepage/34.tov2026/docs/og-generator.html",
    { waitUntil: "networkidle0" },
  );
  const el = await page.$(".og");
  await el.screenshot({
    path: "F:/pola_homepage/34.tov2026/assets/site/og-image.png",
    type: "png",
  });
  await browser.close();
  console.log("OG image saved: assets/site/og-image.png");
})();
