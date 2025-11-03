// helpers/viewPath.js
const path = require("path");
const fs = require("fs");

function viewPath(folder, file) {
  const filePath = path.resolve(__dirname, `../views/${folder}/${file}`);

  if (!fs.existsSync(filePath)) {
    const msg = `❌ Arquivo não encontrado: ${filePath}`;
    console.error(msg);
    throw new Error(msg); // só lança erro, quem chama trata
  }

  return filePath;
}

module.exports = viewPath;
