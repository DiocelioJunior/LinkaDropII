const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "views/droper");
const files = fs.readdirSync(dir);

console.log("📂 Arquivos reais na pasta:");
files.forEach((f, i) => {
  console.log(`${i + 1}. "${f}" (length: ${f.length})`);
});
