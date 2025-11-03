// routes/orders.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

module.exports = (db) => {
  const router = express.Router();

  // ==============================
  // Configuração de upload (nota fiscal / etiqueta)
  // ==============================
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, "../public/uploads/orders");
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
      cb(null, uniqueName);
    },
  });

  const upload = multer({ storage });

  // ==============================
  // POST /api/orders/create — Cliente cria pedido
  // ==============================
  router.post(
    "/api/orders/create",
    upload.fields([
      { name: "nota_fiscal", maxCount: 1 },
      { name: "etiqueta", maxCount: 1 },
    ]),
    (req, res) => {
      if (!req.session.client) {
        console.warn("⛔ Tentativa de criar pedido sem login de cliente");
        return res.status(401).send("Não autorizado");
      }

      const client = req.session.client;
      const { product_id, quantity, notes } = req.body;

      const notaFiscalPath = req.files["nota_fiscal"]
        ? `/uploads/orders/${req.files["nota_fiscal"][0].filename}`
        : null;
      const etiquetaPath = req.files["etiqueta"]
        ? `/uploads/orders/${req.files["etiqueta"][0].filename}`
        : null;

      const sql = `
        INSERT INTO orders (client_id, droper_id, product_id, quantity, notes, nota_fiscal, etiqueta, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente')
      `;

      db.query(
        sql,
        [
          client.id,
          client.droper_id,
          product_id,
          quantity || 1,
          notes || null,
          notaFiscalPath,
          etiquetaPath,
        ],
        (err, result) => {
          if (err) {
            console.error("❌ Erro ao criar pedido:", err);
            return res.status(500).send("Erro ao criar pedido");
          }

          console.log(`✅ Pedido criado pelo cliente #${client.id} (produto #${product_id})`);
          res.json({ success: true, order_id: result.insertId });
        }
      );
    }
  );

  // ==============================
  // GET /api/orders/droper — Listar pedidos do droper logado
  // ==============================
// ==============================
// GET /api/orders/droper — Listar pedidos do droper logado
// ==============================
router.get("/api/orders/droper", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Não autorizado" });

  const droperId = req.session.user.id;

  const sql = `
    SELECT 
      o.id,
      o.client_id,
      o.droper_id,
      o.product_id,
      o.items_json,
      o.quantity,
      o.notes,
      o.nota_fiscal,
      o.etiqueta,
      o.status,
      o.created_at,
      c.name AS client_name,
      c.email AS client_email,
      c.dados,
      p.name AS product_name
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.droper_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [droperId], (err, results) => {
    if (err) {
      console.error("❌ Erro ao buscar pedidos:", err);
      return res.status(500).json({ error: "Erro ao buscar pedidos" });
    }

    const pedidos = results.map(p => {
      // 🔹 1. Parse do items_json
      try {
        if (typeof p.items_json === "string" && p.items_json) {
          p.items_json = JSON.parse(p.items_json);
        }
      } catch (e) {
        console.error("⚠️ Erro ao parsear items_json:", e, "Valor:", p.items_json);
        p.items_json = null;
      }

      // 🔹 2. Extrai dados do cliente (telefone, endereço etc)
      try {
        const dadosExtras = p.dados ? JSON.parse(p.dados) : {};
        p.client_phone = dadosExtras.telefone || null;
        p.client_address = dadosExtras.endereco || null;
        p.client_observations = dadosExtras.observacoes || null;
      } catch {
        p.client_phone = null;
        p.client_address = null;
        p.client_observations = null;
      }

      // Remove o campo JSON bruto pra não sujar a resposta
      delete p.dados;

      return p;
    });

    res.json(pedidos);
  });
});


  // ==============================
  // GET /api/orders/client — Listar pedidos do cliente logado
  // ==============================
  // GET /api/orders/client — Listar pedidos do cliente logado
router.get("/api/orders/client", (req, res) => {
  if (!req.session.client) {
    console.warn("⛔ Tentativa de acessar pedidos sem login de cliente");
    return res.status(401).json({ error: "Não autorizado" });
  }

  const clientId = req.session.client.id;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.quantity,
      o.status,
      o.notes,
      o.created_at,
      o.items_json,
      o.nota_fiscal,
      o.etiqueta,
      p.name AS product_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.client_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [clientId], (err, results) => {
    if (err) {
      console.error("❌ Erro ao buscar pedidos do cliente:", err);
      return res.status(500).json({ error: "Erro ao buscar pedidos" });
    }

    // Converte o JSON dos pedidos múltiplos
    const pedidos = results.map(p => {
      try {
        p.items_json = p.items_json ? JSON.parse(p.items_json) : null;
      } catch {
        p.items_json = null;
      }
      return p;
    });

    res.json(pedidos);
  });
});

  // ==============================
  // PATCH /api/orders/status/:id — Atualizar status (droper)
  // ==============================
  router.patch("/api/orders/status/:id", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const droperId = req.session.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["pendente", "processando", "enviado", "concluido"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const sql = `
      UPDATE orders SET status = ? 
      WHERE id = ? AND droper_id = ?
    `;

    db.query(sql, [status, id, droperId], (err, result) => {
      if (err) {
        console.error("❌ Erro ao atualizar status do pedido:", err);
        return res.status(500).json({ error: "Erro ao atualizar status" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      console.log(`✅ Pedido #${id} atualizado para: ${status}`);
      res.json({ success: true });
    });
  });

  // ==============================
  // GET /droper/orders — Página HTML de pedidos do droper
  // ==============================
  router.get("/droper/orders", (req, res) => {
    if (!req.session.user) return res.redirect("/login.html");
    res.sendFile(path.join(__dirname, "../views/droper/orders.html"));
  });

 // === Criar pedido com múltiplos produtos ===
// === Criar pedido com múltiplos produtos e múltiplos arquivos ===
router.post(
  "/api/orders/create-batch",
  upload.fields([
    { name: "nota_fiscal", maxCount: 10 },
    { name: "etiqueta", maxCount: 10 },
  ]),
  (req, res) => {
    console.log("📦 Recebendo pedido múltiplo...");

    // 🔐 Verifica sessão do cliente
    if (!req.session.client) {
      console.warn("⛔ Tentativa de criar pedido sem login de cliente");
      return res.status(401).send("Não autorizado");
    }

    const client = req.session.client;
    const { notes, items } = req.body;

    // 🧩 Processa os itens do carrinho
    let parsedItems = [];
    try {
      parsedItems = JSON.parse(items || "[]");
    } catch (e) {
      console.error("⚠️ Erro ao parsear JSON de itens:", e);
      return res.status(400).send("Formato inválido dos itens");
    }

    if (!parsedItems.length) {
      console.warn("⚠️ Nenhum item recebido para o pedido");
      return res.status(400).send("Carrinho vazio");
    }

    // 📂 Junta múltiplos PDFs em uma única string separada por vírgula
    const notaFiscalPath = req.files["nota_fiscal"]
      ? req.files["nota_fiscal"].map(f => `/uploads/orders/${f.filename}`).join(",")
      : null;

    const etiquetaPath = req.files["etiqueta"]
      ? req.files["etiqueta"].map(f => `/uploads/orders/${f.filename}`).join(",")
      : null;

    console.log("🧾 Nota fiscal:", notaFiscalPath);
    console.log("🏷️ Etiqueta:", etiquetaPath);

    // ✅ SQL corrigido: 9 colunas, 9 valores
    const sql = `
      INSERT INTO orders 
      (client_id, droper_id, product_id, items_json, quantity, notes, etiqueta, nota_fiscal, status)
      VALUES (?, ?, NULL, ?, 0, ?, ?, ?, 'pendente')
    `;

const safeNotes = Array.isArray(notes) ? notes.join(", ") : notes || null;

const values = [
  client.id,                   // client_id
  client.droper_id,            // droper_id
  JSON.stringify(parsedItems), // items_json
  safeNotes,                   // ✅ notes convertido para string simples
  etiquetaPath?.toString() || null,
  notaFiscalPath?.toString() || null
];

    console.log("🧱 Valores finais:", values);

    db.query(sql, values, (err) => {
      if (err) {
        console.error("❌ Erro ao criar pedido múltiplo:", err.sqlMessage || err);
        console.error("🧱 Query gerada:", err.sql);
        return res.status(500).send("Erro ao criar pedido");
      }

      console.log(`✅ Pedido múltiplo criado para cliente #${client.id}`);
      res.status(200).json({ success: true });
    });
  }
);
  return router;
};
