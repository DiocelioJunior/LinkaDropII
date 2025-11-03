// routes/clientAuth.js
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");

module.exports = (db) => {
  const router = express.Router();

  // === LOGIN DO CLIENTE (GET) ===
  router.get("/clients/login/:droperId", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/clients/login.html"));
  });

  // === LOGIN POST ===
  router.post("/clients/login/:droperId", (req, res) => {
    const droperId = parseInt(req.params.droperId);
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).send("Preencha todos os campos");

    const sql = "SELECT * FROM clients WHERE email = ? AND droper_id = ?";
    db.query(sql, [email, droperId], async (err, results) => {
      if (err) {
        console.error("❌ Erro ao autenticar cliente:", err);
        return res.status(500).send("Erro interno no servidor");
      }

      if (!results.length)
        return res.status(401).send("Usuário não encontrado neste droper");

      const client = results[0];
      const match = await bcrypt.compare(password, client.password);
      if (!match) return res.status(401).send("Senha incorreta");

      // Salvar sessão do cliente logado
      req.session.client = {
        id: client.id,
        name: client.name,
        email: client.email,
        droper_id: client.droper_id,
      };

      console.log(`✅ Cliente ${client.name} logado no droper ${droperId}`);
      res.redirect(`/clients/store/${droperId}`);
    });
  });

  // === PÁGINA DA LOJA ===
  router.get("/clients/store/:droperId", (req, res) => {
    const droperId = parseInt(req.params.droperId);

    // Bloqueia acesso sem login
    if (!req.session.client)
      return res.redirect(`/clients/login/${droperId}`);

    // Bloqueia cliente de outro droper
    if (req.session.client.droper_id !== droperId)
      return res.status(403).send("🚫 Acesso negado a outra loja.");

    res.sendFile(path.join(__dirname, "../views/clients/store.html"));
  });

  // === LOGOUT ===
  router.get("/clients/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("gwa_session_id");
      res.redirect("/clients/login/1"); // opcional: redireciona para droper padrão
    });
  });

  // === API: PRODUTOS DO DROPER ===
  router.get("/api/clients/products/:droperId", (req, res) => {
    const droperId = parseInt(req.params.droperId);

    // Verifica sessão
    if (!req.session.client)
      return res.status(401).json({ error: "Não autorizado" });

    if (req.session.client.droper_id !== droperId)
      return res.status(403).json({ error: "Acesso negado" });

    // Busca produtos do droper no banco
    const sql = `
      SELECT id, name, category, description, brand, price, stock,
             product_condition, sku, extra
      FROM products
      WHERE user_id = ?
      ORDER BY id DESC
    `;

    db.query(sql, [droperId], (err, results) => {
      if (err) {
        console.error("❌ Erro ao buscar produtos:", err);
        return res.status(500).json({ error: "Erro ao buscar produtos" });
      }

      // Corrige campo extra (caso venha como texto)
      const produtos = results.map((p) => {
        try {
          if (typeof p.extra === "string") p.extra = JSON.parse(p.extra);
        } catch {
          p.extra = {};
        }

        // Corrige imagem
        if (p.extra?.mainImage && !p.extra.mainImage.startsWith("http")) {
          p.extra.mainImage = `/uploads/products/${path.basename(p.extra.mainImage)}`;
        }

        return p;
      });

      res.json(produtos);
    });
  });

  return router;
};
