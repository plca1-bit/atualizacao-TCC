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
    const logoutButton = document.getElementById("logout-btn");
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
        if (!firebaseUser) return;
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
        const profile = {
            name: document.getElementById("reg-wizard-name")?.value.trim(),
            role,
            phone: document.getElementById("reg-wizard-phone")?.value.trim() || "",
            doc,
            cpf: isOng ? "" : doc,
            cnpj: isOng ? doc : "",
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
            window.performLogin?.({ id: result.user.uid, email, ...profile });
            message("Conta criada e acesso liberado. Boas-vindas!");
        } catch (error) {
            const errors = { "auth/email-already-in-use": "Este e-mail já possui uma conta.", "auth/invalid-email": "Informe um e-mail válido.", "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres." };
            message(errors[error.code] || "Não foi possível concluir o cadastro.", "danger");
        }
    }, true);

    logoutButton?.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        await authSdk.signOut(auth);
        window.appState.user = null;
        window.updateUserAuthUI?.();
        window.renderDonationFlows?.();
        message("Você saiu da sua conta.", "info");
    }, true);
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