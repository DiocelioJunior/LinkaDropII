const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

module.exports = function (db) {
  const router = express.Router();

  // Página de login (opcional)
  router.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });

  // --- POST /auth/login ---
  router.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Preencha todos os campos");
    }

    // 🧑‍💼 Login Admin
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      req.session.user = { id: 0, name: "Administrador", email, isAdmin: true };
      console.log("✅ Admin logado:", email);
      return req.session.save(() => res.redirect("/admin/home"));
    }

    // 👤 Login de usuário normal
    db.query("SELECT * FROM dropers WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("❌ Erro MySQL:", err);
        return res.status(500).send("Erro no servidor");
      }

      if (results.length === 0) {
        console.warn("⚠️ Usuário não encontrado:", email);
        return res.redirect("/auth/login");
      }

      const user = results[0];

      const senhaCorreta = await bcrypt.compare(password, user.password || "");
      if (!senhaCorreta) {
        console.warn("⚠️ Senha incorreta para:", email);
        return res.redirect("/auth/login");
      }

      req.session.user = {
        id: user.id,
        name: user.nome,
        email: user.email,
        isAdmin: false,
      };

      req.session.save(() => {
        console.log("✅ Usuário logado:", user.email);
        res.redirect("/client/home");
      });
    });
  });

  // --- Logout ---
  router.get("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/auth/login");
    });
  });

  return router;
};
