/* Autenticação real via Firebase Authentication + perfil público no Firestore. */

/* ==========================================================
   FASE 1 — Helpers de aprovação (ONG) e bloqueio (qualquer papel)
   ==========================================================
   Documentos novos de "users" passam a ter os campos booleanos
   "approved" (só faz sentido para role "ong") e "blocked" (qualquer
   papel). Documentos antigos, gravados antes desta fase, não têm
   esses campos — por isso as duas funções abaixo sempre fazem
   fallback para o campo "status" (pending/approved/blocked) que já
   existia, sem exigir nenhuma migração manual dos dados existentes.
   Usadas em todo o site (login, admin, doações) para não haver duas
   fontes de verdade sobre quem está aprovado/bloqueado.
   ========================================================== */
function isOngAprovada(profile) {
    if (!profile) return false;
    if (profile.role !== "ong") return true; // a checagem só existe para ONGs
    if (typeof profile.approved === "boolean") return profile.approved === true;
    return profile.status === "approved"; // fallback para documentos antigos
}
function isUsuarioBloqueado(profile) {
    if (!profile) return false;
    if (typeof profile.blocked === "boolean") return profile.blocked === true;
    return profile.status === "blocked"; // fallback para documentos antigos
}
window.isOngAprovada = isOngAprovada;
window.isUsuarioBloqueado = isUsuarioBloqueado;

function initFirebaseAuthModule() {
    if (!window.fb) return;
    const { auth, db, authSdk, firestoreSdk } = window.fb;

    const loginForm = document.getElementById("login-form");
    const registerButton = document.getElementById("wizard-next-btn");
    const message = (text, type = "success") => window.showToast?.(text, type);

    const toProfile = async (firebaseUser, fallback = {}) => {
        let profile = fallback;
        try {
            const saved = await firestoreSdk.getDoc(firestoreSdk.doc(db, "users", firebaseUser.uid));
            if (saved.exists()) profile = saved.data();
        } catch (error) { console.warn("Não foi possível ler o perfil no Firestore.", error); }
        return { id: firebaseUser.uid, email: firebaseUser.email, name: profile.name || firebaseUser.email.split("@")[0], role: profile.role || "person", ...profile };
    };
    window.__toFirebaseProfile = toProfile;

    authSdk.onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
            // Não existe sessão no Firebase. Se o site ainda guarda uma conta
            // "logada" em localStorage (sessão expirada, outra aba saiu, "manter-me
            // conectado" desmarcado), limpa — senão a tela mostra a pessoa logada e
            // toda gravação no banco falha com "permissão negada".
            if (window.appState?.user) window.encerrarSessaoLocal?.();
            return;
        }
        const profile = await toProfile(firebaseUser);
        if (isUsuarioBloqueado(profile)) {
            await authSdk.signOut(auth);
            message("Sua conta foi desativada pela administração. Fale com o suporte.", "danger");
            return;
        }
        window.performLogin?.(profile);
    });

    loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const email = document.getElementById("login-email")?.value.trim();
        const password = document.getElementById("login-password")?.value || "";
        const manterConectado = document.getElementById("login-remember")?.checked;
        try {
            // "Manter-me conectado": sessão persiste no navegador (local) ou
            // é encerrada ao fechar a aba (session), conforme a caixa marcada.
            await authSdk.setPersistence(auth, manterConectado ? authSdk.browserLocalPersistence : authSdk.browserSessionPersistence);
            const result = await authSdk.signInWithEmailAndPassword(auth, email, password);
            const profile = await toProfile(result.user);
            if (isUsuarioBloqueado(profile)) {
                await authSdk.signOut(auth);
                message("Sua conta foi desativada pela administração. Fale com o suporte.", "danger");
                return;
            }
            window.performLogin?.(profile);
        } catch (error) {
            const errors = { "auth/invalid-credential": "E-mail ou senha inválidos.", "auth/user-not-found": "E-mail ou senha inválidos.", "auth/wrong-password": "E-mail ou senha inválidos.", "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
            message(errors[error.code] || "Não foi possível entrar. Confira os dados e tente novamente.", "danger");
        }
    }, true);

    // "Esqueci minha senha": envia o e-mail de redefinição em português.
    // Mensagem sempre genérica para não revelar se o e-mail está cadastrado.
    document.getElementById("forgot-password-link")?.addEventListener("click", async (event) => {
        event.preventDefault();
        const email = document.getElementById("login-email")?.value.trim();
        if (!email) { message("Digite seu e-mail no campo acima e clique novamente em \"Esqueci minha senha\".", "warning"); return; }
        try { await authSdk.sendPasswordResetEmail(auth, email); } catch (error) {
            if (error.code === "auth/invalid-email") { message("Informe um e-mail válido.", "danger"); return; }
            if (error.code === "auth/too-many-requests") { message("Muitas tentativas. Aguarde alguns minutos e tente novamente.", "danger"); return; }
            console.warn("Falha ao enviar e-mail de redefinição.", error);
        }
        message("Se este e-mail estiver cadastrado, você receberá em instantes um link para criar uma nova senha. Confira também o spam.");
    });

    // Reenvio do e-mail de confirmação (botão no Perfil, quando existir).
    window.reenviarEmailConfirmacao = async () => {
        const atual = auth.currentUser;
        if (!atual) return;
        if (atual.emailVerified) { message("Seu e-mail já está confirmado."); return; }
        try { await authSdk.sendEmailVerification(atual); message("E-mail de confirmação reenviado. Confira também o spam."); }
        catch (error) { message(error.code === "auth/too-many-requests" ? "Aguarde alguns minutos antes de pedir outro e-mail." : "Não foi possível reenviar o e-mail agora.", "danger"); }
    };

    registerButton?.addEventListener("click", async (event) => {
        const isFinalStep = registerButton.textContent.includes("Finalizar");
        if (!isFinalStep) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const email = document.getElementById("reg-wizard-email")?.value.trim();
        const password = document.getElementById("reg-wizard-pass")?.value || "";
        const confirmation = document.getElementById("reg-wizard-pass-confirm")?.value || "";
        const terms = document.getElementById("reg-wizard-terms")?.checked;
        if (!email || password.length < 6 || password !== confirmation || !terms) { message("Revise e preencha os dados obrigatórios do cadastro.", "warning"); return; }
        const role = document.querySelector(".role-tab.active")?.getAttribute("data-role") || "person";
        const doc = document.getElementById("reg-wizard-doc")?.value.trim() || "";
        const isOng = role === "ong";
        const phone = document.getElementById("reg-wizard-phone")?.value.trim() || "";
        const address = document.getElementById("reg-wizard-address")?.value.trim() || "";
        const respDoc = document.getElementById("reg-wizard-ong-resp-cpf")?.value.trim() || "";

        // Última barreira de validação antes de gravar no banco: CPF/CNPJ,
        // telefone, e-mail e endereço têm que ser realmente válidos, não só preenchidos.
        const V = window.PSValidacao;
        if (V) {
            const docValido = isOng ? V.validarCNPJ(doc) : V.validarCPF(doc);
            if (!docValido) { message(isOng ? "CNPJ inválido. Confira os números." : "CPF inválido. Confira os números.", "danger"); return; }
            if (!V.validarEmail(email)) { message("Informe um e-mail válido.", "danger"); return; }
            if (!V.validarTelefone(phone)) { message("Informe um celular válido com DDD.", "danger"); return; }
            if (!V.validarEndereco(address)) { message("Informe o endereço completo: rua, número, bairro e cidade.", "danger"); return; }
            if (isOng && respDoc && !V.validarCPF(respDoc)) { message("CPF do responsável pela instituição é inválido.", "danger"); return; }
        }
        // Barreira final para ONG: o CNPJ precisa existir e estar ATIVO na
        // Receita Federal (dígitos corretos não bastam — geradores de CNPJ
        // passam nessa conta). Se as bases públicas estiverem fora do ar, o
        // cadastro segue, mas fica marcado como "não verificado" para o
        // administrador conferir manualmente antes de aprovar a ONG.
        let consultaCnpj = null;
        if (isOng && V) {
            registerButton.disabled = true;
            try { consultaCnpj = await V.consultarCNPJ(doc); }
            finally { registerButton.disabled = false; }
            if (["nao_encontrado", "inativa", "invalido"].includes(consultaCnpj.status)) {
                message(V.mensagemConsultaCNPJ(consultaCnpj), "danger");
                return;
            }
        }
        const profile = {
            name: document.getElementById("reg-wizard-name")?.value.trim(),
            role,
            phone: document.getElementById("reg-wizard-phone")?.value.trim() || "",
            doc,
            cpf: isOng ? "" : doc,
            cnpj: isOng ? doc : "",
            // Resultado da consulta à Receita (só ONG) — o Painel Adm mostra
            // a razão social para comparar com o nome informado.
            cnpjVerificado: isOng ? consultaCnpj?.status === "ok" : false,
            cnpjRazaoSocial: isOng && consultaCnpj?.status === "ok" ? (consultaCnpj.razaoSocial || "") : "",
            cnpjSituacao: isOng && consultaCnpj?.status === "ok" ? "ATIVA" : "",
            address: document.getElementById("reg-wizard-address")?.value.trim() || "",
            responsible_name: document.getElementById("reg-wizard-ong-resp-name")?.value.trim() || "",
            responsible_document: document.getElementById("reg-wizard-ong-resp-cpf")?.value.trim() || "",
            service_area: document.getElementById("reg-wizard-service-area")?.value.trim() || "",
            logistics_role: document.getElementById("reg-wizard-logistics")?.value.trim() || "",
            // ONGs entram como "pending"/"approved: false" até um administrador
            // validar o CNPJ/documento (Painel Adm > Moderação); contas de Pessoa
            // são liberadas imediatamente. "status" é mantido junto de
            // "approved"/"blocked" só por compatibilidade com o que já existia
            // (ver isOngAprovada/isUsuarioBloqueado neste mesmo arquivo).
            status: isOng ? "pending" : "approved",
            approved: isOng ? false : true,
            blocked: false,
            verified: false,
            createdAt: new Date().toISOString()
        };
        try {
            const result = await authSdk.createUserWithEmailAndPassword(auth, email, password);
            await firestoreSdk.setDoc(firestoreSdk.doc(db, "users", result.user.uid), profile);
            // E-mail de confirmação em português (auth.languageCode = "pt-BR",
            // js/firebase-config.js). Não bloqueia o cadastro: se o envio
            // falhar, a conta continua criada e o usuário pode pedir novo envio no Perfil.
            let emailEnviado = false;
            try {
                await authSdk.sendEmailVerification(result.user);
                emailEnviado = true;
            } catch (erroEmail) { console.warn("Não foi possível enviar o e-mail de confirmação.", erroEmail); }
            window.performLogin?.({ id: result.user.uid, email, ...profile });
            message(emailEnviado
                ? "Conta criada! Enviamos um e-mail de confirmação para " + email + " — confira também a caixa de spam."
                : "Conta criada e acesso liberado!");
        } catch (error) {
            const errors = { "auth/email-already-in-use": "Este e-mail já possui uma conta.", "auth/invalid-email": "Informe um e-mail válido.", "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres." };
            message(errors[error.code] || "Não foi possível concluir o cadastro.", "danger");
        }
    }, true);

    // O logout (limpar estado local + sair do Firebase Auth + resetar a
    // interface) foi unificado em UM único handler, em js/auth.js — ver o
    // comentário lá para o motivo (havia dois handlers concorrentes neste
    // mesmo botão, cada um fazendo só metade do trabalho).
}

let firebaseAuthModuleReady = false;
let includesLoadedForAuth = false;

function tryInitFirebaseAuthModule() {
    if (firebaseAuthModuleReady || !window.fb || !includesLoadedForAuth) return;
    firebaseAuthModuleReady = true;
    initFirebaseAuthModule();
}

document.addEventListener("includesLoaded", () => { includesLoadedForAuth = true; tryInitFirebaseAuthModule(); });
document.addEventListener("firebaseReady", tryInitFirebaseAuthModule);