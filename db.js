const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Dio25069",   // ajuste para sua senha
  database: "gwa_db"
});

db.connect((err) => {
  if (err) console.error("❌ Erro MySQL:", err);
  else console.log("✅ Conectado ao MySQL!");
});

module.exports = db;
