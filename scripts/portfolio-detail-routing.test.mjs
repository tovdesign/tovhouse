import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { once } from "node:events";
import test from "node:test";
import puppeteer from "puppeteer";

const root = new URL("../", import.meta.url);

test("each portfolio ID renders the exact selected project", async (t) => {
  const detailHtml = await readFile(new URL("portfolio-detail.html", root));
  const portfolioHtml = await readFile(new URL("portfolio.html", root));

  const server = http.createServer((request, response) => {
    if (request.url?.startsWith("/portfolio.html")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(portfolioHtml);
      return;
    }

    if (request.url?.startsWith("/portfolio-detail.html")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(detailHtml);
      return;
    }

    response.writeHead(404);
    response.end();
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const address = server.address();
  assert(address && typeof address === "object");

  const browser = await puppeteer.launch({ headless: true });
  t.after(() => browser.close());

  const page = await browser.newPage();
  let apiAvailable = true;
  let holdApiRequest = false;
  const selectedItem = {
    id: 120,
    title: "경기도 파주시 야당동 캐슬앤칸타빌아파트 24평",
    region: "경기도 파주시 야당동",
    area: "24평",
    spaceType: "아파트",
    cat: "주거공간",
    img: "",
    images: [],
    content: "선택한 야당동 현장의 시공 후기입니다.",
  };
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());

    if (
      url.origin === "https://admin.tovdesign.net" &&
      url.pathname === "/api/portfolio"
    ) {
      if (holdApiRequest) return;

      if (!apiAvailable) {
        request.abort();
        return;
      }

      const requestedId = url.searchParams.get("id");
      if (!requestedId) {
        request.respond({
          status: 200,
          contentType: "application/json; charset=utf-8",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({
            items: [selectedItem],
          }),
        });
        return;
      }

      if (requestedId && requestedId !== "120") {
        request.respond({
          status: 404,
          contentType: "application/json; charset=utf-8",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ error: "not found" }),
        });
        return;
      }

      const body = url.searchParams.has("id")
        ? { item: selectedItem }
        : { items: [selectedItem] };

      request.respond({
        status: 200,
        contentType: "application/json; charset=utf-8",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      });
      return;
    }

    if (url.origin !== `http://127.0.0.1:${address.port}`) {
      request.abort();
      return;
    }

    request.continue();
  });

  async function loadHeroTitle(query) {
    await page.goto(
      `http://127.0.0.1:${address.port}/portfolio-detail.html?${query}`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForSelector(".hero-title");
    return page.$eval(".hero-title", (element) => element.textContent?.trim());
  }

  const apiTitle = await loadHeroTitle("id=120&type=residential");
  assert.equal(
    apiTitle,
    "경기도 파주시 야당동 24평",
  );

  await page.goto(`http://127.0.0.1:${address.port}/portfolio.html`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelectorAll("#portfolio-grid > .p-card").length === 1,
  );
  const selectedCard = await page.$eval(
    "#portfolio-grid > .p-card",
    (element) => ({
      href: element.getAttribute("href"),
      title: element.querySelector(".p-card-title")?.textContent?.trim(),
    }),
  );
  assert.equal(
    selectedCard.href,
    "portfolio-detail.html?id=120&type=residential",
  );
  assert.equal(
    selectedCard.title,
    "경기도 파주시 야당동 캐슬앤칸타빌아파트 24평",
  );

  await page.waitForFunction(() => !document.getElementById("loadingScreen"));
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click("#portfolio-grid > .p-card"),
  ]);
  await page.waitForSelector(".hero-title");
  assert.equal(
    await page.$eval(".hero-title", (element) => element.textContent?.trim()),
    "경기도 파주시 야당동 24평",
  );
  assert.equal(
    await page.$eval(".project-desc p", (element) => element.textContent?.trim()),
    selectedItem.content,
  );
  assert.equal(new URL(page.url()).searchParams.get("id"), "120");

  apiAvailable = false;
  await page.goto(
    `http://127.0.0.1:${address.port}/portfolio.html?api=offline`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() =>
    document.body.textContent?.includes("시공사례를 불러올 수 없습니다"),
  );
  assert.equal(
    await page.$$eval("#portfolio-grid > .p-card", (cards) => cards.length),
    0,
  );

  apiAvailable = true;
  holdApiRequest = true;
  await page.goto(
    `http://127.0.0.1:${address.port}/portfolio.html?api=pending`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => !document.getElementById("loadingScreen"));
  assert.equal(
    await page.$$eval("#portfolio-grid > .p-card", (cards) =>
      cards.filter((card) => getComputedStyle(card).display !== "none").length,
    ),
    0,
  );
});
