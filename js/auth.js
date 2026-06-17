/* ========================================================
   PONTE SOLIDÁRIA - MÓDULO DE AUTENTICAÇÃO (LOGIN/CADASTRO)
   ======================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const registerCommonForm = document.getElementById("register-common-form");
    const registerOngForm = document.getElementById("register-ong-form");

    // Lógica de Login
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            const users = state.getUsers();
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                if (user.role === 'ong' && user.status === 'pending') {
                    showToast("Sua ONG está em análise de documentos pendente.", "warning");
                    return;
                }
                state.setCurrentUser(user);
                showToast(`Bem-vindo de volta, ${user.name}!`, "success");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast("E-mail ou senha incorretos.", "danger");
            }
        });
    }

    // Cadastro de Pessoa Comum
    if (registerCommonForm) {
        registerCommonForm.addEventListener("submit", (e) => {
            e.preventDefault();
            // Lógica para pegar os campos e salvar no localStorage via state
            showToast("Cadastro realizado com sucesso!", "success");
        });
    }
});
