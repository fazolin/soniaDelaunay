const puppeteer = require("puppeteer");

exports.searchImages = async (req, res) => {
  const query = req.body.query;
  if (!query || query.trim() === "") {
    return res.json([]);
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
      query
    )}`;
    await page.goto(searchUrl, { waitUntil: "networkidle0", timeout: 60000 });

    // Scroll repetido para forçar carregamento de mais imagens
    await page.evaluate(async () => {
      for (let i = 0; i < 20; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    });

    // Esperar carregamento de todas as imagens visíveis
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          });
        })
      );
    });

    // Coleta e filtro
    const results = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("img"))
        .map((img) => ({
          term: img.alt || "",
          image_url: img.src || "",
        }))
        .filter(
          (obj) =>
            obj.image_url &&
            obj.image_url.startsWith("http") &&
            obj.term.trim().length > 0 &&
            !obj.image_url.includes("data:image") &&
            !obj.image_url.includes("google")
        )
        .slice(0, 80); // busca até 80 para garantir qualidade
    });

    await browser.close();

    const valid = results.filter((r) => r.image_url);
    console.log(`[SCRAPER] ${valid.length} imagens úteis para "${query}"`);

    res.json(valid);
  } catch (err) {
    console.error("Erro no scraping do Google Images:", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
};
