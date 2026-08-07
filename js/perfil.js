/* ==========================================================
   PONTE SOLIDÁRIA — PAINEL "MEU PERFIL" (MÓDULO 2)
   ==========================================================
   Mostra foto, nome, cidade, telefone e estatísticas do
   usuário logado, lendo os dados reais gravados no Firestore
   no momento do cadastro (js/firebase-auth.js).

   Observação importante: as estatísticas de "doações feitas",
   "itens comprados" e "pedidos realizados" dependem das coleções
   de doações/brechó/pedidos estarem gravadas no Firestore. Hoje
   (ago/2026) esses módulos ainda salvam apenas no localStorage do
   navegador, então esses contadores aparecem como 0 até essa
   migração ser feita — o painel já está pronto para popular
   sozinho assim que essas coleções existirem.
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

    if (nome) nome.textContent = user.name || "—";
    if (papel) papel.textContent = nomePapel(user.role);
    if (email) email.textContent = user.email || "—";
    if (telefone) telefone.textContent = user.phone || "Não informado";
    if (cidade) cidade.textContent = extrairCidade(user.address);

    if (user.photoBase64 && foto && fotoInicial) {
        foto.src = user.photoBase64;
        foto.hidden = false;
        fotoInicial.hidden = true;
    } else if (fotoInicial) {
        fotoInicial.textContent = (user.name || "U").trim().charAt(0).toUpperCase();
        fotoInicial.hidden = false;
        if (foto) foto.hidden = true;
    }

    if (window.lucide) window.lucide.createIcons();

    await renderPerfilEstatisticas(user);
}
window.renderPerfil = renderPerfil;

async function renderPerfilEstatisticas(user) {
    const elDoacoes = document.getElementById("perfil-stat-doacoes");
    const elCompras = document.getElementById("perfil-stat-compras");
    const elPedidos = document.getElementById("perfil-stat-pedidos");
    const elCertificados = document.getElementById("perfil-stat-certificados");
    const listaAtividades = document.getElementById("perfil-atividades-lista");

    // Sem Firestore configurado (ou sem as coleções ainda), mostra tudo zerado
    // em vez de travar a página.
    if (!window.fb) {
        if (elDoacoes) elDoacoes.textContent = "0";
        if (elCompras) elCompras.textContent = "0";
        if (elPedidos) elPedidos.textContent = "0";
        if (elCertificados) elCertificados.textContent = "0";
        return;
    }

    const { db, firestoreSdk } = window.fb;
    const atividades = [];

    // Fase 1: corrigido para os nomes reais das collections/campos do
    // Firestore (conferidos em js/doacoes.js) — antes consultava
    // "donations"/"requests" com o campo "userId", que não existem;
    // por isso os contadores sempre apareciam zerados mesmo com doações
    // e pedidos reais gravados no banco.
    async function contarColecao(nomeColecao, campoUsuario, campoTexto) {
        try {
            const q = firestoreSdk.query(firestoreSdk.collection(db, nomeColecao), firestoreSdk.where(campoUsuario, "==", user.id));
            const snap = await firestoreSdk.getDocs(q);
            snap.forEach((docSnap) => {
                const dados = docSnap.data();
                atividades.push({
                    texto: dados[campoTexto] || dados.descricao || dados.title || `Atividade em ${nomeColecao}`,
                    data: dados.createdAt || dados.date || null
                });
            });
            return snap.size;
        } catch (error) {
            // Coleção ainda não existe ou regras do Firestore não liberam a leitura — trata como 0.
            console.info(`[Perfil] Não foi possível contar "${nomeColecao}" ainda (normal se o módulo de dados não estiver integrado).`, error?.message);
            return 0;
        }
    }

    const [doacoes, compras, pedidos, certificados] = await Promise.all([
        contarColecao("doacoes", "donorId", "itemName"),
        // Brechó ainda salva só no localStorage (fora do escopo desta fase) —
        // a collection "brecho_orders" não existe no Firestore ainda, então
        // isso segue retornando 0 até a migração do Módulo Brechó.
        contarColecao("brecho_orders", "buyer_id", "descricao"),
        contarColecao("pedidos", "solicitanteId", "item"),
        // Certificados (Fase futura, RSE/Empresas) — collection ainda não existe.
        contarColecao("certificates", "userId", "descricao")
    ]);

    if (elDoacoes) elDoacoes.textContent = String(doacoes);
    if (elCompras) elCompras.textContent = String(compras);
    if (elPedidos) elPedidos.textContent = String(pedidos);
    if (elCertificados) elCertificados.textContent = String(certificados);

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

document.addEventListener("includesLoaded", () => {
    // --- Upload de foto de perfil (salva como base64 no Firestore, mesma
    // abordagem já usada para as fotos do Brechó, conforme README-FIREBASE.md) ---
    const fotoInput = document.getElementById("perfil-foto-input");
    if (fotoInput) {
        fotoInput.addEventListener("change", async () => {
            const arquivo = fotoInput.files?.[0];
            const user = window.appState?.user;
            if (!arquivo || !user || !window.fb) return;
            if (arquivo.size > 1.5 * 1024 * 1024) {
                window.showToast?.("Escolha uma imagem de até 1,5 MB.", "warning");
                return;
            }
            const leitor = new FileReader();
            leitor.onload = async () => {
                const base64 = leitor.result;
                try {
                    const { db, firestoreSdk } = window.fb;
                    await firestoreSdk.updateDoc(firestoreSdk.doc(db, "users", user.id), { photoBase64: base64 });
                    user.photoBase64 = base64;
                    window.appState.user = user;
                    renderPerfil();
                    window.showToast?.("Foto de perfil atualizada!");
                } catch (error) {
                    window.showToast?.("Não foi possível salvar a foto agora.", "danger");
                }
            };
            leitor.readAsDataURL(arquivo);
        });
    }

    // --- Editar nome / telefone / endereço ---
    const editarBtn = document.getElementById("perfil-editar-btn");
    const editarModal = document.getElementById("perfil-editar-modal");
    const editarClose = document.getElementById("perfil-editar-close-btn");
    const editarForm = document.getElementById("perfil-editar-form");

    if (editarBtn && editarModal) {
        editarBtn.addEventListener("click", () => {
            const user = window.appState?.user;
            if (!user) return;
            document.getElementById("perfil-edit-nome").value = user.name || "";
            document.getElementById("perfil-edit-telefone").value = user.phone || "";
            document.getElementById("perfil-edit-endereco").value = user.address || "";
            editarModal.classList.remove("hidden");
        });
    }
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
});

function carregarFotoPerfil(usuario) {
    const imgPreview = document.getElementById("perfil-foto-preview");
    const spanInicial = document.getElementById("perfil-foto-inicial");

    if (!imgPreview || !spanInicial) return;

    // Se o usuário possui uma foto cadastrada
    if (usuario && usuario.fotoUrl) {
        imgPreview.src = usuario.fotoUrl;
        imgPreview.removeAttribute("hidden"); // Mostra a imagem
        spanInicial.setAttribute("hidden", "true"); // Esconde a inicial
    } 
    // Se NÃO possui foto, mostra apenas a inicial do nome
    else {
        imgPreview.setAttribute("hidden", "true"); // Esconde a imagem
        spanInicial.textContent = (usuario?.nome || "U").charAt(0).toUpperCase();
        spanInicial.removeAttribute("hidden"); // Mostra a inicial
    }
}