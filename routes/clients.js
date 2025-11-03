const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");

module.exports = (db) => {
    const router = express.Router();

    // === PÁGINAS ===

    // Cadastro de cliente (feito pelo droper)
    router.get("/clients/register", (req, res) => {
        if (!req.session.user) return res.redirect("/login.html");
        res.sendFile(path.join(__dirname, "../views/clients/register.html"));
    });

    // Listagem de clientes do droper
    router.get("/clients/list", (req, res) => {
        if (!req.session.user) return res.redirect("/login.html");
        res.sendFile(path.join(__dirname, "../views/clients/list.html"));
    });

    // Login do cliente
    router.get("/clients/login", (req, res) => {
        res.sendFile(path.join(__dirname, "../views/clients/login.html"));
    });

// 🏪 Rota pública da loja (sem login)
router.get("/clients/:droperId", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/clients/public-store.html"));
});

    // === API / LÓGICA ===

    // Cadastrar cliente (feito pelo droper)
    router.post("/clients/add", async (req, res) => {
        if (!req.session.user) return res.status(401).send("Não autorizado");

        const { name, email, password, telefone, endereco, observacoes } = req.body;
        const extras = { telefone, endereco, observacoes };
        const dadosExtras = JSON.stringify(extras);
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            "INSERT INTO clients (droper_id, name, email, password, dados) VALUES (?, ?, ?, ?, ?)",
            [req.session.user.id, name, email, hashedPassword, dadosExtras],
            (err) => {
                if (err) {
                    console.error("❌ Erro ao inserir cliente:", err);
                    return res.status(500).send("Erro ao cadastrar cliente");
                }
                console.log(`✅ Cliente criado: ${name} (${email})`);
                res.redirect("/clients/list");
            }
        );
    });

    // API - Listar clientes do droper logado
    router.get("/api/clients", (req, res) => {
        console.log("Sessão atual:", req.session.user);
        if (!req.session.user)
            return res.status(401).json({ error: "Não autorizado" });

        const droperId = req.session.user.id;
        const sql = "SELECT id, name, email, dados FROM clients WHERE droper_id = ? ORDER BY name ASC";

        db.query(sql, [droperId], (err, results) => {
            if (err) {
                console.error("❌ Erro ao buscar clientes:", err);
                return res.status(500).json({ error: "Erro ao buscar clientes" });
            }

            // Processa os dados extras (telefone, endereço, observacoes) que estão em JSON
            const clientes = results.map(c => {
                try {
                    const dadosExtras = c.dados ? JSON.parse(c.dados) : {};
                    // Mapeia os dados extras para as chaves esperadas no frontend
                    c.phone = dadosExtras.telefone || '-';
                    c.address = dadosExtras.endereco || '-';
                    c.observations = dadosExtras.observacoes || '';
                    delete c.dados; // Remove a coluna JSON bruta
                } catch {
                    c.phone = '-';
                    c.address = '-';
                }
                return c;
            });

            res.json(clientes);
        });
    });

    // Login POST do cliente
    router.post("/clients/login", (req, res) => {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).send("Preencha todos os campos");

        db.query("SELECT * FROM clients WHERE email = ?", [email], async (err, results) => {
            if (err) return res.status(500).send("Erro interno no servidor");
            if (!results.length) return res.status(401).send("Usuário não encontrado");

            const client = results[0];
            const match = await bcrypt.compare(password, client.password);
            if (!match) return res.status(401).send("Senha incorreta");

            // Cria sessão separada para cliente
            req.session.client = {
                id: client.id,
                name: client.name,
                droper_id: client.droper_id,
            };

            res.redirect("/clients/store");
        });
    });

    // Logout do cliente
    router.get("/clients/logout", (req, res) => {
        req.session.destroy(() => res.redirect("/clients/login"));
    });

    // API - Produtos visíveis ao cliente
    // API - Produtos visíveis ao cliente
    router.get("/api/clients/products", (req, res) => {
        if (!req.session.client)
            return res.status(401).json({ error: "Não autorizado" });

        const droperId = req.session.client.droper_id;
        if (!droperId)
            return res.status(400).json({ error: "Sessão inválida (droper não definido)" });

        // ✅ Query corrigida (sem quebras, sem espaços iniciais)
        const sql = "SELECT id, name, price, category, description, brand, extra FROM products WHERE user_id = ? ORDER BY id DESC";

        db.query(sql, [droperId], (err, results) => {
            if (err) {
                console.error("❌ Erro ao buscar produtos:", err);
                return res.status(500).json({ error: "Erro ao buscar produtos" });
            }

            const produtos = results.map((p) => {
                try {
                    p.extra = p.extra ? JSON.parse(p.extra) : {};
                } catch {
                    p.extra = {};
                }
                return p;
            });

            res.json(produtos);
        });
    });


    // Excluir cliente
    router.delete("/clients/delete/:id", (req, res) => {
        if (!req.session.user) return res.status(401).send("Não autorizado");

        const droperId = req.session.user.id;
        const id = req.params.id;

        db.query(
            "DELETE FROM clients WHERE id = ? AND droper_id = ?",
            [id, droperId],
            (err, result) => {
                if (err) return res.status(500).send("Erro ao excluir cliente");
                if (result.affectedRows === 0)
                    return res.status(403).send("Acesso negado");
                res.sendStatus(200);
            }
        );
    });

    return router;
};