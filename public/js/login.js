document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    function showError(input, message) {
      let error = input.parentElement.querySelector(".error-message");
      if (!error) {
        error = document.createElement("small");
        error.classList.add("error-message");
        error.style.color = "red";
        error.style.display = "block";
        error.style.marginTop = "5px";
        input.parentElement.appendChild(error);
      }
      error.textContent = message;
    }

    function clearError(input) {
      const error = input.parentElement.querySelector(".error-message");
      if (error) {
        error.remove();
      }
    }

    function validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email.toLowerCase());
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault(); // evita envio automático

      let isValid = true;

      // Validação Email
      if (emailInput.value.trim() === "") {
        showError(emailInput, "O email é obrigatório.");
        isValid = false;
      } else if (!validateEmail(emailInput.value.trim())) {
        showError(emailInput, "Digite um email válido.");
        isValid = false;
      } else {
        clearError(emailInput);
      }

      // Validação Senha
      if (passwordInput.value.trim() === "") {
        showError(passwordInput, "A senha é obrigatória.");
        isValid = false;
      } else if (passwordInput.value.trim().length < 6) {
        showError(passwordInput, "A senha deve ter pelo menos 6 caracteres.");
        isValid = false;
      } else {
        clearError(passwordInput);
      }

      // Se for válido, pode enviar ou exibir mensagem de sucesso
      if (isValid) {
        alert("Login efetuado com sucesso!");
        form.submit(); // aqui você pode substituir por requisição fetch/axios
      }
    });
  });