// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");

module.exports = function(db) { // <-- recebe a conexão do server.js
  const router = express.Router();

  // Credenciais do admin
  const ADMIN_EMAIL = "admin@exemplo.com";
  const ADMIN_PASSWORD = "senhaSuperSegura";

  // --- POST /login ---
  router.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    // Verificação ADMIN
    if (email === ADMIN_EMAIL && senha === ADMIN_PASSWORD) {
      req.session.user = {
        id: 0,
        name: "Administrador",
        email: ADMIN_EMAIL,
        isAdmin: true,
      };
      return res.redirect("/admin.html");
    }

    // Verificação de usuários comuns no banco
    db.query("SELECT * FROM dropers WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).send("Erro no servidor");
      if (results.length === 0) return res.send("⚠️ Usuário não encontrado!");

      const user = results[0];
      const senhaCorreta = await bcrypt.compare(senha, user.password);
      if (!senhaCorreta) return res.send("⚠️ Senha incorreta!");

      // Sessão do usuário comum
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: false,
      };

      res.redirect("/dashboard.html");
    });
  });

  // --- GET /admin ---
  router.get("/admin", (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).send("⛔ Acesso negado");
    }
    res.sendFile(path.join(__dirname, "../public/admin.html"));
  });

  // --- GET /logout ---
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Erro ao fazer logout:", err);
      return res.status(500).send("Erro ao encerrar a sessão");
    }
    res.redirect("/index.html"); // redireciona para a página de login
  });
});


  return router;
};
