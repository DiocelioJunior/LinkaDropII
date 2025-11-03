// routes/products.js
const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

module.exports = function (db) {
  const router = express.Router();

  // ---------------------------
  // Middleware: precisa estar logado
  // ---------------------------
  function checkAuth(req, res, next) {
    if (!req.session.user) {
      console.warn("⛔ Tentativa de cadastrar produto sem login");
      return res.redirect("/index.html");
    }
    next();
  }

  ///////////////////////////////////////////////////////////////////
  // ---------------------------
  // Configuração do Multer (upload)
  // ---------------------------
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, "../public/uploads/products");
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName =
        Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
      cb(null, uniqueName);
    },
  });

  const upload = multer({ storage });

  ///////////////////////////////////////////////////////////////////
  // ---------------------------
  // GET /products/register
  // ---------------------------
  router.get("/products/register", checkAuth, (req, res) => {
    res.sendFile("product-register.html", {
      root: path.join(__dirname, "../views/droper"),
    });
  });

  ///////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////
  // ---------------------------
  // POST /products/add
  // ---------------------------
  router.post(
    "/products/add",
    checkAuth,
    upload.any(), // aceita qualquer campo (mainImage + variationImages dinamicos)
    async (req, res) => {
      const userId = req.session.user.id;
      const {
        name,
        category,
        description,
        brand,
        price,
        stock,
        product_condition,
        sku,
        variacoes
      } = req.body;

      try {
        if (!name || !category || !price) {
          return res.status(400).send("⚠️ Nome, categoria e preço são obrigatórios");
        }

        // ---------------------------
        // Caminhos das imagens enviadas
        // ---------------------------
        const allFiles = req.files || [];

        // imagem principal
        const mainFile = allFiles.find(f => f.fieldname === "mainImage");
        const mainImage = mainFile
          ? `/uploads/products/${mainFile.filename}`
          : null;

        // imagens de variação (v1_img_0, v1_img_1, etc)
        const variationImageMap = {};
        allFiles.forEach(f => {
          if (f.fieldname.startsWith("variation_")) {
            variationImageMap[f.fieldname] = `/uploads/products/${f.filename}`;
          }
        });

        // ---------------------------
        // Montar objeto de extras
        // ---------------------------
        let extrasObj = { mainImage };

        // Parsear as variações com as imagens correspondentes
        if (variacoes) {
          try {
            let parsed = JSON.parse(variacoes);
            parsed = parsed.map((v, vi) => {
              if (v.opcoes && Array.isArray(v.opcoes)) {
                v.opcoes = v.opcoes.map((op, oi) => {
                  const key = `variation_${vi}_${oi}`;
                  if (variationImageMap[key]) {
                    op.imagem = variationImageMap[key];
                  }
                  return op;
                });
              }
              return v;
            });
            extrasObj.variacoes = parsed;
          } catch (err) {
            console.warn("⚠️ Erro ao parsear variacoes:", err);
            extrasObj.variacoes = [];
          }
        }

        // Outras informações complementares
        extrasObj.peso = req.body.peso || null;
        extrasObj.altura = req.body.altura || null;
        extrasObj.largura = req.body.largura || null;
        extrasObj.comprimento = req.body.comprimento || null;
        extrasObj.atributos = req.body.atributos || null;

        const extras = JSON.stringify(extrasObj);

        // ---------------------------
        // Inserir no banco
        // ---------------------------
        const sql = `
          INSERT INTO products
          (user_id, name, category, description, brand, price, stock, product_condition, sku, extra)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          sql,
          [
            userId,
            name,
            category,
            description,
            brand || null,
            price,
            stock || 0,
            product_condition || "novo",
            sku || null,
            extras,
          ],
          (err) => {
            if (err) {
              console.error("❌ Erro ao inserir produto:", err);
              return res.status(500).send("Erro ao cadastrar produto");
            }
            console.log(`✅ Produto cadastrado com sucesso: ${name}`);
            res.redirect("/dashboard");
          }
        );
      } catch (err) {
        console.error("❌ Erro inesperado no cadastro de produto:", err);
        res.status(500).send("Erro interno no servidor");
      }
    }
  );


  ///////////////////////////////////////////////////////////////////
  // --- GET /products/list ---
router.get("/products/list", checkAuth, (req, res) => {
  res.sendFile("product-list.html", {
    root: path.join(__dirname, "../views/droper"),
  });
});

///////////////////////////////////////////////////////////////////
// --- API para retornar os produtos em JSON ---
// --- API para retornar os produtos em JSON ---
router.get("/api/products", (req, res) => {
  const userId = req.session?.user?.id || null;

  let sql = "SELECT id, name, category, price, stock, extra FROM products";
  let params = [];

  if (userId) {
    sql += " WHERE user_id = ?";
    params.push(userId);
  }

  sql += " ORDER BY created_at DESC";

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Erro ao buscar produtos:", err);
      return res.status(500).json({ error: "Erro ao buscar produtos" });
    }

    const produtos = results.map(p => {
      let extra = {};

      try {
        // 🔍 Se for Buffer, converte pra string
        if (Buffer.isBuffer(p.extra)) {
          p.extra = p.extra.toString("utf8");
        }

        // 🔍 Se for string JSON, faz parse
        if (typeof p.extra === "string" && p.extra.trim().startsWith("{")) {
          extra = JSON.parse(p.extra);
        } 
        // 🔍 Se já é objeto, usa direto
        else if (typeof p.extra === "object" && p.extra !== null) {
          extra = p.extra;
        }

        // 🔍 Corrige os caminhos das imagens
        if (extra.mainImage) {
          extra.mainImage = extra.mainImage
            .replace(/\\/g, "/")
            .replace(/^.*\/uploads\//, "/uploads/");
        }

        if (extra.variacoes && Array.isArray(extra.variacoes)) {
          extra.variacoes = extra.variacoes.map(v => {
            if (v.opcoes && Array.isArray(v.opcoes)) {
              v.opcoes = v.opcoes.map(o => {
                if (o.imagem) {
                  o.imagem = o.imagem
                    .replace(/\\/g, "/")
                    .replace(/^.*\/uploads\//, "/uploads/");
                }
                return o;
              });
            }
            return v;
          });
        }

      } catch (e) {
        console.warn("⚠️ Erro ao processar campo 'extra':", e);
        extra = {};
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        extra
      };
    });

    res.json(produtos);
  });
});

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
// --- API pública: listar produtos de um droper específico ---
///////////////////////////////////////////////////////////////////
// --- API pública: listar produtos de um droper específico ---
router.get("/api/public-products/:droperId", (req, res) => {
  const { droperId } = req.params;

  if (!droperId) {
    return res.status(400).json({ error: "ID do droper não informado" });
  }

  const sql = `
    SELECT id, name, category, price, description, brand, extra
    FROM products
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [droperId], (err, results) => {
    if (err) {
      console.error("❌ Erro ao buscar produtos públicos:", err);
      return res.status(500).json({ error: "Erro ao buscar produtos" });
    }

const produtos = results.map(p => {
  let extra = {};

  try {
    // 🔍 Se for Buffer, converte para string
    if (Buffer.isBuffer(p.extra)) {
      p.extra = p.extra.toString("utf8");
    }

    // 🔍 Se for string JSON válida, parseia
    if (typeof p.extra === "string" && p.extra.trim().startsWith("{")) {
      extra = JSON.parse(p.extra);
    }

    // 🔍 Se já veio como objeto, usa direto
    else if (typeof p.extra === "object" && p.extra !== null) {
      extra = p.extra;
    }

    // 🔍 Caso contrário, inicializa vazio
    else {
      extra = {};
    }
  } catch (e) {
    console.warn("⚠️ Erro ao processar campo 'extra':", e);
    extra = {};
  }

  // Corrige caminhos das imagens
  if (extra.mainImage) {
    extra.mainImage = extra.mainImage
      .replace(/\\/g, "/")
      .replace(/^.*\/uploads\//, "/uploads/");
  }

  if (extra.variacoes && Array.isArray(extra.variacoes)) {
    extra.variacoes = extra.variacoes.map(v => {
      if (v.opcoes && Array.isArray(v.opcoes)) {
        v.opcoes = v.opcoes.map(o => {
          if (o.imagem) {
            o.imagem = o.imagem
              .replace(/\\/g, "/")
              .replace(/^.*\/uploads\//, "/uploads/");
          }
          return o;
        });
      }
      return v;
    });
  }

  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    brand: p.brand,
    extra
  };
});


    res.json(produtos);
  });
});


///////////////////////////////////////////////////////////////////
// DELETE /products/delete/:id
router.delete("/products/delete/:id", checkAuth, (req, res) => {
  const userId = req.session.user.id;
  const { id } = req.params;

  db.query(
    "DELETE FROM products WHERE id = ? AND user_id = ?",
    [id, userId],
    (err) => {
      if (err) {
        console.error("❌ Erro ao excluir produto:", err);
        return res.status(500).send("Erro ao excluir produto");
      }
      res.json({ success: true });
    }
  );
});


//////////////////////////////////////////////////////////////////
// --- GET /products/edit/:id (serve a página)
router.get("/products/edit/:id", checkAuth, (req, res) => {
  res.sendFile("product-edit.html", {
    root: path.join(__dirname, "../views/droper"),
  });
});


//////////////////////////////////////////////////////////////////
// --- GET /api/products/:id (dados JSON)
router.get("/api/products/:id", checkAuth, (req, res) => {
  const userId = req.session.user.id;
  const { id } = req.params;

  db.query(
    "SELECT * FROM products WHERE id = ? AND user_id = ?",
    [id, userId],
    (err, results) => {
      if (err) {
        console.error("❌ Erro ao buscar produto:", err);
        return res.status(500).json({ error: "Erro ao buscar produto" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      let produto = results[0];
      try {
        produto.extra = produto.extra ? JSON.parse(produto.extra) : {};
      } catch {
        produto.extra = {};
      }

      res.json(produto);
    }
  );
});

///////////////////////////////////////////////////////////////////
// --- ROTA VISUAL: Loja pública do droper ---
router.get("/store/:droperId", (req, res) => {
  res.sendFile("store.html", {
    root: path.join(__dirname, "../views/clients"),
  });
});

//////////////////////////////////////////////////////////////////
// --- POST /products/update/:id (salva edição)
router.post(
  "/products/update/:id",
  checkAuth,
  upload.fields([{ name: "mainImage", maxCount: 1 }, { name: "variationImages" }]),
  (req, res) => {
    const userId = req.session.user.id;
    const { id } = req.params;
    const { name, category, description, brand, price, stock, product_condition, sku, ...resto } = req.body;

    // imagens
    const mainImage = req.files["mainImage"]
      ? `/uploads/products/${req.files["mainImage"][0].filename}`
      : null;

    let variationImages = [];
    if (req.files["variationImages"]) {
      variationImages = req.files["variationImages"].map(
        (file) => `/uploads/products/${file.filename}`
      );
    }

    const extras = JSON.stringify({
      ...resto,
      ...(mainImage && { mainImage }),
      ...(variationImages.length && { variationImages }),
    });

    const sql = `
      UPDATE products
      SET name=?, category=?, description=?, brand=?, price=?, stock=?, product_condition=?, sku=?, extra=?
      WHERE id=? AND user_id=?`;

    db.query(
      sql,
      [name, category, description, brand, price, stock || 0, product_condition, sku, extras, id, userId],
      (err) => {
        if (err) {
          console.error("❌ Erro ao atualizar produto:", err);
          return res.status(500).send("Erro ao atualizar produto");
        }
        console.log(`✅ Produto atualizado: ${name} (id: ${id})`);
        res.redirect("/products/list");
      }
    );
  }
);

  return router;
};
