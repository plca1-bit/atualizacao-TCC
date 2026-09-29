/* ========================================================
   PONTE SOLIDÁRIA - CHAT MODULE (WhatsApp Web-Style)
   ========================================================
   Chat real entre contas: cada conversa é uma thread de verdade,
   sincronizada com o Firestore (ver js/doacoes.js — openPedidoChat
   e openDoacaoChat, que registram as entradas aqui em
   `chatConversations` antes de chamar `openChat(threadKey)`).

   Não existe nenhum contato fictício nem resposta automática
   simulada: `chatConversations` começa vazio e só recebe threads
   reais, criadas quando duas contas passam a ter algo em comum
   (doador + beneficiário depois do aceite, doador + ONG depois da
   mediação aceita, solicitante + ONG depois de um pedido aprovado).

   Conversas AGRUPADAS POR PESSOA: cada thread de verdade continua
   sendo uma subcoleção do Firestore (uma por doação/pedido), mas a
   interface mostra UMA conversa por contraparte — todas as doações e
   pedidos com a mesma pessoa aparecem juntos, na mesma janela, com um
   separador de assunto entre eles. Não existe mais aba "Histórico":
   conversas de doações/pedidos concluídos ficam na mesma conversa.

   Apagar (nada disso mexe no que a outra pessoa vê):
     • Mensagem própria → "Apagar para todos" (vira "Mensagem excluída.")
       ou "Apagar para mim".
     • Mensagem recebida → "Apagar para mim".
     • "Limpar histórico" → some todas as mensagens até agora, só para
       mim; a conversa continua na lista.
     • "Excluir conversa" → limpa o histórico e tira a conversa da minha
       lista (volta sozinha se a pessoa mandar mensagem nova).
   ======================================================== */
// Fase 8 (item 32 da revisão — "testaria muito... mensagens longas"):
// nenhum texto vindo do Firestore ou do próprio usuário (mensagem, nome de
// contato, prévia da última mensagem) passava por escape antes de entrar
// via innerHTML. Isso é XSS armazenado de verdade: bastava alguém mandar
// uma mensagem como "<img src=x onerror=alert(1)>" para o script rodar no
// navegador de quem abrisse aquela conversa depois. Toda string dinâmica
// do chat passa por escapeHtmlChat() antes de entrar no HTML.
function escapeHtmlChat(str) {
    return String(str ?? "").replace(/[&<>"']/g, (match) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[match]));
}

/* --------------------------------------------------------
   IMAGENS NO CHAT (estilo WhatsApp)
   --------------------------------------------------------
   A pessoa escolhe uma imagem no botão de anexo do rodapé; ela é
   reduzida no próprio navegador (JPEG, lado maior de até 1280 px) para
   caber com folga no limite de 1 MiB de um documento do Firestore e é
   enviada junto da mensagem (campo "image", um data URL). Nas bolhas a
   imagem aparece em miniatura; clicar abre o visualizador ampliado, que
   fecha no X, no Esc ou clicando fora da imagem.
   Imagem só existe aqui: nenhum formulário do site aceita mais anexo.
   -------------------------------------------------------- */
const CHAT_IMAGE_TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const CHAT_IMAGE_MAX_ARQUIVO = 15 * 1024 * 1024; // arquivo original
const CHAT_IMAGE_MAX_LADO = 1280;                // px, depois da redução
const CHAT_IMAGE_MAX_CHARS = 700000;             // tamanho do data URL final

// Só data URLs de imagem entram no <img> — qualquer outra coisa gravada
// no campo "image" (por alguém mexendo direto no banco) é ignorada.
const CHAT_IMAGE_REGEX = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
function imagemChatValida(src) {
    return typeof src === "string" && src.length < 1000000 && CHAT_IMAGE_REGEX.test(src);
}

let chatImagemPendente = null;   // data URL pronto para enviar
let chatImagemPreparando = false;

function carregarImagemDoArquivo(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
        img.src = url;
    });
}

async function prepararImagemChat(file) {
    const img = await carregarImagemDoArquivo(file);
    const largura = img.naturalWidth || img.width;
    const altura = img.naturalHeight || img.height;
    if (!largura || !altura) throw new Error("dimensoes");

    let escala = Math.min(1, CHAT_IMAGE_MAX_LADO / Math.max(largura, altura));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");

    // Reduz a qualidade e, se ainda for grande, as dimensões até caber.
    for (let tentativa = 0; tentativa < 6; tentativa++) {
        canvas.width = Math.max(1, Math.round(largura * escala));
        canvas.height = Math.max(1, Math.round(altura * escala));
        ctx.fillStyle = "#ffffff"; // PNG/WebP com transparência não vira preto no JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const qualidade of [0.85, 0.72, 0.6, 0.5]) {
            const dataUrl = canvas.toDataURL("image/jpeg", qualidade);
            if (dataUrl.length <= CHAT_IMAGE_MAX_CHARS && imagemChatValida(dataUrl)) return dataUrl;
        }
        escala *= 0.75;
    }
    throw new Error("tamanho");
}

function atualizarPreviaImagemChat() {
    const previa = document.getElementById("chat-image-preview");
    const previaImg = document.getElementById("chat-image-preview-img");
    if (!previa || !previaImg) return;
    if (chatImagemPendente) {
        previaImg.src = chatImagemPendente;
        previa.classList.remove("hidden");
    } else {
        previaImg.removeAttribute("src");
        previa.classList.add("hidden");
    }
}

function limparImagemPendenteChat() {
    chatImagemPendente = null;
    chatImagemPreparando = false;
    const input = document.getElementById("chat-image-input");
    if (input) input.value = "";
    atualizarPreviaImagemChat();
}

async function aoEscolherImagemChat(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;

    if (!obterGrupo(activeContact)) {
        window.showToast?.("Abra uma conversa antes de enviar uma imagem.", "warning");
        return;
    }
    if (!CHAT_IMAGE_TIPOS.includes(file.type)) {
        window.showToast?.("Escolha uma imagem JPG, PNG, WebP ou GIF.", "warning");
        return;
    }
    if (file.size > CHAT_IMAGE_MAX_ARQUIVO) {
        window.showToast?.("A imagem é muito grande (máximo 15 MB).", "warning");
        return;
    }

    const conversaAoEscolher = activeContact;
    chatImagemPreparando = true;
    try {
        const dataUrl = await prepararImagemChat(file);
        // Se a pessoa trocou de conversa enquanto a imagem era preparada,
        // descarta — nunca envia para a conversa errada.
        if (conversaAoEscolher !== activeContact) return;
        chatImagemPendente = dataUrl;
        atualizarPreviaImagemChat();
        document.getElementById("chat-input-text")?.focus();
    } catch (error) {
        console.warn("[Ponte Solidária] Falha ao preparar imagem do chat.", error);
        window.showToast?.("Não foi possível usar essa imagem. Tente outra.", "danger");
    } finally {
        chatImagemPreparando = false;
    }
}

// ----- Visualizador ampliado (lightbox) -----
let visualizadorEl = null;
let visualizadorFoco = null;

function garantirVisualizadorImagem() {
    if (visualizadorEl) return visualizadorEl;
    const el = document.createElement("div");
    el.id = "chat-image-viewer";
    el.className = "chat-image-viewer hidden";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Imagem ampliada");
    el.innerHTML = `
        <button type="button" class="chat-image-viewer-close" id="chat-image-viewer-close" aria-label="Fechar imagem">&times;</button>
        <img class="chat-image-viewer-img" id="chat-image-viewer-img" alt="Imagem enviada no chat">`;
    // Clicar fora da imagem (no fundo escuro) também fecha.
    el.addEventListener("click", (event) => {
        if (event.target === el || event.target.closest("#chat-image-viewer-close")) fecharVisualizadorImagem();
    });
    document.body.appendChild(el);
    visualizadorEl = el;
    return el;
}

function abrirVisualizadorImagem(src) {
    if (!imagemChatValida(src)) return;
    const el = garantirVisualizadorImagem();
    visualizadorFoco = document.activeElement;
    el.querySelector("#chat-image-viewer-img").src = src;
    el.classList.remove("hidden");
    document.body.classList.add("chat-image-viewer-open");
    el.querySelector("#chat-image-viewer-close").focus();
}

function fecharVisualizadorImagem() {
    if (!visualizadorEl || visualizadorEl.classList.contains("hidden")) return;
    visualizadorEl.classList.add("hidden");
    visualizadorEl.querySelector("#chat-image-viewer-img").removeAttribute("src");
    document.body.classList.remove("chat-image-viewer-open");
    if (visualizadorFoco && typeof visualizadorFoco.focus === "function") visualizadorFoco.focus();
    visualizadorFoco = null;
}

// Esc fecha o visualizador (em captura, para não fechar também a janela
// do chat ou outro modal que esteja por baixo); Tab fica preso no X.
document.addEventListener("keydown", (event) => {
    if (!visualizadorEl || visualizadorEl.classList.contains("hidden")) return;
    if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        fecharVisualizadorImagem();
    } else if (event.key === "Tab") {
        event.preventDefault();
        visualizadorEl.querySelector("#chat-image-viewer-close").focus();
    }
}, true);

let chatConversations = {};   // threadKey -> thread real (Firestore), registrada por js/doacoes.js
let activeContact = null;     // chave do GRUPO (pessoa) aberto
let chatInitialized = false;
// Thread que recebe a próxima mensagem de cada grupo (quando a pessoa
// tem mais de um assunto com a mesma contraparte).
const chatEnvioPreferido = {};

/* --------------------------------------------------------
   AGRUPAMENTO POR PESSOA
   -------------------------------------------------------- */
function chaveDoGrupo(threadKey) {
    const t = chatConversations[threadKey];
    return t && t.contactId ? `pessoa:${t.contactId}` : threadKey;
}

function mensagemVisivel(thread, m) {
    if (thread.clearedIso && m.createdAt && m.createdAt <= thread.clearedIso) return false;
    if ((thread.hiddenMsgIds || []).includes(m.id)) return false;
    return true;
}

// Monta os grupos a partir das threads. Barato (poucas conversas), então
// é recalculado a cada renderização em vez de mantido em cache.
function construirGrupos() {
    const mapa = {};
    Object.keys(chatConversations).forEach((threadKey) => {
        const gk = chaveDoGrupo(threadKey);
        (mapa[gk] = mapa[gk] || { key: gk, threadKeys: [] }).threadKeys.push(threadKey);
    });
    return Object.values(mapa).map((g) => {
        const threads = g.threadKeys.map((k) => ({ threadKey: k, thread: chatConversations[k] }));
        const messages = [];
        threads.forEach(({ threadKey, thread }) => {
            (thread.messages || []).forEach((m) => {
                if (!mensagemVisivel(thread, m)) return;
                messages.push({ ...m, threadKey, ref: `${threadKey}|${m.id}` });
            });
        });
        messages.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
        const ultimaMsg = messages[messages.length - 1] || null;
        // Atividade mais recente (inclui mensagens já apagadas para mim),
        // usada só para decidir qual thread é a "principal" do grupo.
        const porAtividade = [...threads].sort((a, b) =>
            String(b.thread.lastMessageAt || "").localeCompare(String(a.thread.lastMessageAt || "")));
        const principal = porAtividade[0].thread;
        const todasEncerradas = threads.every(({ thread }) => thread.archived);
        const abertas = threads.filter(({ thread }) => !thread.archived);
        return {
            key: g.key,
            threads,
            messages,
            ultimaMsg,
            lastMessageAt: ultimaMsg ? ultimaMsg.createdAt : "",
            contactName: principal.contactName,
            avatar: principal.avatar,
            unread: threads.reduce((soma, { thread }) => soma + (thread.unread || 0), 0),
            hiddenForMe: threads.every(({ thread }) => thread.hiddenForMe),
            todasEncerradas,
            encerradaLabel: todasEncerradas ? (porAtividade[0].thread.archivedLabel || "Conversa encerrada") : "",
            context: (abertas.length ? abertas : threads).map(({ thread }) => thread.context).join(" · ")
        };
    });
}

function obterGrupo(key) {
    if (!key) return null;
    return construirGrupos().find((g) => g.key === key) || null;
}

// Aceita tanto a chave de um grupo quanto a de uma thread (js/doacoes.js
// e a Central de Notificações abrem o chat por threadKey).
function resolverChaveDoGrupo(key) {
    if (chatConversations[key]) return chaveDoGrupo(key);
    return key;
}

function threadDeEnvio(grupo) {
    if (!grupo) return null;
    const pref = chatEnvioPreferido[grupo.key];
    if (pref && grupo.threads.some((t) => t.threadKey === pref)) return chatConversations[pref];
    const abertas = grupo.threads.filter(({ thread }) => !thread.archived);
    const base = abertas.length ? abertas : grupo.threads;
    const ordenadas = [...base].sort((a, b) =>
        String(b.thread.lastMessageAt || "").localeCompare(String(a.thread.lastMessageAt || "")));
    return ordenadas[0].thread;
}

// Lista de grupos visíveis, mais recente primeiro.
function listaOrdenada() {
    return construirGrupos()
        .filter((g) => !g.hiddenForMe)
        .sort((a, b) => String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || "")));
}

// Inicialização do Chat — chamada uma única vez a partir do evento
// "includesLoaded" (o widget só existe no DOM depois que os partials
// carregam via fetch).
function initChat() {
    if (chatInitialized) return;
    chatInitialized = true;

    const chatToggle = document.getElementById("chat-toggle-btn");
    const chatWindow = document.getElementById("chat-window");
    const chatClose = document.getElementById("chat-close-btn");
    const chatInput = document.getElementById("chat-input-form");

    chatToggle?.addEventListener("click", () => {
        const usuario = window.appState?.user;
        if (!usuario) {
            window.showToast?.("Faça login para acessar suas conversas.", "warning");
            document.getElementById("open-login-btn")?.click();
            return;
        }
        chatWindow?.classList.toggle("hidden");
        if (!chatWindow?.classList.contains("hidden")) {
            renderConversationsList();
            const atual = obterGrupo(activeContact);
            if (atual && !atual.hiddenForMe) {
                selectConversation(activeContact);
            } else {
                const first = listaOrdenada()[0];
                if (first) selectConversation(first.key); else limparPainelAtivo();
            }
        }
    });
    chatClose?.addEventListener("click", () => chatWindow?.classList.add("hidden"));
    chatInput?.addEventListener("submit", handleSendMessage);

    // Imagem no chat: botão de anexo, seletor de arquivo e prévia com X.
    document.getElementById("chat-attach-btn")?.addEventListener("click", () => {
        if (!obterGrupo(activeContact)) {
            window.showToast?.("Abra uma conversa antes de enviar uma imagem.", "warning");
            return;
        }
        document.getElementById("chat-image-input")?.click();
    });
    document.getElementById("chat-image-input")?.addEventListener("change", aoEscolherImagemChat);
    document.getElementById("chat-image-preview-remove")?.addEventListener("click", limparImagemPendenteChat);

    // Assunto que receberá a próxima mensagem (só aparece quando há mais de
    // uma doação/pedido com a mesma pessoa).
    document.getElementById("chat-thread-select")?.addEventListener("change", (event) => {
        if (activeContact) chatEnvioPreferido[activeContact] = event.target.value;
    });

    // Delegação de cliques: menus "⋯" (conversa e mensagem), seleção de
    // conversa e ações de apagar — o HTML é montado via innerHTML.
    document.addEventListener("click", (event) => {
        const convMenuBtn = event.target.closest("[data-conv-menu-toggle]");
        if (convMenuBtn) {
            event.stopPropagation();
            const menu = convMenuBtn.parentElement.querySelector(".conv-menu-dropdown");
            fecharMenusAbertos(menu);
            menu?.classList.toggle("hidden");
            return;
        }
        const clearConvBtn = event.target.closest("[data-conv-clear]");
        if (clearConvBtn) {
            event.stopPropagation();
            limparHistoricoConversa(clearConvBtn.dataset.convClear || activeContact);
            return;
        }
        const hideConvBtn = event.target.closest("[data-conv-hide]");
        if (hideConvBtn) {
            event.stopPropagation();
            excluirConversaParaMim(hideConvBtn.dataset.convHide || activeContact);
            return;
        }

        const imagemBtn = event.target.closest("[data-msg-image]");
        if (imagemBtn) {
            const msg = obterGrupo(activeContact)?.messages.find((m) => m.ref === imagemBtn.dataset.msgImage);
            if (msg && !msg.deleted) abrirVisualizadorImagem(msg.image);
            return;
        }

        const msgMenuBtn = event.target.closest("[data-msg-menu-toggle]");
        if (msgMenuBtn) {
            event.stopPropagation();
            const menu = msgMenuBtn.parentElement.querySelector(".msg-menu-dropdown");
            fecharMenusAbertos(menu);
            menu?.classList.toggle("hidden");
            return;
        }
        const deleteMsgBtn = event.target.closest("[data-msg-delete]");
        if (deleteMsgBtn) {
            event.stopPropagation();
            excluirMensagem(deleteMsgBtn.dataset.msgDelete, true);
            return;
        }
        const deleteMsgMeBtn = event.target.closest("[data-msg-delete-me]");
        if (deleteMsgMeBtn) {
            event.stopPropagation();
            excluirMensagem(deleteMsgMeBtn.dataset.msgDeleteMe, false);
            return;
        }

        const contatoEl = event.target.closest(".contact-item[data-contact]");
        if (contatoEl && !event.target.closest(".conv-menu")) {
            selectConversation(contatoEl.dataset.contact);
            return;
        }

        // Clique fora de qualquer menu "⋯" fecha todos os que estiverem abertos.
        if (!event.target.closest(".conv-menu-dropdown, .msg-menu-dropdown")) {
            fecharMenusAbertos(null);
        }
    });
}

function fecharMenusAbertos(exceto) {
    document.querySelectorAll(".conv-menu-dropdown, .msg-menu-dropdown").forEach((el) => {
        if (el !== exceto) el.classList.add("hidden");
    });
}

// Renderiza a lista de conversas na sidebar (lado esquerdo): UMA entrada
// por pessoa, independentemente de quantas doações/pedidos existam com ela.
function renderConversationsList() {
    const sidebar = document.getElementById("chat-sidebar-contacts");
    const grupos = listaOrdenada();
    atualizarBadgeGlobal(grupos.reduce((soma, g) => soma + (g.unread || 0), 0));
    // Mantém o seletor de assunto da conversa aberta em dia (novas doações/pedidos).
    const ativo = grupos.find((g) => g.key === activeContact);
    if (ativo) atualizarSeletorDeAssunto(ativo);
    if (!sidebar) return;

    if (!grupos.length) {
        sidebar.innerHTML = `
            <div class="chat-empty-state" style="padding: 20px; text-align: center; color: var(--color-text-muted); font-size: 0.82rem;">
                Nenhuma conversa ainda.<br>Quando uma doação ou pedido tiver as duas partes combinadas, o chat abre aqui automaticamente.
            </div>`;
        return;
    }

    sidebar.innerHTML = grupos.map((chat) => {
        const lastMsg = chat.ultimaMsg;
        const lastText = lastMsg
            ? (lastMsg.deleted ? "Mensagem excluída."
                : (imagemChatValida(lastMsg.image) ? (lastMsg.text ? `📷 ${lastMsg.text}` : "📷 Foto") : lastMsg.text))
            : "Envie a primeira mensagem";
        const isActive = chat.key === activeContact ? "active" : "";
        const horario = lastMsg?.time || "";
        const naoLidas = chat.unread > 0
            ? `<span class="conv-unread-badge">${chat.unread > 9 ? "9+" : chat.unread}</span>` : "";
        const tagArquivada = chat.todasEncerradas
            ? `<span class="conv-archived-tag">${escapeHtmlChat(chat.encerradaLabel)}</span>` : "";
        return `
            <div class="contact-item ${isActive} ${chat.unread ? "unread" : ""}" data-contact="${escapeHtmlChat(chat.key)}">
                <div class="contact-avatar">${escapeHtmlChat(chat.avatar)}</div>
                <div class="contact-details" style="flex-grow: 1; overflow: hidden;">
                    <div class="contact-item-top-row">
                        <span class="contact-name">${escapeHtmlChat(chat.contactName)}</span>
                        <span class="contact-time">${escapeHtmlChat(horario)}</span>
                    </div>
                    <p class="contact-context">${escapeHtmlChat(chat.context)}</p>
                    <div class="contact-item-bottom-row">
                        <p class="contact-last-msg">${escapeHtmlChat(lastText)}</p>
                        ${naoLidas}
                    </div>
                    ${tagArquivada}
                </div>
                <div class="conv-menu">
                    <button type="button" class="conv-menu-toggle" data-conv-menu-toggle aria-label="Mais opções desta conversa">⋯</button>
                    <div class="conv-menu-dropdown hidden">
                        <button type="button" data-conv-clear="${escapeHtmlChat(chat.key)}">Limpar histórico</button>
                        <button type="button" data-conv-hide="${escapeHtmlChat(chat.key)}">Excluir conversa</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function atualizarBadgeGlobal(total) {
    const badge = document.getElementById("chat-notif-badge");
    if (!badge) return;
    if (total > 0) {
        badge.textContent = total > 9 ? "9+" : String(total);
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function limparPainelAtivo() {
    activeContact = null;
    const body = document.getElementById("chat-body-messages");
    if (body) body.innerHTML = "";
    const nome = document.getElementById("chat-active-name");
    if (nome) nome.textContent = "Selecione uma conversa";
    const avatar = document.getElementById("chat-active-avatar");
    if (avatar) avatar.textContent = "?";
    const status = document.getElementById("chat-active-status");
    if (status) { status.textContent = ""; status.className = "status-indicator"; }
    atualizarSeletorDeAssunto(null);
}

// Seleciona e carrega uma conversa (pessoa). Aceita chave de grupo ou de thread.
function selectConversation(key) {
    const eraThread = !!chatConversations[key];
    const groupKey = resolverChaveDoGrupo(key);
    const grupo = obterGrupo(groupKey);
    if (!grupo) return;
    // Abrir por uma doação/pedido específico faz dele o assunto padrão de envio.
    if (eraThread) chatEnvioPreferido[groupKey] = key;
    // Imagem escolhida mas ainda não enviada pertence à conversa anterior.
    if (activeContact !== groupKey) limparImagemPendenteChat();
    activeContact = groupKey;
    fecharMenusAbertos(null);
    document.querySelectorAll(".contact-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.contact === groupKey);
    });
    const headerAvatar = document.getElementById("chat-active-avatar");
    const headerName = document.getElementById("chat-active-name");
    const headerStatus = document.getElementById("chat-active-status");
    if (headerAvatar) headerAvatar.textContent = grupo.avatar;
    if (headerName) headerName.textContent = grupo.contactName;
    if (headerStatus) {
        // Não simulamos presença (online/digitando): mostramos os assuntos.
        headerStatus.className = grupo.todasEncerradas ? "status-indicator archived" : "status-indicator online";
        headerStatus.textContent = grupo.todasEncerradas ? `${grupo.context} · ${grupo.encerradaLabel}` : grupo.context;
    }
    atualizarSeletorDeAssunto(grupo);
    renderActiveMessages();
    // Marca como lida ao abrir, em todas as threads da pessoa.
    grupo.threads.forEach(({ thread }) => thread.markRead?.());
}

function atualizarSeletorDeAssunto(grupo) {
    const select = document.getElementById("chat-thread-select");
    const wrap = document.getElementById("chat-thread-select-wrap");
    if (!select || !wrap) return;
    if (!grupo || grupo.threads.length < 2) {
        wrap.classList.add("hidden");
        select.innerHTML = "";
        return;
    }
    const atual = threadDeEnvio(grupo);
    const atualKey = grupo.threads.find(({ thread }) => thread === atual)?.threadKey;
    select.innerHTML = grupo.threads.map(({ threadKey, thread }) =>
        `<option value="${escapeHtmlChat(threadKey)}"${threadKey === atualKey ? " selected" : ""}>${escapeHtmlChat(thread.context)}${thread.archived ? " (encerrado)" : ""}</option>`
    ).join("");
    wrap.classList.remove("hidden");
}

// Renderiza as mensagens da conversa selecionada (todas as threads da pessoa)
function renderActiveMessages() {
    const chatBody = document.getElementById("chat-body-messages");
    if (!chatBody) return;
    const grupo = obterGrupo(activeContact);
    if (!grupo) { chatBody.innerHTML = ""; return; }
    const varios = grupo.threads.length > 1;
    let threadAnterior = null;
    chatBody.innerHTML = grupo.messages.length
        ? grupo.messages.map((msg) => {
            let divisor = "";
            if (varios && msg.threadKey !== threadAnterior) {
                const t = chatConversations[msg.threadKey];
                divisor = `<div class="chat-thread-divider"><span>${escapeHtmlChat(t.context)}${t.archived ? ` · ${escapeHtmlChat(t.archivedLabel || "encerrado")}` : ""}</span></div>`;
            }
            threadAnterior = msg.threadKey;
            const ref = escapeHtmlChat(msg.ref);
            if (msg.deleted) {
                return `${divisor}
                    <div class="message ${msg.sender} deleted">
                        <div class="msg-menu">
                            <button type="button" class="msg-menu-toggle" data-msg-menu-toggle aria-label="Mais opções desta mensagem">⋯</button>
                            <div class="msg-menu-dropdown hidden">
                                <button type="button" data-msg-delete-me="${ref}">Apagar para mim</button>
                            </div>
                        </div>
                        <span><em>Mensagem excluída.</em></span>
                        <span class="message-time">${escapeHtmlChat(msg.time)}</span>
                    </div>`;
            }
            // Mensagem própria: apagar para todos ou só para mim.
            // Mensagem recebida: só "apagar para mim" (nunca some para a outra pessoa).
            const menu = `
                    <div class="msg-menu">
                        <button type="button" class="msg-menu-toggle" data-msg-menu-toggle aria-label="Mais opções desta mensagem">⋯</button>
                        <div class="msg-menu-dropdown hidden">
                            ${msg.sender === "sent" ? `<button type="button" data-msg-delete="${ref}">Apagar para todos</button>` : ""}
                            <button type="button" data-msg-delete-me="${ref}">Apagar para mim</button>
                        </div>
                    </div>`;
            const temImagem = imagemChatValida(msg.image);
            const imagem = temImagem ? `
                    <button type="button" class="message-image-btn" data-msg-image="${ref}" aria-label="Ampliar imagem">
                        <img class="message-image" src="${msg.image}" alt="Imagem enviada no chat" loading="lazy">
                    </button>` : "";
            const texto = msg.text ? `<span class="message-text">${escapeHtmlChat(msg.text)}</span>` : "";
            return `${divisor}
                <div class="message ${msg.sender}${temImagem ? " has-image" : ""}">
                    ${menu}
                    ${imagem}
                    ${texto}
                    <span class="message-time">${escapeHtmlChat(msg.time)}</span>
                </div>
            `;
        }).join("")
        : `<div class="chat-empty-state" style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 0.82rem;">Envie a primeira mensagem para combinar os detalhes.</div>`;
    atualizarSeletorDeAssunto(grupo);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
}

// Trata o envio de uma mensagem — sempre grava no Firestore, na thread
// (doação/pedido) escolhida para esta pessoa.
function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById("chat-input-text");
    if (!input) return;
    const text = input.value.trim();
    const image = chatImagemPendente;
    if (!text && !image) {
        if (chatImagemPreparando) window.showToast?.("Aguarde, a imagem está sendo preparada.", "info");
        return;
    }
    const thread = threadDeEnvio(obterGrupo(activeContact));
    if (!thread || typeof thread.send !== "function") {
        window.showToast?.("Não foi possível enviar: conversa indisponível.", "danger");
        return;
    }
    input.value = "";
    limparImagemPendenteChat();
    thread.send(text, image);
}

// Apagar mensagem. paraTodos=true: só a PRÓPRIA mensagem (a regra em
// firestore.rules garante isso de novo, independente da interface);
// paraTodos=false: esconde só para mim, inclusive mensagens recebidas.
function excluirMensagem(ref, paraTodos) {
    const [threadKey, ...resto] = String(ref).split("|");
    const messageId = resto.join("|");
    const thread = chatConversations[threadKey];
    fecharMenusAbertos(null);
    if (!thread) return;
    if (paraTodos) {
        if (typeof thread.deleteMessage !== "function") return;
        thread.deleteMessage(messageId);
        window.showToast?.("Mensagem apagada para todos.", "info");
    } else {
        if (typeof thread.deleteForMe !== "function") return;
        thread.deleteForMe(messageId);
        window.showToast?.("Mensagem apagada para você.", "info");
        renderActiveMessages();
        renderConversationsList();
    }
}

// "Limpar histórico": some com todas as mensagens até agora, só para
// mim — a conversa continua na lista e a outra pessoa não é afetada.
function limparHistoricoConversa(key) {
    const grupo = obterGrupo(key);
    fecharMenusAbertos(null);
    if (!grupo) return;
    if (!window.confirm(`Limpar todo o histórico da conversa com ${grupo.contactName}? As mensagens somem só para você.`)) return;
    grupo.threads.forEach(({ thread }) => thread.clearHistory?.());
    window.showToast?.("Histórico limpo.", "info");
    if (activeContact === grupo.key) renderActiveMessages();
    renderConversationsList();
}

// "Excluir conversa": limpa o histórico e tira a pessoa da MINHA lista.
// Volta sozinha se ela mandar mensagem nova.
function excluirConversaParaMim(key) {
    const grupo = obterGrupo(key);
    fecharMenusAbertos(null);
    if (!grupo) return;
    if (!window.confirm(`Excluir a conversa com ${grupo.contactName}? Ela some da sua lista, junto com o histórico.`)) return;
    grupo.threads.forEach(({ thread }) => thread.hideForMe?.());
    window.showToast?.("Conversa excluída da sua lista.", "info");
    if (activeContact === grupo.key) {
        const proxima = listaOrdenada().find((g) => g.key !== grupo.key);
        if (proxima) selectConversation(proxima.key); else limparPainelAtivo();
    }
    renderConversationsList();
}

// Abre o chat em uma conversa específica (aceita a chave de uma thread).
// As conversas são sempre registradas antes por js/doacoes.js.
function openChat(key) {
    if (!chatConversations[key] && !obterGrupo(key)) {
        window.showToast?.("Não foi possível abrir esta conversa agora.", "warning");
        return;
    }
    // Se a pessoa tinha apagado a conversa da lista, abrir de novo por uma
    // doação/pedido traz a conversa de volta.
    const thread = chatConversations[key];
    if (thread?.hiddenForMe) {
        obterGrupo(resolverChaveDoGrupo(key))?.threads.forEach(({ thread: t }) => t.unhide?.());
    }
    document.getElementById("chat-window")?.classList.remove("hidden");
    renderConversationsList();
    selectConversation(key);
}

// Notificações flutuantes no chat (badge de mensagens não lidas). O número
// exibido é sempre recalculado a partir da soma das não lidas.
function acrescentarNotificacaoChat() {
    window.showToast?.("Você tem uma nova mensagem no chat!", "info");
    renderConversationsList();
}

// Limpa todas as conversas e threads ativas (chamado no logout, para
// não vazar conversas de uma conta para a próxima, no mesmo navegador).
function limparChatDoUsuario() {
    Object.keys(chatConversations).forEach((key) => delete chatConversations[key]);
    Object.keys(chatEnvioPreferido).forEach((key) => delete chatEnvioPreferido[key]);
    activeContact = null;
    limparImagemPendenteChat();
    fecharVisualizadorImagem();
    document.getElementById("chat-window")?.classList.add("hidden");
    document.getElementById("chat-widget-container")?.classList.add("hidden");
    renderConversationsList();
}

document.addEventListener("includesLoaded", initChat);

// Compatibilidade com os scripts carregados via SPA
window.openChat = openChat;
window.initChat = initChat;
window.selectConversation = selectConversation;
window.limparChatDoUsuario = limparChatDoUsuario;
window.acrescentarNotificacaoChat = acrescentarNotificacaoChat;
// Usados por js/doacoes.js para repintar o chat quando uma nova
// mensagem chega em tempo real (onSnapshot) numa conversa real.
window.renderActiveMessages = renderActiveMessages;
window.renderConversationsList = renderConversationsList;
window.getActiveContact = () => activeContact;
// A thread (doação/pedido) pertence à conversa que está aberta agora?
window.isThreadActive = (threadKey) => !!activeContact && !!chatConversations[threadKey] && chaveDoGrupo(threadKey) === activeContact;
window.chatConversations = chatConversations;
