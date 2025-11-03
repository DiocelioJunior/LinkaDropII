const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

module.exports = function (db) {
  const router = express.Router();

  // === Configuração do upload (logo e banner) ===
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, "../public/uploads/logos");
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

  // === Página de configuração (HTML) ===
  router.get("/config", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "../views/droper/store-config.html"));
  });

  // === GET /api/store/config/:droperId ===
  router.get("/api/store/config/:droperId", (req, res) => {
    const { droperId } = req.params;
    const sql = "SELECT * FROM store_config WHERE droper_id = ?";
    
    db.query(sql, [droperId], (err, results) => {
      if (err) {
        console.error("❌ Erro ao buscar config:", err);
        return res.status(500).json({ error: "Erro ao buscar configuração" });
      }

      if (!results.length) {
        return res.json({});
      }

      const config = results[0];
      config.logo_url = config.logo_url ? config.logo_url : null;
      config.banner_url = config.banner_url ? config.banner_url : null;

      res.json(config);
    });
  });

  // === POST /api/store/config/update/:droperId ===
  router.post(
    "/api/store/config/update/:droperId",
    upload.fields([
      { name: "logo", maxCount: 1 },
      { name: "banner", maxCount: 1 },
    ]),
    (req, res) => {
      const { droperId } = req.params;
      const { store_name, shipping_mode, shipping_value, contact_number } = req.body;
      const logo_url = req.files["logo"] ? `/uploads/logos/${req.files["logo"][0].filename}` : null;
      const banner_url = req.files["banner"] ? `/uploads/logos/${req.files["banner"][0].filename}` : null;

      const sql = `
        INSERT INTO store_config (droper_id, store_name, logo_url, banner_url, shipping_mode, shipping_value, contact_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          store_name = VALUES(store_name),
          logo_url = IFNULL(VALUES(logo_url), logo_url),
          banner_url = IFNULL(VALUES(banner_url), banner_url),
          shipping_mode = VALUES(shipping_mode),
          shipping_value = VALUES(shipping_value),
          contact_number = VALUES(contact_number)
      `;

      db.query(
        sql,
        [droperId, store_name, logo_url, banner_url, shipping_mode, shipping_value, contact_number],
        (err) => {
          if (err) {
            console.error("❌ Erro ao atualizar config:", err);
            return res.status(500).json({ error: "Erro ao salvar configurações" });
          }
          res.json({ success: true });
        }
      );
    }
  );

  return router;
};
