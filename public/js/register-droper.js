const body = document.body;
document.querySelector('.logo').addEventListener('click', () => {
  body.classList.toggle('light');
  body.classList.toggle('dark');
});

// ===== Máscaras =====
function maskCpfCnpj(value) {
  value = value.replace(/\D/g, "");
  if (value.length <= 11) {
    return value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  } else {
    return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  }
}

function maskTelefone(value) {
  value = value.replace(/\D/g, "");
  if (value.length <= 10) {
    return value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else {
    return value.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }
}

function maskCep(value) {
  value = value.replace(/\D/g, "");
  return value.replace(/(\d{5})(\d{0,3})/, "$1-$2");
}

// Aplica máscaras em tempo real
document.getElementById("cpfCnpj").addEventListener("input", e => {
  e.target.value = maskCpfCnpj(e.target.value);
});
document.getElementById("telefone").addEventListener("input", e => {
  e.target.value = maskTelefone(e.target.value);
});
document.getElementById("celular").addEventListener("input", e => {
  e.target.value = maskTelefone(e.target.value);
});
document.getElementById("cep").addEventListener("input", e => {
  e.target.value = maskCep(e.target.value);
});

// ===== Envio do formulário =====
document.getElementById("formCadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  let data = Object.fromEntries(formData.entries());

  // Normalização
  data.name = data.name.trim();
  data.email = data.email.trim().toLowerCase();
  data.password = data.password.trim();
  if (data.cpfCnpj) data.cpfCnpj = data.cpfCnpj.replace(/\D/g, "");
  if (data.telefone) data.telefone = data.telefone.replace(/\D/g, "");
  if (data.celular) data.celular = data.celular.replace(/\D/g, "");
  if (data.cep) data.cep = data.cep.replace(/\D/g, "");
  if (data.site) data.site = data.site.trim();

  // Validações
  if (!data.name) return alert("⚠️ Nome é obrigatório.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return alert("⚠️ E-mail inválido.");
  if (data.password.length < 6) return alert("⚠️ A senha deve ter no mínimo 6 caracteres.");
  if (data.cpfCnpj && !/^(\d{11}|\d{14})$/.test(data.cpfCnpj)) return alert("⚠️ CPF deve ter 11 dígitos ou CNPJ 14 dígitos.");
  if (data.cep && data.cep.length !== 8) return alert("⚠️ CEP deve ter 8 números.");

  try {
    const res = await fetch("/addClient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert("✅ Cliente cadastrado com sucesso!");
      e.target.reset();
      fetchUsers();
    } else {
      const txt = await res.text();
      alert("❌ Erro ao cadastrar: " + txt);
    }
  } catch (err) {
    console.error("Erro no cadastro:", err);
    alert("❌ Erro no servidor.");
  }
});

// ===== Listagem de usuários =====
async function fetchUsers() {
  try {
    const res = await fetch('/admin/users-json');
    const users = await res.json();
    const container = document.getElementById('usersContainer');
    container.innerHTML = '';

    users.forEach(user => {
      const card = document.createElement('div');
      card.classList.add("userCard");

      // Monta preview básico
      card.innerHTML = `
        <p id="id-user"><strong>ID:</strong> ${user.id}</p>
        <p><strong>Nome:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Criado em:</strong> ${new Date(user.created_at).toLocaleString()}</p>
      `;

      // Monta dados extras (se existirem)
      let extrasDiv = null;
      if (user.dados && typeof user.dados === 'object') {
        let extrasHtml = '';
        for (const key in user.dados) {
          extrasHtml += `<p><strong>${key}:</strong> ${user.dados[key]}</p>`;
        }

        extrasDiv = document.createElement('div');
        extrasDiv.classList.add("extras");
        extrasDiv.style.display = "none";
        extrasDiv.innerHTML = extrasHtml;
      }

      // Botões
      const btnsDiv = document.createElement("div");
      btnsDiv.style.marginTop = "0.5rem";

      if (extrasDiv) {
        const toggleBtn = document.createElement("button");
        const toggleSpan = document.createElement("span");
        toggleSpan.classList.add("material-symbols-outlined");
        toggleSpan.textContent = "expand_circle_down"; // Ícone expandir
        toggleBtn.appendChild(toggleSpan);

        toggleBtn.addEventListener("click", () => {
          if (extrasDiv.style.display === "none") {
            extrasDiv.style.display = "block";
            toggleSpan.textContent = "expand_circle_up"; // Ícone recolher
          } else {
            extrasDiv.style.display = "none";
            toggleSpan.textContent = "expand_circle_down"; // Ícone expandir
          }
        });

        btnsDiv.appendChild(toggleBtn);
      }

      const editBtn = document.createElement("button");
      const editSpan = document.createElement("span");
      editSpan.classList.add("material-symbols-outlined");
      editSpan.textContent = "edit"; // ✏️
      editBtn.appendChild(editSpan);
      editBtn.addEventListener("click", () => {
        window.location.href = `/admin/edit?id=${user.id}`;
      });
      btnsDiv.appendChild(editBtn);

      const delBtn = document.createElement("button");
      const delSpan = document.createElement("span");
      delSpan.classList.add("material-symbols-outlined");
      delSpan.textContent = "delete"; // 🗑️
      delBtn.appendChild(delSpan);
      delBtn.addEventListener("click", () => deleteUser(user.id));
      btnsDiv.appendChild(delBtn);

      card.appendChild(btnsDiv);

      // Insere card e extras logo abaixo
      container.appendChild(card);
      if (extrasDiv) container.appendChild(extrasDiv);
    });
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
  }
}

// ===== Deletar usuário =====
async function deleteUser(id) {
  if (!confirm('Deseja realmente excluir este usuário?')) return;
  try {
    const res = await fetch(`/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      alert('Usuário deletado!');
      fetchUsers();
    } else {
      alert('Erro ao deletar usuário');
    }
  } catch (err) {
    console.error(err);
  }
}

// Carrega usuários ao abrir a página
fetchUsers();
