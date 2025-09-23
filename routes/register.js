// routes/register.js
const express = require("express");
const bcrypt = require("bcrypt");

module.exports = function(db) { // recebe db como parâmetro
  const router = express.Router();

  // Página de cadastro
  router.get("/register", (req, res) => {
    res.sendFile("register.html", { root: "public" });
  });

  // Cadastro de cliente
  router.post("/addClient", async (req, res) => {
    const { name, email, password, ...resto } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const dadosExtras = JSON.stringify(resto);

      db.query(
        "INSERT INTO dropers (name, email, password, dados) VALUES (?, ?, ?, ?)",
        [name, email, hashedPassword, dadosExtras],
        (err) => {
          if (err) {
            console.error("Erro ao inserir:", err);
            return res.status(500).send("Erro ao cadastrar cliente");
          }
          res.send("✅ Cliente cadastrado com sucesso! <a href='/'>Login</a>");
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).send("Erro interno no servidor");
    }
  });

  return router; // exporta o router
};
