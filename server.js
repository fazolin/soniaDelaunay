const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { searchImages } = require("./scraper/googleImageSearch");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

app.post("/api/search-images", searchImages);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
