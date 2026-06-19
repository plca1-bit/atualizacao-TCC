/* ========================================================
   PONTE SOLIDÁRIA - CHAT MODULE (WhatsApp Web-Style)
   ======================================================== */
// Banco de dados em memória para manter o histórico de chat de cada contato
const chatConversations = {
    "Suporte Ponte Solidária": {
        avatar: "SP",
        role: "Suporte Técnico",
        online: true,
        typing: false,
        messages: [
            { sender: "received", text: "Olá! Como posso ajudar você hoje? Estamos aqui para tirar suas dúvidas sobre doações, cadastros ou entregas. 💙", time: "20:00" }
        ]
    },
    "Família Silva": {
        avatar: "FS",
        role: "Família Beneficiária",
        online: true,
        typing: false,
        messages: [
            { sender: "received", text: "Olá! Vi que você tem interesse em apoiar nossa família com alimentos. Muito obrigado de coração!", time: "18:30" }
        ],
        autoReply: "Obrigado por entrar em contato! Nosso endereço é na Comunidade Esperança, Bloco B, São Paulo. Podemos marcar a entrega para este sábado à tarde? 🍎"
    },
    "Família Medeiros": {
        avatar: "FM",
        role: "Família Beneficiária",
        online: false,
        typing: false,
        messages: [
            { sender: "received", text: "Boa noite! Precisamos muito do berço infantil para o nosso bebê que vai nascer. Poderia nos ajudar?", time: "Ontem" }
        ],
        autoReply: "Muito obrigado por nos responder! Nós não temos carro para buscar, mas a ONG Amor ao Próximo se ofereceu para fazer o transporte se você puder deixar com eles. 👶"
    },
    "ONG Amor ao Próximo": {
        avatar: "AP",
        role: "ONG Validada",
        online: true,
        typing: false,
        messages: [
            { sender: "received", text: "Olá! Somos da diretoria de triagem da ONG. Agradecemos o interesse em doar! Quer agendar uma coleta ou trazer em nossa sede?", time: "15:45" }
        ],
        autoReply: "Olá, doador! Perfeito. Nossa sede fica na Rua das Oliveiras, 456 e recebemos doações de segunda a sexta, das 8h às 17h. Aguardamos você! 🏢"
    }
};
let activeContact = "Suporte Ponte Solidária";
// Inicialização do Chat
function initChat() {
    const chatToggle = document.getElementById("chat-toggle-btn");
    const chatWindow = document.getElementById("chat-window");
    const chatClose = document.getElementById("chat-close-btn");
    const chatInput = document.getElementById("chat-input-form");
    const chatContainer = document.getElementById("chat-widget-container");
    chatContainer?.classList.remove("hidden");
    // Toggle abrir/fechar chat
    chatToggle?.addEventListener("click", () => {
        chatWindow?.classList.toggle("hidden");
        if (!chatWindow?.classList.contains("hidden")) {
            renderConversationsList();
            selectConversation(activeContact);
            limparNotificacoesChat();
        }
    });
    chatClose?.addEventListener("click", () => chatWindow?.classList.add("hidden"));
    // Enviar mensagem
    chatInput?.addEventListener("submit", handleSendMessage);
}
// Renderiza a lista de conversas na sidebar (lado esquerdo)
function renderConversationsList() {
    const sidebar = document.getElementById("chat-sidebar-contacts");
    if (!sidebar) return;
    sidebar.innerHTML = Object.keys(chatConversations).map(name => {
        const chat = chatConversations[name];
        const lastMsg = chat.messages[chat.messages.length - 1];
        const lastText = lastMsg ? lastMsg.text : "Nenhuma mensagem";
        const isActive = name === activeContact ? "active" : "";
        return `
            <div class="contact-item ${isActive}" onclick="selectConversation('${name}')" data-contact="${name}">
                <div class="contact-avatar">${chat.avatar}</div>
                <div class="contact-details" style="flex-grow: 1; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span class="contact-name">${name}</span>
                    </div>
                    <p class="contact-last-msg" style="font-size: 0.68rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 2px 0 0 0;">
                        ${lastText}
                    </p>
                </div>
            </div>
        `;
    }).join("");
}
// Seleciona e carrega uma conversa ativa
function selectConversation(name) {
    if (!chatConversations[name]) return;
    activeContact = name;
    // Atualiza classe active na lista
    document.querySelectorAll(".contact-item").forEach(item => {
        item.classList.toggle("active", item.dataset.contact === name);
    });
    const chat = chatConversations[name];
    // Atualiza cabeçalho do chat ativo
    const headerAvatar = document.getElementById("chat-active-avatar");
    const headerName = document.getElementById("chat-active-name");
    const headerStatus = document.getElementById("chat-active-status");
    if (headerAvatar) headerAvatar.textContent = chat.avatar;
    if (headerName) headerName.textContent = name;
    if (headerStatus) {
        headerStatus.className = `status-indicator ${chat.online ? 'online' : 'offline'}`;
        headerStatus.textContent = chat.online ? (chat.typing ? "Digitando..." : "Online") : "Offline";
    }
    // Renderiza mensagens no corpo
    renderActiveMessages();
}
// Renderiza as mensagens da conversa selecionada
function renderActiveMessages() {
    const chatBody = document.getElementById("chat-body-messages");
    if (!chatBody) return;
    const chat = chatConversations[activeContact];
    chatBody.innerHTML = chat.messages.map(msg => `
        <div class="message ${msg.sender}">
            <span>${msg.text}</span>
            <span class="message-time">${msg.time}</span>
        </div>
    `).join("");
    // Adiciona o indicador de digitando se ativo
    if (chat.typing) {
        const typingDiv = document.createElement("div");
        typingDiv.className = "typing-indicator message received";
        typingDiv.innerHTML = `<span>Digitando</span>`;
        chatBody.appendChild(typingDiv);
    }
    // Rolagem automática para o final
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
}
// Trata o envio de uma mensagem
function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById("chat-input-text");
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Adiciona ao histórico
    chatConversations[activeContact].messages.push({
        sender: "sent",
        text: text,
        time: time
    });
    input.value = "";
    renderActiveMessages();
    renderConversationsList();
    // Simulação de resposta automática
    simularRespostaAutomatica();
}
// Simula respostas inteligentes de acordo com o contato selecionado
function simularRespostaAutomatica() {
    const chat = chatConversations[activeContact];
    const contactName = activeContact;
    // Se já estiver digitando, ignora
    if (chat.typing) return;
    // Define delay de resposta
    chat.typing = true;
    if (contactName === activeContact) {
        selectConversation(contactName); // Atualiza status para "Digitando..."
    }
    setTimeout(() => {
        chat.typing = false;
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let replyText = "Olá! Obrigado por entrar em contato. Um voluntário da Ponte Solidária retornará o quanto antes. 💙";
        if (chat.autoReply) {
            replyText = chat.autoReply;
        }
        chat.messages.push({
            sender: "received",
            text: replyText,
            time: replyTime
        });
        // Se a conversa ainda estiver aberta e for a mesma, atualiza a tela
        if (activeContact === contactName) {
            selectConversation(contactName);
        } else {
            // Notificação visual se a janela estiver fechada ou estiver em outro chat
            acrescentarNotificacaoChat();
        }
        renderConversationsList();
    }, 2000);
}
// Abre o chat em um contato específico (ex: clicando em "Ajudar Família" no mapa ou portal)
function openChat(name) {
    // Se o contato não existe, cria um temporário
    if (!chatConversations[name]) {
        chatConversations[name] = {
            avatar: name.split(" ").map(w => w.charAt(0)).join("").toUpperCase().substring(0, 2),
            role: "Contato Externo",
            online: true,
            typing: false,
            messages: [
                { sender: "received", text: `Olá! Como posso ajudar você? Iniciamos este chat para falar sobre a sua ação. 💙`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ],
            autoReply: "Agradecemos o seu contato. Entrarei em detalhes sobre a entrega logo mais!"
        };
    }
    const chatWindow = document.getElementById("chat-window");
    chatWindow?.classList.remove("hidden");
    
    renderConversationsList();
    selectConversation(name);
    limparNotificacoesChat();
}
// Notificações flutuantes no chat
let unreadCount = 0;
function acrescentarNotificacaoChat() {
    unreadCount++;
    const badge = document.getElementById("chat-notif-badge");
    if (badge) {
        badge.textContent = unreadCount;
        badge.classList.remove("hidden");
    }
    showToast("Você tem uma nova mensagem no chat!", "info");
}
function limparNotificacoesChat() {
    unreadCount = 0;
    const badge = document.getElementById("chat-notif-badge");
    if (badge) {
        badge.textContent = "0";
        badge.classList.add("hidden");
    }
}
// Adiciona compatibilidade para os scripts carregados via SPA
window.openChat = openChat;
window.initChat = initChat;
window.selectConversation = selectConversation;
