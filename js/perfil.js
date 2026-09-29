/* ==========================================================
   PONTE SOLIDÁRIA — PAINEL "MEU PERFIL" (MÓDULO 2)
   ==========================================================
   Mostra foto, nome, cidade, telefone, data de cadastro e as
   estatísticas de impacto do usuário logado, lendo os dados reais
   gravados no Firestore (js/firebase-auth.js grava o cadastro;
   js/doacoes.js grava doações, pedidos e campanhas).

   O cadastro real (js/firebase-auth.js) só tem dois papéis de conta:
   "person" e "ong" (mais "admin", atribuído manualmente no banco).
   Não existe um papel separado de "Doador" e de "Beneficiário" — uma
   conta Pessoa pode doar e pedir ajuda ao mesmo tempo — então o
   bloco "Meu Impacto" mostra as duas visões juntas para quem é
   Pessoa, e só o bloco institucional para quem é ONG.
   ========================================================== */

function extrairCidade(endereco) {
    if (!endereco) return "—";
    const semUf = endereco.split(/\s-\s/)[0]; // remove " - UF" do final, se houver
    const partes = semUf.split(",").map((p) => p.trim()).filter(Boolean);
    return partes.length ? partes[partes.length - 1] : endereco;
}

function nomePapel(role) {
    const nomes = {
        person: "Pessoa",
        ong: "ONG / Instituição mediadora",
        admin: "Administrador",
        common: "Pessoa",
        donor: "Pessoa",
        recipient: "Pessoa",
        beneficiary: "Pessoa",
        institution: "ONG / Instituição mediadora"
    };
    return nomes[role] || "Usuário";
}

function formatarDataAtividade(valor) {
    try {
        const data = valor?.toDate ? valor.toDate() : new Date(valor);
        if (Number.isNaN(data.getTime())) return "";
        return data.toLocaleDateString("pt-BR");
    } catch {
        return "";
    }
}

async function renderPerfil() {
    const user = window.appState?.user;
    if (!user) return;

    const foto = document.getElementById("perfil-foto-preview");
    const fotoInicial = document.getElementById("perfil-foto-inicial");
    const nome = document.getElementById("perfil-nome");
    const papel = document.getElementById("perfil-papel");
    const email = document.getElementById("perfil-email");
    const telefone = document.getElementById("perfil-telefone");
    const cidade = document.getElementById("perfil-cidade");
    const membroDesde = document.getElementById("perfil-membro-desde");

    if (nome) nome.textContent = user.name || "—";
    if (papel) papel.textContent = nomePapel(user.role);
    if (email) email.textContent = user.email || "—";
    if (telefone) telefone.textContent = user.phone || "Não informado";
    if (cidade) cidade.textContent = extrairCidade(user.address);
    if (membroDesde) membroDesde.textContent = user.createdAt ? formatarDataAtividade(user.createdAt) : "—";

    if (user.photoBase64 && foto && fotoInicial) {
        foto.src = user.photoBase64;
        foto.hidden = false;
        fotoInicial.hidden = true;
    } else if (fotoInicial) {
        fotoInicial.textContent = (user.name || "U").trim().charAt(0).toUpperCase();
        fotoInicial.hidden = false;
        if (foto) foto.hidden = true;
    }

    // Mostra só os blocos de estatística relevantes para o papel real
    // desta conta (ver nota no topo do arquivo). "person" acumula os
    // dois blocos (doador + beneficiário); "ong" só o institucional;
    // "admin" não tem nenhum bloco de impacto próprio.
    const blocoDoador = document.getElementById("perfil-doador-block");
    const blocoBeneficiario = document.getElementById("perfil-beneficiario-block");
    const blocoOng = document.getElementById("perfil-ong-block");
    const ehOng = user.role === "ong" || user.role === "institution";
    blocoDoador?.classList.toggle("hidden", ehOng || user.role === "admin");
    blocoBeneficiario?.classList.toggle("hidden", ehOng || user.role === "admin");
    blocoOng?.classList.toggle("hidden", !ehOng);

    if (window.lucide) window.lucide.createIcons();

    await renderPerfilEstatisticas(user, ehOng);
    // "Minhas Campanhas" (js/doacoes.js) só aparece para ONGs aprovadas —
    // chamado aqui também porque o listener da coleção "campanhas" só
    // reexecuta quando o banco muda, não quando o login muda de usuário.
    window.renderMinhasCampanhas?.();
}
window.renderPerfil = renderPerfil;

function zerarStats(ids) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
    });
}

async function renderPerfilEstatisticas(user, ehOng) {
    const listaAtividades = document.getElementById("perfil-atividades-lista");
    const idsPessoa = [
        "perfil-stat-doacoes", "perfil-stat-doacoes-andamento", "perfil-stat-doacoes-concluidas",
        "perfil-stat-pedidos-atendidos", "perfil-stat-campanhas-apoiadas",
        "perfil-stat-pedidos-realizados", "perfil-stat-pedidos-analise", "perfil-stat-pedidos-aprovados",
        "perfil-stat-pedidos-concluidos", "perfil-stat-doacoes-recebidas"
    ];
    const idsOng = [
        "perfil-stat-campanhas-criadas", "perfil-stat-campanhas-ativas",
        "perfil-stat-ong-pedidos-recebidos", "perfil-stat-ong-pedidos-aprovados",
        "perfil-stat-ong-doacoes-mediadas", "perfil-stat-ong-doacoes-recebidas", "perfil-stat-ong-familias"
    ];

    // Sem Firestore configurado ainda, mostra tudo zerado em vez de travar a página.
    if (!window.fb) {
        zerarStats([...idsPessoa, ...idsOng]);
        return;
    }
    const { db, firestoreSdk } = window.fb;

    async function consultar(nomeColecao, campoUsuario) {
        try {
            const q = firestoreSdk.query(firestoreSdk.collection(db, nomeColecao), firestoreSdk.where(campoUsuario, "==", user.id));
            const snap = await firestoreSdk.getDocs(q);
            return snap.docs.map((docSnap) => docSnap.data());
        } catch (error) {
            // Coleção ainda não existe ou regras do Firestore não liberam a leitura — trata como vazio.
            console.info(`[Perfil] Não foi possível consultar "${nomeColecao}" ainda (normal se o módulo de dados não estiver integrado).`, error?.message);
            return [];
        }
    }

    const setStat = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = String(valor); };
    const atividades = [];
    const registrar = (texto, data) => atividades.push({ texto, data });

    if (ehOng) {
        const [campanhas, pedidosOng, doacoesOng] = await Promise.all([
            consultar("campanhas", "ongId"),
            consultar("pedidos", "ongId"),
            consultar("doacoes", "ongId")
        ]);

        setStat("perfil-stat-campanhas-criadas", campanhas.length);
        setStat("perfil-stat-campanhas-ativas", campanhas.filter((c) => c.status === "ativa").length);
        // "Pedidos recebidos": pedidos que esta ONG já assumiu/analisou
        // (o campo "ongId" só é preenchido quando uma ONG aprova, recusa,
        // pede mais informações ou vincula um pedido — ver js/doacoes.js).
        setStat("perfil-stat-ong-pedidos-recebidos", pedidosOng.length);
        setStat("perfil-stat-ong-pedidos-aprovados", pedidosOng.filter((p) => ["vinculado", "concluido"].includes(p.status)).length);
        setStat("perfil-stat-ong-doacoes-mediadas", doacoesOng.length);
        setStat("perfil-stat-ong-doacoes-recebidas", doacoesOng.filter((d) => d.trackingStatus === "Entregue").length);
        const familias = new Set(doacoesOng.filter((d) => d.beneficiaryId).map((d) => d.beneficiaryId));
        setStat("perfil-stat-ong-familias", familias.size);

        campanhas.forEach((c) => registrar(`Campanha "${c.titulo}" publicada`, c.createdAt));
        doacoesOng.forEach((d) => registrar(`Doação mediada: ${d.itemName}`, d.createdAt));
        zerarStats(idsPessoa);
    } else if (user.role !== "admin") {
        const [minhasDoacoes, doacoesRecebidas, meusPedidos] = await Promise.all([
            consultar("doacoes", "donorId"),
            consultar("doacoes", "beneficiaryId"),
            consultar("pedidos", "solicitanteId")
        ]);

        setStat("perfil-stat-doacoes", minhasDoacoes.length);
        setStat("perfil-stat-doacoes-andamento", minhasDoacoes.filter((d) => d.trackingStatus === "Em andamento").length);
        setStat("perfil-stat-doacoes-concluidas", minhasDoacoes.filter((d) => d.trackingStatus === "Entregue").length);
        // "Pedidos que atendeu": doações minhas que acabaram vinculadas a um
        // beneficiário específico (beneficiaryId preenchido) — ou seja, que
        // de fato ajudaram alguém que precisava, e não só ficaram publicadas.
        setStat("perfil-stat-pedidos-atendidos", minhasDoacoes.filter((d) => d.beneficiaryId).length);
        const campanhasApoiadas = new Set(minhasDoacoes.filter((d) => d.campaignId).map((d) => d.campaignId));
        setStat("perfil-stat-campanhas-apoiadas", campanhasApoiadas.size);

        setStat("perfil-stat-pedidos-realizados", meusPedidos.length);
        setStat("perfil-stat-pedidos-analise", meusPedidos.filter((p) => ["pendente", "mais_info", "aprovado"].includes(p.status)).length);
        setStat("perfil-stat-pedidos-aprovados", meusPedidos.filter((p) => p.status === "vinculado").length);
        setStat("perfil-stat-pedidos-concluidos", meusPedidos.filter((p) => p.status === "concluido").length);
        setStat("perfil-stat-doacoes-recebidas", doacoesRecebidas.length);

        minhasDoacoes.forEach((d) => registrar(`Doação: ${d.itemName}`, d.createdAt));
        meusPedidos.forEach((p) => registrar(`Pedido: ${p.item}`, p.createdAt));
        zerarStats(idsOng);
    } else {
        zerarStats([...idsPessoa, ...idsOng]);
    }

    if (listaAtividades) {
        listaAtividades.innerHTML = "";
        atividades.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
        if (atividades.length === 0) {
            listaAtividades.innerHTML = '<li class="perfil-atividade-vazia">Nenhuma atividade registrada ainda.</li>';
        } else {
            atividades.slice(0, 8).forEach((atividade) => {
                const li = document.createElement("li");
                li.innerHTML = `<span class="perfil-atividade-data">${formatarDataAtividade(atividade.data)}</span><span>${atividade.texto}</span>`;
                listaAtividades.appendChild(li);
            });
        }
    }
}

function abrirEditarPerfilModal() {
    const user = window.appState?.user;
    const editarModal = document.getElementById("perfil-editar-modal");
    if (!user || !editarModal) return;
    document.getElementById("perfil-edit-nome").value = user.name || "";
    document.getElementById("perfil-edit-telefone").value = user.phone || "";
    document.getElementById("perfil-edit-endereco").value = user.address || "";
    editarModal.classList.remove("hidden");
}

document.addEventListener("includesLoaded", () => {
    // --- Editar nome / telefone / endereço ---
    const editarBtn = document.getElementById("perfil-editar-btn");
    const editarModal = document.getElementById("perfil-editar-modal");
    const editarClose = document.getElementById("perfil-editar-close-btn");
    const editarForm = document.getElementById("perfil-editar-form");

    editarBtn?.addEventListener("click", abrirEditarPerfilModal);
    if (editarClose && editarModal) {
        editarClose.addEventListener("click", () => editarModal.classList.add("hidden"));
    }
    if (editarForm) {
        editarForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const user = window.appState?.user;
            if (!user || !window.fb) return;

            const nome = document.getElementById("perfil-edit-nome").value.trim();
            const tel = document.getElementById("perfil-edit-telefone").value.trim();
            const endereco = document.getElementById("perfil-edit-endereco").value.trim();
            const V = window.PSValidacao;

            if (V && !V.validarTelefone(tel)) { window.showToast?.("Informe um celular válido com DDD.", "danger"); return; }
            if (V && !V.validarEndereco(endereco)) { window.showToast?.("Informe o endereço completo: rua, número, bairro e cidade.", "danger"); return; }

            try {
                const { db, firestoreSdk } = window.fb;
                await firestoreSdk.updateDoc(firestoreSdk.doc(db, "users", user.id), { name: nome, phone: tel, address: endereco });
                Object.assign(user, { name: nome, phone: tel, address: endereco });
                window.appState.user = user;
                window.updateUserAuthUI?.();
                renderPerfil();
                editarModal.classList.add("hidden");
                window.showToast?.("Dados atualizados com sucesso!");
            } catch (error) {
                window.showToast?.("Não foi possível salvar as alterações agora.", "danger");
            }
        });
    }

    // Máscara de telefone no formulário de edição.
    const editTelInput = document.getElementById("perfil-edit-telefone");
    if (editTelInput) {
        editTelInput.addEventListener("input", () => {
            if (window.PSValidacao) editTelInput.value = window.PSValidacao.mascaraTelefone(editTelInput.value);
        });
    }

    /* ==========================================================
       CONFIGURAÇÕES DA CONTA
       ==========================================================
       Reaproveita, sem duplicar, funcionalidade que já existe de
       verdade em outros módulos do site: o formulário de editar
       dados (acima), a central de notificações real do header
       (js/fase6-engine.js) e o botão de logout já ligado ao
       Firebase (js/auth.js). "Acessibilidade" liga, pela primeira
       vez, os dois recursos que já existiam prontos no projeto mas
       nunca tinham um botão que os chamasse: alto contraste
       (window.alternarAltoContraste, em js/app.js) e tamanho de
       fonte (window.definirTamanhoFonte, também em js/app.js).
       ========================================================== */
    const configBtn = document.getElementById("perfil-config-btn");
    const configModal = document.getElementById("perfil-config-modal");
    const configClose = document.getElementById("perfil-config-close-btn");

    function sincronizarBotoesAcessibilidade() {
        const contrasteBtn = document.getElementById("config-alto-contraste-btn");
        if (contrasteBtn) {
            const ativo = document.body.classList.contains("high-contrast");
            contrasteBtn.setAttribute("aria-pressed", String(ativo));
            contrasteBtn.innerHTML = `<i data-lucide="contrast"></i> ${ativo ? "Ativado" : "Ativar"}`;
        }
        const tamanhoAtual = localStorage.getItem("tamanhoFonte") || "md";
        document.querySelectorAll(".font-size-btn").forEach((btn) => {
            btn.setAttribute("aria-pressed", String(btn.getAttribute("data-tamanho") === tamanhoAtual));
        });
        if (window.lucide) window.lucide.createIcons();
    }

    configBtn?.addEventListener("click", () => {
        sincronizarBotoesAcessibilidade();
        configModal?.classList.remove("hidden");
    });
    configClose?.addEventListener("click", () => configModal?.classList.add("hidden"));

    document.getElementById("config-alterar-dados-btn")?.addEventListener("click", () => {
        configModal?.classList.add("hidden");
        abrirEditarPerfilModal();
    });

    document.getElementById("config-notificacoes-btn")?.addEventListener("click", () => {
        configModal?.classList.add("hidden");
        document.getElementById("notif-btn")?.click();
    });

    document.getElementById("config-sair-btn")?.addEventListener("click", () => {
        configModal?.classList.add("hidden");
        document.getElementById("logout-btn")?.click();
    });

    document.getElementById("config-alto-contraste-btn")?.addEventListener("click", () => {
        window.alternarAltoContraste?.();
        sincronizarBotoesAcessibilidade();
    });

    document.querySelectorAll(".font-size-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            window.definirTamanhoFonte?.(btn.getAttribute("data-tamanho"));
            sincronizarBotoesAcessibilidade();
        });
    });
});

function carregarFotoPerfil(usuario) {
    const imgPreview = document.getElementById("perfil-foto-preview");
    const spanInicial = document.getElementById("perfil-foto-inicial");

    if (!imgPreview || !spanInicial) return;

    // Se o usuário possui uma foto cadastrada. Campos do documento "users"
    // são sempre "photoBase64" e "name" (nunca "fotoUrl"/"nome" — ver
    // padronização em firebase-auth.js), senão a foto e a inicial nunca
    // aparecem mesmo quando o usuário já tem os dados cadastrados.
    if (usuario && usuario.photoBase64) {
        imgPreview.src = usuario.photoBase64;
        imgPreview.removeAttribute("hidden"); // Mostra a imagem
        spanInicial.setAttribute("hidden", "true"); // Esconde a inicial
    }
    // Se NÃO possui foto, mostra apenas a inicial do nome
    else {
        imgPreview.setAttribute("hidden", "true"); // Esconde a imagem
        spanInicial.textContent = (usuario?.name || "U").charAt(0).toUpperCase();
        spanInicial.removeAttribute("hidden"); // Mostra a inicial
    }
}
