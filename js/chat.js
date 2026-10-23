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
   interface mostra UMA conversa por contraparte, com um separador de
   assunto entre as doações/pedidos.

   Comportamento de aplicativo de mensagens:
     • Bolhas verdes (enviadas) e brancas (recebidas), com horário,
       separador de dia (Hoje/Ontem) e marcas de envio: 🕓 enviando,
       ✓ enviada, ✓✓ azul = a outra pessoa já abriu a conversa.
     • Imagens aparecem direto na bolha para quem envia e para quem
       recebe; clicar abre o visualizador ampliado (X, Esc, clique fora).
     • Aviso de mensagem nova: balão de pré-visualização sobre o botão do
       chat, número de não lidas, contador no título da aba, som discreto
       e notificação do sistema quando a aba está em segundo plano.
     • Uma mensagem só conta como lida se a conversa está de fato na
       tela (janela aberta, aba visível).
     • A lista de mensagens é atualizada por diferença: imagens já
       carregadas não "piscam" e a rolagem não pula quando alguém lê o
       histórico.
   Apagar (nada disso mexe no que a outra pessoa vê):
     • Mensagem própria → "Apagar para todos" ou "Apagar para mim".
     • Mensagem recebida → "Apagar para mim".
     • "Limpar histórico" e "Excluir conversa" (só para mim; a conversa
       volta sozinha se a pessoa mandar mensagem nova).
   ======================================================== */

// Toda string dinâmica do chat passa por escapeHtmlChat() antes de entrar
// no HTML (mensagem, nome de contato, prévia) — evita XSS armazenado.
function escapeHtmlChat(str) {
    return String(str ?? "").replace(/[&<>"']/g, (match) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[match]));
}

/* --------------------------------------------------------
   IMAGENS NO CHAT
   --------------------------------------------------------
   A imagem é reduzida no navegador (JPEG, lado maior até 1280 px) para
   caber no limite de 1 MiB de um documento do Firestore e é enviada
   junto da mensagem (campo "image", data URL) com as dimensões
   (imageW/imageH) para a bolha já reservar o espaço certo.
   -------------------------------------------------------- */
const CHAT_IMAGE_MAX_ARQUIVO = 25 * 1024 * 1024;
const CHAT_IMAGE_MAX_LADO = 1280;
const CHAT_IMAGE_MAX_CHARS = 700000;

const CHAT_IMAGE_REGEX = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
function imagemChatValida(src) {
    return typeof src === "string" && src.length < 1000000 && CHAT_IMAGE_REGEX.test(src);
}

let chatImagemPendente = null;
let chatImagemDims = null;
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

    for (let tentativa = 0; tentativa < 7; tentativa++) {
        canvas.width = Math.max(1, Math.round(largura * escala));
        canvas.height = Math.max(1, Math.round(altura * escala));
        ctx.fillStyle = "#ffffff"; // PNG/WebP transparente não vira preto no JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const qualidade of [0.85, 0.72, 0.6, 0.5, 0.4]) {
            const dataUrl = canvas.toDataURL("image/jpeg", qualidade);
            if (dataUrl.length <= CHAT_IMAGE_MAX_CHARS && imagemChatValida(dataUrl)) {
                return { dataUrl, w: canvas.width, h: canvas.height };
            }
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
    chatImagemDims = null;
    chatImagemPreparando = false;
    const input = document.getElementById("chat-image-input");
    if (input) input.value = "";
    atualizarPreviaImagemChat();
}

async function aoEscolherImagemChat(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (!obterGrupo(activeContact)) {
        window.showToast?.("Abra uma conversa antes de enviar uma imagem.", "warning");
        return;
    }
    if (file.type && !file.type.startsWith("image/")) {
        window.showToast?.("Escolha um arquivo de imagem (JPG, PNG, WebP ou GIF).", "warning");
        return;
    }
    if (file.size > CHAT_IMAGE_MAX_ARQUIVO) {
        window.showToast?.("A imagem é muito grande (máximo 25 MB).", "warning");
        return;
    }

    const conversaAoEscolher = activeContact;
    chatImagemPreparando = true;
    try {
        const pronta = await prepararImagemChat(file);
        // Trocou de conversa enquanto a imagem era preparada: descarta.
        if (conversaAoEscolher !== activeContact) return;
        chatImagemPendente = pronta.dataUrl;
        chatImagemDims = { w: pronta.w, h: pronta.h };
        atualizarPreviaImagemChat();
        document.getElementById("chat-input-text")?.focus();
    } catch (error) {
        console.warn("[Ponte Solidária] Falha ao preparar imagem do chat.", error);
        window.showToast?.("Não foi possível usar essa imagem. Tente outra (JPG, PNG ou WebP).", "danger");
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
        <img class="chat-image-viewer-img" id="chat-image-viewer-img" alt="Imagem enviada no chat">
        <a class="chat-image-viewer-download" id="chat-image-viewer-download" download="imagem-ponte-solidaria.jpg">Baixar imagem</a>`;
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
    el.querySelector("#chat-image-viewer-download").href = src;
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

function visualizadorAberto() {
    return !!visualizadorEl && !visualizadorEl.classList.contains("hidden");
}

document.addEventListener("keydown", (event) => {
    if (!visualizadorAberto()) return;
    if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        fecharVisualizadorImagem();
    } else if (event.key === "Tab") {
        event.preventDefault();
        visualizadorEl.querySelector("#chat-image-viewer-close").focus();
    }
}, true);

/* --------------------------------------------------------
   ESTADO
   -------------------------------------------------------- */
let chatConversations = {};   // threadKey -> thread real (Firestore), registrada por js/doacoes.js
let activeContact = null;     // chave do GRUPO (pessoa) aberto
let chatInitialized = false;
const chatEnvioPreferido = {};
let forcarRolagemFundo = false;
let renderEstado = { grupo: null, chaves: new Set() };

function janelaChatAberta() {
    const w = document.getElementById("chat-window");
    return !!w && !w.classList.contains("hidden");
}
function telaPequena() {
    return window.matchMedia?.("(max-width: 640px)").matches || false;
}
// A conversa está REALMENTE diante dos olhos da pessoa? (janela aberta,
// aba visível e, no celular, painel da conversa — não a lista — aberto).
function conversaNaTela() {
    if (!janelaChatAberta() || document.hidden) return false;
    if (telaPequena() && !document.getElementById("chat-window")?.classList.contains("mobile-conv")) return false;
    return true;
}

/* --------------------------------------------------------
   DATAS E HORÁRIOS
   -------------------------------------------------------- */
function dataLocal(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
}
function formatarHora(iso) {
    const d = dataLocal(iso);
    return d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
}
function mesmoDia(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function rotuloDoDia(iso) {
    const d = dataLocal(iso);
    if (!d) return "";
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    if (mesmoDia(d, hoje)) return "Hoje";
    if (mesmoDia(d, ontem)) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function rotuloCurtoLista(iso) {
    const d = dataLocal(iso);
    if (!d) return "";
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    if (mesmoDia(d, hoje)) return formatarHora(iso);
    if (mesmoDia(d, ontem)) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

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
                messages.push({ ...m, threadKey, ref: `${threadKey}|${m.id}`, contactReadIso: thread.contactLastReadIso || "" });
            });
        });
        messages.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
        const ultimaMsg = messages[messages.length - 1] || null;
        const porAtividade = [...threads].sort((a, b) =>
            String(b.thread.lastMessageAt || b.thread.openedAt || "").localeCompare(String(a.thread.lastMessageAt || a.thread.openedAt || "")));
        const principal = porAtividade[0].thread;
        const todasEncerradas = threads.every(({ thread }) => thread.archived);
        const abertas = threads.filter(({ thread }) => !thread.archived);
        const aberturaMaisRecente = threads.reduce((mx, { thread }) => (thread.openedAt || "") > mx ? thread.openedAt : mx, "");
        return {
            key: g.key,
            threads,
            messages,
            ultimaMsg,
            // Conversa recém-liberada (ainda sem mensagens) sobe pro topo pela data de abertura.
            ordem: ultimaMsg ? (ultimaMsg.createdAt > aberturaMaisRecente ? ultimaMsg.createdAt : aberturaMaisRecente) : aberturaMaisRecente,
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
        String(b.thread.lastMessageAt || b.thread.openedAt || "").localeCompare(String(a.thread.lastMessageAt || a.thread.openedAt || "")));
    return ordenadas[0].thread;
}

function listaOrdenada() {
    return construirGrupos()
        .filter((g) => !g.hiddenForMe)
        .sort((a, b) => String(b.ordem || "").localeCompare(String(a.ordem || "")));
}

/* --------------------------------------------------------
   AVISOS: título da aba, som, balão e notificação do sistema
   -------------------------------------------------------- */
function tituloBase() {
    return document.title.replace(/^\(\d+\+?\)\s/, "");
}
function atualizarTituloAba(total) {
    const base = tituloBase();
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
}

let audioCtx = null;
function destravarAudio() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = audioCtx || new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { /* sem som, tudo bem */ }
}
["click", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, destravarAudio, { passive: true }));

function tocarSomMensagem() {
    try {
        if (!audioCtx || audioCtx.state !== "running") return;
        const t0 = audioCtx.currentTime;
        [[880, 0], [1175, 0.11]].forEach(([freq, atraso]) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t0 + atraso);
            gain.gain.exponentialRampToValueAtTime(0.06, t0 + atraso + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + atraso + 0.2);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t0 + atraso);
            osc.stop(t0 + atraso + 0.22);
        });
    } catch (e) { /* ignora */ }
}

function pedirPermissaoNotificacaoSistema() {
    try {
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch (e) { /* ignora */ }
}
function notificarSistema(titulo, corpo, threadKey) {
    try {
        if (!("Notification" in window) || Notification.permission !== "granted" || !document.hidden) return;
        const n = new Notification(titulo, { body: corpo, tag: `ps-chat-${threadKey}` });
        n.onclick = () => { window.focus(); openChat(threadKey); n.close(); };
    } catch (e) { /* ignora */ }
}

let popupTimer = null;
let popupContagem = 0;
function mostrarPopupChat({ titulo, texto, threadKey }) {
    const container = document.getElementById("chat-widget-container");
    if (!container) return;
    let popup = document.getElementById("chat-popup");
    if (!popup) {
        popup = document.createElement("button");
        popup.type = "button";
        popup.id = "chat-popup";
        popup.className = "chat-popup hidden";
        popup.addEventListener("click", () => {
            const chave = popup.dataset.thread;
            esconderPopupChat();
            if (chave) openChat(chave);
        });
        container.appendChild(popup);
    }
    popupContagem = popup.classList.contains("hidden") || popup.dataset.thread !== threadKey ? 1 : popupContagem + 1;
    popup.dataset.thread = threadKey || "";
    popup.innerHTML = `<strong>${escapeHtmlChat(titulo)}</strong><span>${escapeHtmlChat(texto)}</span>${popupContagem > 1 ? `<em>+${popupContagem - 1} nova(s)</em>` : ""}`;
    popup.classList.remove("hidden");
    clearTimeout(popupTimer);
    popupTimer = setTimeout(esconderPopupChat, 8000);
}
function esconderPopupChat() {
    clearTimeout(popupTimer);
    document.getElementById("chat-popup")?.classList.add("hidden");
    popupContagem = 0;
}

function previaDeMensagem(m) {
    if (!m) return "";
    if (m.deleted) return "Mensagem excluída.";
    if (imagemChatValida(m.image)) return m.text ? `📷 ${m.text}` : "📷 Foto";
    return m.text || "";
}

// Chamado por js/doacoes.js quando chega mensagem nova numa conversa que
// NÃO está diante dos olhos da pessoa.
function alertarMensagemChat({ threadKey, senderName, text, image }) {
    const previa = previaDeMensagem({ text, image });
    const nome = senderName || chatConversations[threadKey]?.contactName || "Nova mensagem";
    if (!janelaChatAberta()) mostrarPopupChat({ titulo: nome, texto: previa, threadKey });
    tocarSomMensagem();
    notificarSistema(nome, previa, threadKey);
    renderConversationsList();
}
// Compatibilidade com chamadas antigas (sem detalhes).
function acrescentarNotificacaoChat() {
    tocarSomMensagem();
    renderConversationsList();
}

// Chamado por js/doacoes.js quando uma conversa NOVA é liberada em tempo
// real (alguém aceitou doar / a ONG aceitou mediar etc.).
function avisarNovaConversa(threadKey) {
    setTimeout(() => {
        const t = chatConversations[threadKey];
        if (!t) return;
        renderConversationsList();
        if (janelaChatAberta()) { tocarSomMensagem(); return; }
        mostrarPopupChat({ titulo: "Conversa liberada", texto: `Você já pode conversar com ${t.contactName} (${t.context}).`, threadKey });
        tocarSomMensagem();
        notificarSistema("Conversa liberada", `Você já pode conversar com ${t.contactName}.`, threadKey);
    }, 2500);
}

/* --------------------------------------------------------
   INICIALIZAÇÃO
   -------------------------------------------------------- */
function fecharJanelaChat() {
    document.getElementById("chat-window")?.classList.add("hidden");
    fecharMenusAbertos(null);
}

function marcarConversaAbertaComoLida() {
    const grupo = obterGrupo(activeContact);
    if (grupo && conversaNaTela()) grupo.threads.forEach(({ thread }) => thread.markRead?.());
}

function initChat() {
    if (chatInitialized) return;
    chatInitialized = true;

    const chatToggle = document.getElementById("chat-toggle-btn");
    const chatWindow = document.getElementById("chat-window");
    const chatInput = document.getElementById("chat-input-form");

    chatToggle?.addEventListener("click", () => {
        const usuario = window.appState?.user;
        if (!usuario) {
            window.showToast?.("Faça login para acessar suas conversas.", "warning");
            document.getElementById("open-login-btn")?.click();
            return;
        }
        pedirPermissaoNotificacaoSistema();
        esconderPopupChat();
        chatWindow?.classList.toggle("hidden");
        if (!chatWindow?.classList.contains("hidden")) {
            renderConversationsList();
            const atual = obterGrupo(activeContact);
            if (atual && !atual.hiddenForMe && !telaPequena()) {
                selectConversation(activeContact);
            } else if (!telaPequena()) {
                const primeira = listaOrdenada()[0];
                if (primeira) selectConversation(primeira.key); else limparPainelAtivo();
            } else {
                chatWindow.classList.remove("mobile-conv"); // celular: abre na lista
            }
        }
    });
    document.getElementById("chat-close-btn")?.addEventListener("click", fecharJanelaChat);
    document.getElementById("chat-sidebar-close")?.addEventListener("click", fecharJanelaChat);
    document.getElementById("chat-back-btn")?.addEventListener("click", () => {
        chatWindow?.classList.remove("mobile-conv");
        renderConversationsList();
    });
    chatInput?.addEventListener("submit", handleSendMessage);

    document.getElementById("chat-attach-btn")?.addEventListener("click", () => {
        if (!obterGrupo(activeContact)) {
            window.showToast?.("Abra uma conversa antes de enviar uma imagem.", "warning");
            return;
        }
        document.getElementById("chat-image-input")?.click();
    });
    document.getElementById("chat-image-input")?.addEventListener("change", aoEscolherImagemChat);
    document.getElementById("chat-image-preview-remove")?.addEventListener("click", limparImagemPendenteChat);

    document.getElementById("chat-thread-select")?.addEventListener("change", (event) => {
        if (activeContact) chatEnvioPreferido[activeContact] = event.target.value;
    });

    // Rolagem: lembra se a pessoa está no fim (para não "puxar" a tela
    // enquanto ela lê o histórico) e mostra o botão "ir para o fim".
    const corpo = document.getElementById("chat-body-messages");
    corpo?.addEventListener("scroll", () => {
        if (estaNoFim(corpo)) { corpo.dataset.colado = "1"; esconderBotaoFim(); }
        else { corpo.dataset.colado = "0"; document.getElementById("chat-scroll-bottom")?.classList.remove("hidden"); }
    }, { passive: true });
    // Imagem que termina de carregar muda a altura: se estava no fim, continua no fim.
    corpo?.addEventListener("load", () => { if (corpo.dataset.colado === "1") irParaOFim(false); }, true);
    document.getElementById("chat-scroll-bottom")?.addEventListener("click", () => irParaOFim(true));

    document.addEventListener("keydown", (event) => {
        const itemLista = event.target.closest?.(".contact-item[data-contact]");
        if (itemLista && (event.key === "Enter" || event.key === " ") && event.target === itemLista) {
            event.preventDefault();
            selectConversation(itemLista.dataset.contact);
            return;
        }
        if (event.key === "Escape" && !visualizadorAberto() && janelaChatAberta()) {
            const menuAberto = document.querySelector(".conv-menu-dropdown:not(.hidden), .msg-menu-dropdown:not(.hidden)");
            if (menuAberto) fecharMenusAbertos(null); else fecharJanelaChat();
        }
    });
    // Voltou para a aba: o que estava na tela passa a contar como lido.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) { esconderPopupChat(); marcarConversaAbertaComoLida(); renderConversationsList(); }
    });
    window.addEventListener("focus", marcarConversaAbertaComoLida);

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

function estaNoFim(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}
function esconderBotaoFim() {
    document.getElementById("chat-scroll-bottom")?.classList.add("hidden");
    document.getElementById("chat-scroll-bottom-count")?.classList.add("hidden");
    const c = document.getElementById("chat-scroll-bottom-count");
    if (c) c.textContent = "0";
}
function irParaOFim(suave) {
    const corpo = document.getElementById("chat-body-messages");
    if (!corpo) return;
    corpo.dataset.colado = "1";
    corpo.scrollTo({ top: corpo.scrollHeight, behavior: suave ? "smooth" : "auto" });
    esconderBotaoFim();
}

/* --------------------------------------------------------
   LISTA DE CONVERSAS (lado esquerdo)
   -------------------------------------------------------- */
function renderConversationsList() {
    const sidebar = document.getElementById("chat-sidebar-contacts");
    const grupos = listaOrdenada();
    const totalNaoLidas = grupos.reduce((soma, g) => soma + (g.unread || 0), 0);
    atualizarBadgeGlobal(totalNaoLidas);
    const ativo = grupos.find((g) => g.key === activeContact);
    if (ativo) atualizarSeletorDeAssunto(ativo);
    if (!sidebar) return;

    if (!grupos.length) {
        sidebar.innerHTML = `
            <div class="chat-empty-state chat-empty-list">
                Nenhuma conversa ainda.<br>Quando uma doação ou pedido tiver as duas partes combinadas, o chat abre aqui automaticamente.
            </div>`;
        return;
    }

    sidebar.innerHTML = grupos.map((chat) => {
        const lastMsg = chat.ultimaMsg;
        let lastText = "Conversa liberada — diga olá!";
        if (lastMsg) lastText = (lastMsg.sender === "sent" && !lastMsg.deleted ? "Você: " : "") + previaDeMensagem(lastMsg);
        const isActive = chat.key === activeContact ? "active" : "";
        const horario = rotuloCurtoLista(lastMsg ? lastMsg.createdAt : chat.ordem);
        const naoLidas = chat.unread > 0
            ? `<span class="conv-unread-badge" aria-label="${chat.unread} mensagens não lidas">${chat.unread > 9 ? "9+" : chat.unread}</span>` : "";
        const tagArquivada = chat.todasEncerradas
            ? `<span class="conv-archived-tag">${escapeHtmlChat(chat.encerradaLabel)}</span>` : "";
        return `
            <div class="contact-item ${isActive} ${chat.unread ? "unread" : ""}" data-contact="${escapeHtmlChat(chat.key)}" role="button" tabindex="0">
                <div class="contact-avatar">${escapeHtmlChat(chat.avatar)}</div>
                <div class="contact-details">
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
    if (badge) {
        if (total > 0) {
            badge.textContent = total > 9 ? "9+" : String(total);
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }
    atualizarTituloAba(total);
}

function limparPainelAtivo() {
    activeContact = null;
    renderEstado = { grupo: null, chaves: new Set() };
    const body = document.getElementById("chat-body-messages");
    if (body) body.innerHTML = "";
    const nome = document.getElementById("chat-active-name");
    if (nome) nome.textContent = "Selecione uma conversa";
    const avatar = document.getElementById("chat-active-avatar");
    if (avatar) avatar.textContent = "?";
    const status = document.getElementById("chat-active-status");
    if (status) { status.textContent = ""; status.className = "status-indicator"; }
    document.getElementById("chat-window")?.classList.remove("mobile-conv");
    atualizarSeletorDeAssunto(null);
}

function selectConversation(key) {
    const eraThread = !!chatConversations[key];
    const groupKey = resolverChaveDoGrupo(key);
    const grupo = obterGrupo(groupKey);
    if (!grupo) return;
    if (eraThread) chatEnvioPreferido[groupKey] = key;
    if (activeContact !== groupKey) limparImagemPendenteChat();
    activeContact = groupKey;
    fecharMenusAbertos(null);
    document.getElementById("chat-window")?.classList.add("mobile-conv");
    document.querySelectorAll(".contact-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.contact === groupKey);
    });
    const headerAvatar = document.getElementById("chat-active-avatar");
    const headerName = document.getElementById("chat-active-name");
    const headerStatus = document.getElementById("chat-active-status");
    if (headerAvatar) headerAvatar.textContent = grupo.avatar;
    if (headerName) headerName.textContent = grupo.contactName;
    if (headerStatus) {
        headerStatus.className = grupo.todasEncerradas ? "status-indicator archived" : "status-indicator online";
        headerStatus.textContent = grupo.todasEncerradas ? `${grupo.context} · ${grupo.encerradaLabel}` : grupo.context;
    }
    atualizarSeletorDeAssunto(grupo);
    forcarRolagemFundo = true;
    renderActiveMessages();
    marcarConversaAbertaComoLida();
    // As notificações do sininho dessa conversa também deixam de ser "novas".
    grupo.threads.forEach(({ thread }) => window.marcarNotificacoesDaConversaComoLidas?.(thread.kind, thread.refId));
    if (!telaPequena()) document.getElementById("chat-input-text")?.focus();
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
    const html = grupo.threads.map(({ threadKey, thread }) =>
        `<option value="${escapeHtmlChat(threadKey)}"${threadKey === atualKey ? " selected" : ""}>${escapeHtmlChat(thread.context)}${thread.archived ? " (encerrado)" : ""}</option>`
    ).join("");
    if (select.innerHTML !== html) select.innerHTML = html;
    wrap.classList.remove("hidden");
}

/* --------------------------------------------------------
   MENSAGENS (lado direito) — atualização por diferença
   -------------------------------------------------------- */
function marcaDeEnvio(msg) {
    if (msg.sender !== "sent") return "";
    if (msg.pending) return `<span class="message-ticks pending" title="Enviando…" aria-label="Enviando">🕓</span>`;
    const lida = msg.contactReadIso && msg.createdAt <= msg.contactReadIso;
    return lida
        ? `<span class="message-ticks read" title="Lida" aria-label="Lida">✓✓</span>`
        : `<span class="message-ticks" title="Enviada" aria-label="Enviada">✓</span>`;
}

function montarItensDaConversa(grupo) {
    const itens = [];
    const varios = grupo.threads.length > 1;
    let threadAnterior = null;
    let diaAnterior = "";
    grupo.messages.forEach((msg) => {
        const dia = rotuloDoDia(msg.createdAt);
        if (dia && dia !== diaAnterior) {
            itens.push({ key: `dia:${dia}:${msg.ref}`, sig: dia, html: `<div class="chat-day-divider"><span>${escapeHtmlChat(dia)}</span></div>` });
            diaAnterior = dia;
        }
        if (varios && msg.threadKey !== threadAnterior) {
            const t = chatConversations[msg.threadKey];
            const rotulo = `${t.context}${t.archived ? ` · ${t.archivedLabel || "encerrado"}` : ""}`;
            itens.push({ key: `assunto:${msg.ref}`, sig: rotulo, html: `<div class="chat-thread-divider"><span>${escapeHtmlChat(rotulo)}</span></div>` });
        }
        threadAnterior = msg.threadKey;
        const ref = escapeHtmlChat(msg.ref);
        const hora = escapeHtmlChat(formatarHora(msg.createdAt));
        if (msg.deleted) {
            itens.push({
                key: `msg:${msg.ref}`, sig: "deleted",
                html: `
                <div class="message ${msg.sender} deleted">
                    <div class="msg-menu">
                        <button type="button" class="msg-menu-toggle" data-msg-menu-toggle aria-label="Mais opções desta mensagem">⋯</button>
                        <div class="msg-menu-dropdown hidden">
                            <button type="button" data-msg-delete-me="${ref}">Apagar para mim</button>
                        </div>
                    </div>
                    <span><em>Mensagem excluída.</em></span>
                    <span class="message-time">${hora}</span>
                </div>`
            });
            return;
        }
        const menu = `
                <div class="msg-menu">
                    <button type="button" class="msg-menu-toggle" data-msg-menu-toggle aria-label="Mais opções desta mensagem">⋯</button>
                    <div class="msg-menu-dropdown hidden">
                        ${msg.sender === "sent" ? `<button type="button" data-msg-delete="${ref}">Apagar para todos</button>` : ""}
                        <button type="button" data-msg-delete-me="${ref}">Apagar para mim</button>
                    </div>
                </div>`;
        const temImagem = imagemChatValida(msg.image);
        const w = Number(msg.imageW), h = Number(msg.imageH);
        const proporcao = w > 0 && h > 0 ? ` style="aspect-ratio: ${Math.round(w)} / ${Math.round(h)}"` : "";
        const imagem = temImagem ? `
                <button type="button" class="message-image-btn" data-msg-image="${ref}" aria-label="Abrir imagem em tamanho grande">
                    <img class="message-image" src="${msg.image}" alt="Imagem enviada no chat" decoding="async"${proporcao}>
                </button>` : "";
        const texto = msg.text ? `<span class="message-text">${escapeHtmlChat(msg.text)}</span>` : "";
        const sig = `ok|${msg.pending ? "p" : ""}|${msg.sender === "sent" && msg.contactReadIso && msg.createdAt <= msg.contactReadIso ? "r" : ""}`;
        itens.push({
            key: `msg:${msg.ref}`, sig,
            html: `
            <div class="message ${msg.sender}${temImagem ? " has-image" : ""}">
                ${menu}
                ${imagem}
                ${texto}
                <span class="message-meta"><span class="message-time">${hora}</span>${marcaDeEnvio(msg)}</span>
            </div>`
        });
    });
    return itens;
}

// Mantém os elementos que não mudaram (imagens não recarregam, menus
// abertos continuam abertos) e só cria/troca/remove o necessário.
function reconciliarLista(container, itens) {
    const existentes = new Map();
    Array.from(container.children).forEach((el) => {
        if (el.dataset.key) existentes.set(el.dataset.key, el); else el.remove();
    });
    const finais = itens.map((item) => {
        const atual = existentes.get(item.key);
        if (atual && atual.dataset.sig === item.sig) { existentes.delete(item.key); return atual; }
        const molde = document.createElement("div");
        molde.innerHTML = item.html.trim();
        const novo = molde.firstElementChild;
        novo.dataset.key = item.key;
        novo.dataset.sig = item.sig;
        return novo;
    });
    existentes.forEach((el) => el.remove());
    finais.forEach((el, i) => {
        if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null);
    });
}

function renderActiveMessages() {
    const chatBody = document.getElementById("chat-body-messages");
    if (!chatBody) return;
    const grupo = obterGrupo(activeContact);
    if (!grupo) { chatBody.innerHTML = ""; return; }

    const troca = renderEstado.grupo !== grupo.key;
    const estavaNoFim = troca || forcarRolagemFundo || chatBody.dataset.colado === "1" || estaNoFim(chatBody);
    const itens = montarItensDaConversa(grupo);
    if (!itens.length) {
        chatBody.innerHTML = `<div class="chat-empty-state" data-key="vazio" data-sig="v">Conversa liberada. Envie a primeira mensagem para combinar os detalhes.</div>`;
    } else {
        chatBody.querySelector('[data-key="vazio"]')?.remove();
        reconciliarLista(chatBody, itens);
    }

    // Mensagens recebidas novas enquanto a pessoa lê o histórico: contador no botão "↓".
    const chavesAgora = new Set(grupo.messages.map((m) => m.ref));
    const novasRecebidas = troca ? 0 : grupo.messages.filter((m) => !renderEstado.chaves.has(m.ref) && m.sender === "received" && !m.deleted).length;
    const ultimaMsg = grupo.messages[grupo.messages.length - 1];
    const euEnviei = !troca && ultimaMsg && ultimaMsg.sender === "sent" && !renderEstado.chaves.has(ultimaMsg.ref);
    renderEstado = { grupo: grupo.key, chaves: chavesAgora };

    atualizarSeletorDeAssunto(grupo);
    if (estavaNoFim || euEnviei) {
        forcarRolagemFundo = false;
        chatBody.dataset.colado = "1";
        chatBody.scrollTop = chatBody.scrollHeight;
        esconderBotaoFim();
    } else {
        chatBody.dataset.colado = "0";
        if (novasRecebidas > 0) {
            const btn = document.getElementById("chat-scroll-bottom");
            const cont = document.getElementById("chat-scroll-bottom-count");
            btn?.classList.remove("hidden");
            if (cont) { cont.textContent = String((parseInt(cont.textContent, 10) || 0) + novasRecebidas); cont.classList.remove("hidden"); }
        }
    }
}

/* --------------------------------------------------------
   ENVIO
   -------------------------------------------------------- */
async function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById("chat-input-text");
    if (!input) return;
    const text = input.value.trim();
    const image = chatImagemPendente;
    const dims = chatImagemDims;
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
    forcarRolagemFundo = true;
    const ok = await thread.send(text, image, dims);
    // Falhou: devolve o texto/imagem para a pessoa não perder o que escreveu.
    if (ok === false) {
        if (!input.value) input.value = text;
        if (image && !chatImagemPendente) {
            chatImagemPendente = image;
            chatImagemDims = dims;
            atualizarPreviaImagemChat();
        }
    }
}

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

function excluirConversaParaMim(key) {
    const grupo = obterGrupo(key);
    fecharMenusAbertos(null);
    if (!grupo) return;
    if (!window.confirm(`Excluir a conversa com ${grupo.contactName}? Ela some da sua lista, junto com o histórico.`)) return;
    grupo.threads.forEach(({ thread }) => thread.hideForMe?.());
    window.showToast?.("Conversa excluída da sua lista.", "info");
    if (activeContact === grupo.key) {
        const proxima = listaOrdenada().find((g) => g.key !== grupo.key);
        if (proxima && !telaPequena()) selectConversation(proxima.key); else limparPainelAtivo();
    }
    renderConversationsList();
}

// Abre o chat em uma conversa específica (aceita a chave de uma thread).
function openChat(key) {
    if (!chatConversations[key] && !obterGrupo(key)) {
        window.showToast?.("Não foi possível abrir esta conversa agora.", "warning");
        return;
    }
    const thread = chatConversations[key];
    if (thread?.hiddenForMe) {
        obterGrupo(resolverChaveDoGrupo(key))?.threads.forEach(({ thread: t }) => t.unhide?.());
    }
    esconderPopupChat();
    document.getElementById("chat-window")?.classList.remove("hidden");
    renderConversationsList();
    selectConversation(key);
}

// Limpa tudo no logout (não vazar conversas de uma conta para a próxima).
function limparChatDoUsuario() {
    Object.keys(chatConversations).forEach((key) => delete chatConversations[key]);
    Object.keys(chatEnvioPreferido).forEach((key) => delete chatEnvioPreferido[key]);
    activeContact = null;
    renderEstado = { grupo: null, chaves: new Set() };
    limparImagemPendenteChat();
    fecharVisualizadorImagem();
    esconderPopupChat();
    const corpo = document.getElementById("chat-body-messages");
    if (corpo) corpo.innerHTML = "";
    document.getElementById("chat-window")?.classList.add("hidden");
    document.getElementById("chat-window")?.classList.remove("mobile-conv");
    document.getElementById("chat-widget-container")?.classList.add("hidden");
    renderConversationsList();
}

document.addEventListener("includesLoaded", initChat);

window.openChat = openChat;
window.initChat = initChat;
window.selectConversation = selectConversation;
window.limparChatDoUsuario = limparChatDoUsuario;
window.acrescentarNotificacaoChat = acrescentarNotificacaoChat;
window.alertarMensagemChat = alertarMensagemChat;
window.avisarNovaConversa = avisarNovaConversa;
window.renderActiveMessages = renderActiveMessages;
window.renderConversationsList = renderConversationsList;
window.getActiveContact = () => activeContact;
// A thread está diante dos olhos da pessoa agora? (janela aberta, aba visível,
// e é a conversa selecionada). Só nesse caso a mensagem conta como lida.
window.isThreadActive = (threadKey) =>
    !!activeContact && !!chatConversations[threadKey] && chaveDoGrupo(threadKey) === activeContact && conversaNaTela();
window.chatConversations = chatConversations;
