const sidebar = document.getElementById("sidebar");
const canvas = document.getElementById("canvas-area");
const buttons = document.querySelectorAll("[data-feature]");

let currentFeature = 1;

const loadFeature = async (feature) => {
  currentFeature = feature;
  buttons.forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`[data-feature="${feature}"]`).classList.add("active");

  try {
    // Atualizado para carregar 'moodboard.js'
    const module = await import(`./features/moodboard.js`);
    const { renderSidebar, renderCanvas } = module;

    sidebar.innerHTML = "";
    canvas.innerHTML = "";

    renderSidebar(sidebar);
    renderCanvas(canvas);
  } catch (err) {
    sidebar.innerHTML = `<p>Error loading feature ${feature}</p>`;
    canvas.innerHTML = "";
    console.error(err);
  }
};

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const feature = button.getAttribute("data-feature");
    loadFeature(feature);
  });
});

// 🔥 Carrega moodboard como default
loadFeature(1);
