export function renderSidebar(container) {
  container.innerHTML = `
    <h2>Moodboard Settings</h2>
    <label>Width (px):</label>
    <input type="number" id="input-width" value="1920" />

    <label>Height (px):</label>
    <input type="number" id="input-height" value="1080" />

    <label>Density:</label>
    <input type="number" id="input-density" value="2" min="1" max="6" />

    <label>Keyword:</label>
    <input type="text" id="input-keyword" value="abstract geometry" />

    <button id="btn-generate-grid">Regenerate Grid</button>
    <button id="btn-generate-moodboard">Generate Moodboard</button>
    <button id="btn-export">Export Moodboard</button>
  `;

  const regenerate = () => {
    const width = parseInt(document.getElementById("input-width").value, 10);
    const height = parseInt(document.getElementById("input-height").value, 10);
    const density = parseInt(
      document.getElementById("input-density").value,
      10
    );
    const keyword = document.getElementById("input-keyword").value;

    const event = new CustomEvent("generate-moodboard", {
      detail: { width, height, density, keyword },
    });
    window.dispatchEvent(event);
  };

  ["input-width", "input-height", "input-density"].forEach((id) => {
    document.getElementById(id).addEventListener("input", regenerate);
  });

  document
    .getElementById("btn-generate-grid")
    .addEventListener("click", regenerate);

  document
    .getElementById("btn-generate-moodboard")
    .addEventListener("click", async () => {
      const keyword = document.getElementById("input-keyword").value.trim();
      const density = parseInt(
        document.getElementById("input-density").value,
        10
      );
      const count = Math.pow(2, density);
      const tiles = window.getMoodboardTiles?.() || [];
      const { ctx } = window.getMoodboardContext?.() || {};
      const container = document.getElementById("moodboard-images");

      if (!keyword) {
        alert("Por favor, insira uma palavra-chave para buscar imagens.");
        return;
      }

      container.innerHTML = `<p style="color:#aaa;">🔍 Buscando ${count} imagens para "${keyword}"...</p>`;

      try {
        const res = await fetch("/api/search-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: keyword }),
        });

        const data = await res.json();
        container.innerHTML = "";

        const filtered = Array.isArray(data)
          ? data.filter((item) => item.image_url).slice(0, count)
          : [];

        if (filtered.length === 0) {
          container.innerHTML = `<p style="color:#ccc;">Nenhuma imagem encontrada para "${keyword}".</p>`;
          return;
        }

        await Promise.all(
          tiles.slice(0, filtered.length).map((tile, index) => {
            return new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                const tileRatio = tile.width / tile.height;
                const imgRatio = img.width / img.height;

                let sx = 0,
                  sy = 0,
                  sWidth = img.width,
                  sHeight = img.height;

                if (imgRatio > tileRatio) {
                  // imagem mais larga que o tile — crop nas laterais
                  sWidth = img.height * tileRatio;
                  sx = (img.width - sWidth) / 2;
                } else {
                  // imagem mais alta que o tile — crop no topo e embaixo
                  sHeight = img.width / tileRatio;
                  sy = (img.height - sHeight) / 2;
                }

                ctx.drawImage(
                  img,
                  sx,
                  sy,
                  sWidth,
                  sHeight,
                  tile.x,
                  tile.y,
                  tile.width,
                  tile.height
                );
                resolve();
              };
              img.onerror = resolve;
              img.src = filtered[index].image_url;
            });
          })
        );
      } catch (err) {
        console.error("Erro ao buscar imagens:", err);
        container.innerHTML = `<p style="color:red;">Erro ao buscar imagens. Verifique o servidor.</p>`;
      }
    });

  document.getElementById("btn-export").addEventListener("click", () => {
    const event = new Event("export-moodboard");
    window.dispatchEvent(event);
  });

  regenerate();
}

export function renderCanvas(container) {
  container.innerHTML = `
    <div id="canvas-wrapper">
      <canvas id="moodboard-canvas"></canvas>
      <div id="moodboard-images"></div>
    </div>
  `;

  const canvas = document.getElementById("moodboard-canvas");
  const ctx = canvas.getContext("2d");
  let originalWidth = 1920;
  let originalHeight = 1080;
  let tiles = [];

  const drawRecursiveGrid = (x, y, width, height, depth) => {
    if (depth === 0) {
      tiles.push({ x, y, width, height });
      return;
    }

    const aspectRatio = width / height;
    let splitVertically;

    if (aspectRatio > 1.2) splitVertically = true;
    else if (aspectRatio < 0.8) splitVertically = false;
    else splitVertically = Math.random() > 0.5;

    const split = Math.random() * 0.4 + 0.3;

    if (splitVertically) {
      const w1 = width * split;
      const w2 = width - w1;
      drawRecursiveGrid(x, y, w1, height, depth - 1);
      drawRecursiveGrid(x + w1, y, w2, height, depth - 1);
    } else {
      const h1 = height * split;
      const h2 = height - h1;
      drawRecursiveGrid(x, y, width, h1, depth - 1);
      drawRecursiveGrid(x, y + h1, width, h2, depth - 1);
    }
  };

  const draw = ({ width, height, density }) => {
    originalWidth = width;
    originalHeight = height;
    canvas.width = width;
    canvas.height = height;

    tiles = [];
    ctx.clearRect(0, 0, width, height);
    drawRecursiveGrid(0, 0, width, height, density);

    tiles.forEach(({ x, y, width, height }) => {
      const gray = Math.floor(Math.random() * 156 + 50);
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(x, y, width, height);
    });
  };

  window.getMoodboardTiles = () => tiles;
  window.getMoodboardContext = () => ({
    ctx,
    canvas,
    originalWidth,
    originalHeight,
  });

  window.addEventListener("generate-moodboard", (e) => {
    draw(e.detail);
  });

  window.addEventListener("export-moodboard", () => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = originalWidth;
    exportCanvas.height = originalHeight;

    const exportCtx = exportCanvas.getContext("2d");
    exportCtx.drawImage(canvas, 0, 0);

    const link = document.createElement("a");
    link.download = "moodboard.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  });

  window.dispatchEvent(
    new CustomEvent("generate-moodboard", {
      detail: {
        width: 1920,
        height: 1080,
        density: 2,
        keyword: "abstract geometry",
      },
    })
  );
}
