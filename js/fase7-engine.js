/* ========================================================
   PONTE SOLIDÁRIA - FASE 7: TRANSPARÊNCIA, ADMIN E LOGS
   ======================================================== */

document.addEventListener("firebaseReady", () => {
    initFase7EngineWithRetry();
    initImpactoHomeWithRetry();
});

// Listener para recalcular quando o usuário navegar para Transparência
document.addEventListener("click", (e) => {
    if (e.target.closest("#nav-transparency") || e.target.closest("[href*='transparencia']")) {
        setTimeout(renderPortalTransparencia, 300);
    }
});

function initFase7EngineWithRetry(tentativas = 0) {
    const sectionTransp = document.getElementById("transparency-section");
    
    // Se o HTML dinâmico ainda não carregou, aguarda 200ms e tenta novamente (até 10x)
    if (!sectionTransp && tentativas < 10) {
        setTimeout(() => initFase7EngineWithRetry(tentativas + 1), 200);
        return;
    }

    renderPortalTransparencia();
    renderPainelAdmin();
}

/* --------------------------------------------------------
   0. IMPACTO EM TEMPO REAL (HOME) — números calculados a partir
      do Firestore, nunca hardcoded no HTML. Cada indicador usa
      exatamente os mesmos nomes de campo/valores de status que o
      resto do site já grava, para não criar mais uma fonte divergente:
        • Famílias atendidas  → coleção "pedidos", status === "concluido"
          (mesmo valor gravado em concluirPedido(), js/doacoes.js)
        • Itens entregues     → coleção "doacoes", trackingStatus === "Entregue"
          (mesmo valor gravado em confirmarEntregaDireta(), js/doacoes.js —
          doações NÃO têm campo "status", só "trackingStatus")
        • ONGs integradas     → coleção "users", role === "ong" e aprovação
          confirmada via isOngAprovada() (js/firebase-auth.js), que já
          cobre tanto o campo booleano "approved" quanto o fallback
          "status" de documentos antigos
        • Campanhas ativas    → coleção "campanhas", status === "ativa"
          (mesmo critério usado nas estatísticas de campanhas ativas)
   -------------------------------------------------------- */
function initImpactoHomeWithRetry(tentativas = 0) {
    const sectionHome = document.getElementById("home-stat-families");

    // Se o HTML dinâmico da Home ainda não carregou, aguarda 200ms e
    // tenta novamente (até 10x), mesmo padrão usado no resto do arquivo.
    if (!sectionHome && tentativas < 10) {
        setTimeout(() => initImpactoHomeWithRetry(tentativas + 1), 200);
        return;
    }

    renderImpactoHome();
}

// 🔴 Correção: a Home é pública (nenhum item do menu principal fica
// escondido atrás de login, exceto "admin-only"), mas os quatro contadores
// abaixo eram calculados lendo direto /pedidos, /doacoes, /users e
// /campanhas — coleções que exigem "estaLogado()" nas regras. Um visitante
// sem login abria a Home e o Firestore recusava as quatro leituras, então
// os cartões de "Impacto em Tempo Real" ficavam sempre vazios.
// Solução (opção B da revisão): existe agora uma coleção pública separada,
// "estatisticas_publicas", com só os números agregados (sem nome/cidade/
// endereço de ninguém). Todo visitante lê essa coleção direto, sem login.
// Quando o visitante ESTÁ logado, o app aproveita e recalcula os números
// certos a partir das coleções de origem (fonte da verdade) e regrava o
// resumo público — assim o resumo se mantém atualizado com o uso normal do
// site, sem precisar de Cloud Functions (ver comentário em firestore.rules).
async function renderImpactoHome() {
    if (!window.fb) return;

    // 1) Sempre tenta mostrar algo de imediato a partir do resumo público —
    // funciona para qualquer visitante, logado ou não.
    const resumoPublico = await lerEstatisticasPublicas();
    if (resumoPublico) {
        updateTxt("home-stat-families", resumoPublico.familiasAtendidas.toLocaleString("pt-BR"));
        updateTxt("home-stat-donations", resumoPublico.entregasConcluidas.toLocaleString("pt-BR"));
        updateTxt("home-stat-ongs", resumoPublico.ongsAprovadas.toLocaleString("pt-BR"));
    }

    // 2) Só quem está logado consegue ler as coleções de origem para
    // recalcular os números exatos (campanhasAtivas nunca teve equivalente
    // no resumo público — fica só nesta parte, igual antes).
    if (!window.appState?.user) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const [pedidosSnap, doacoesSnap, usersSnap, campanhasSnap] = await Promise.all([
            firestoreSdk.getDocs(firestoreSdk.collection(db, "pedidos")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "doacoes")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "users")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "campanhas"))
        ]);

        let familiasAtendidas = 0;
        pedidosSnap.forEach((d) => { if (d.data().status === "concluido") familiasAtendidas++; });

        let itensEntregues = 0;
        doacoesSnap.forEach((d) => { if (d.data().trackingStatus === "Entregue") itensEntregues++; });

        let ongsIntegradas = 0;
        usersSnap.forEach((d) => {
            const u = d.data();
            const aprovada = window.isOngAprovada ? window.isOngAprovada(u) : u.approved === true;
            if (u.role === "ong" && aprovada) ongsIntegradas++;
        });

        let campanhasAtivas = 0;
        campanhasSnap.forEach((d) => { if (d.data().status === "ativa") campanhasAtivas++; });

        updateTxt("home-stat-families", familiasAtendidas.toLocaleString("pt-BR"));
        updateTxt("home-stat-donations", itensEntregues.toLocaleString("pt-BR"));
        updateTxt("home-stat-ongs", ongsIntegradas.toLocaleString("pt-BR"));
        updateTxt("home-stat-campaigns", campanhasAtivas.toLocaleString("pt-BR"));

        await salvarEstatisticasPublicas({
            doacoesRecebidas: doacoesSnap.size,
            entregasConcluidas: itensEntregues,
            ongsAprovadas: ongsIntegradas,
            familiasAtendidas
        });

    } catch (error) {
        console.error("Erro ao carregar Impacto em Tempo Real:", error);
    }
}

// Lê o resumo público (sem exigir login). Retorna null se ainda não existe
// nenhum documento (primeira vez que o site roda, antes de qualquer conta
// logada ter recalculado o resumo pelo menos uma vez) ou em caso de erro.
async function lerEstatisticasPublicas() {
    if (!window.fb) return null;
    const { db, firestoreSdk } = window.fb;
    try {
        const ref = firestoreSdk.doc(db, "estatisticas_publicas", "resumo");
        const snap = await firestoreSdk.getDoc(ref);
        if (!snap.exists()) return null;
        const d = snap.data();
        return {
            doacoesRecebidas: d.doacoesRecebidas || 0,
            entregasConcluidas: d.entregasConcluidas || 0,
            ongsAprovadas: d.ongsAprovadas || 0,
            familiasAtendidas: d.familiasAtendidas || 0
        };
    } catch (error) {
        console.error("Erro ao carregar resumo público de estatísticas:", error);
        return null;
    }
}

// Regrava o resumo público — só chamada quando há uma conta logada (única
// forma de ler as coleções de origem para calcular os números certos, ver
// firestore.rules). "estaLogado()" nas regras exige só uma conta logada
// qualquer, sem checar se o valor bate com a realidade (limitação
// documentada nas regras); por isso os campos ficam restritos a inteiros
// não-negativos, para pelo menos impedir um formato de documento inválido.
async function salvarEstatisticasPublicas(stats) {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;
    try {
        const ref = firestoreSdk.doc(db, "estatisticas_publicas", "resumo");
        await firestoreSdk.setDoc(ref, {
            doacoesRecebidas: stats.doacoesRecebidas,
            entregasConcluidas: stats.entregasConcluidas,
            ongsAprovadas: stats.ongsAprovadas,
            familiasAtendidas: stats.familiasAtendidas,
            atualizadoEm: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro ao regravar resumo público de estatísticas:", error);
    }
}

/* --------------------------------------------------------
   1. REGISTRO AUTOMÁTICO DE LOGS DE AUDITORIA
   -------------------------------------------------------- */
// Fase 7 — log de auditoria EXCLUSIVO de ações administrativas (aprovar
// ONG, bloquear/desbloquear usuário). Grava "origem: admin" para que a
// regra do Firestore (firestore.rules, item 27 da revisão) só aceite este
// tipo de registro vindo de uma conta com role == "admin" de verdade —
// ninguém mais consegue criar uma entrada aqui dizendo "sou administrador
// e fiz X". Diferente do registro-triplo automático de ações comuns
// (registrarAcaoGlobal(), js/fase6-engine.js), que grava na mesma coleção
// sem esse campo e continua exigindo só uma conta logada.
window.registrarLogAuditoria = async function (acao, detalhes, resultado = "Sucesso") {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;
    const usuarioAtual = window.appState?.user || JSON.parse(localStorage.getItem("ps_current_user")) || { name: "Anônimo", id: "system" };

    try {
        await firestoreSdk.addDoc(firestoreSdk.collection(db, "auditoria_logs"), {
            usuarioId: usuarioAtual.id || usuarioAtual.uid || "system",
            // Campo do documento "users" é sempre "name" (nunca "nome") — ver
            // padronização em firebase-auth.js. Usar "nome" aqui fazia o log
            // de auditoria gravar sempre o fallback "Usuário", nunca o nome real.
            usuarioNome: usuarioAtual.name || "Usuário",
            acao,
            detalhes: detalhes || "",
            resultado,
            dataHora: new Date().toISOString(),
            origem: "admin"
        });
    } catch (error) {
        console.error("Erro ao gravar log de auditoria:", error);
    }
};

/* --------------------------------------------------------
   2. PORTAL DE TRANSPARÊNCIA (CARREGAMENTO RESILIENTE)
   -------------------------------------------------------- */
async function renderPortalTransparencia() {
    const containerTransp = document.getElementById("transparency-section");
    if (!containerTransp || !window.fb) return;

    // Números agregados (opção B da revisão) — sempre visíveis, mesmo sem
    // login, porque vêm da coleção pública "estatisticas_publicas"
    // (nenhum nome/cidade/endereço, só contagens).
    renderResumoPublicoTransparencia();

    // 🔴 A distribuição por categoria em "Resumo financeiro" precisa ler
    // /doacoes item a item, e essa coleção exige login (dado pessoal:
    // donorName, city etc. em cada documento). Antes disso não era checado
    // aqui, então um visitante sem login via essa área ficar presa em
    // "Carregando distribuição..." para sempre — a leitura era negada pelo
    // Firestore e o catch só escrevia no console, sem atualizar a tela.
    if (!window.appState?.user) {
        const container = document.getElementById("resource-breakdown-container");
        if (container) {
            container.innerHTML = `<p class="text-center text-muted" style="padding: 12px 0;">Faça login para ver a distribuição detalhada por categoria.</p>`;
        }
        return;
    }

    const { db, firestoreSdk } = window.fb;

    try {
        const doacoesSnap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "doacoes"));

        const categoriasMap = {};
        doacoesSnap.forEach(d => {
            const data = d.data();
            // O campo gravado em finalizeDonationWizard() (js/doacoes.js) é
            // "category" (inglês) — usar "categoria" aqui fazia esse contador
            // cair sempre no fallback e o gráfico nunca refletir os dados reais.
            const cat = data.category || "Outros";
            categoriasMap[cat] = (categoriasMap[cat] || 0) + 1;
        });

        renderGraficoCategorias(categoriasMap);

    } catch (error) {
        console.error("Erro ao carregar Portal de Transparência:", error);
    }
}

// Preenche os cartões "Recursos acompanhados" do topo da Transparência com
// o resumo público (doações recebidas, entregas concluídas, ONGs aprovadas,
// famílias atendidas) — mesma coleção pública usada em renderImpactoHome().
// Funciona para qualquer visitante, logado ou não.
async function renderResumoPublicoTransparencia() {
    const resumo = await lerEstatisticasPublicas();
    if (!resumo) return;
    updateTxt("transparency-stat-donations", resumo.doacoesRecebidas.toLocaleString("pt-BR"));
    updateTxt("transparency-stat-deliveries", resumo.entregasConcluidas.toLocaleString("pt-BR"));
    updateTxt("transparency-stat-ongs", resumo.ongsAprovadas.toLocaleString("pt-BR"));
    updateTxt("transparency-stat-families", resumo.familiasAtendidas.toLocaleString("pt-BR"));
}

// Renderiza a distribuição por categoria em "Resumo financeiro" usando o
// mesmo componente visual (resource-row / resource-track) já usado no
// restante da página — antes esse cálculo real existia, mas apontava para
// um id ("transparencia-chart-container") que não existe mais no HTML
// atual, então nunca chegava a aparecer na tela.
function renderGraficoCategorias(categorias) {
    const container = document.getElementById("resource-breakdown-container");
    if (!container) return;

    const total = Object.values(categorias).reduce((a, b) => a + b, 0);
    const chaves = Object.keys(categorias).sort((a, b) => categorias[b] - categorias[a]);

    if (chaves.length === 0 || total === 0) {
        container.innerHTML = `<p class="text-center text-muted" style="padding: 12px 0;">Ainda não há doações cadastradas para calcular a distribuição por categoria.</p>`;
        return;
    }

    const cores = ["", "pink", "purple"];
    container.innerHTML = chaves.map((cat, index) => {
        const qtd = categorias[cat];
        const pct = Math.round((qtd / total) * 100);
        const corClasse = cores[index % cores.length];
        return `
            <div class="resource-row">
                <div><span>${escapeHtml(cat)}</span><strong>${pct}%</strong></div>
                <div class="resource-track ${corClasse}"><span style="width:${pct}%"></span></div>
            </div>`;
    }).join("");
}

/* --------------------------------------------------------
   3. PAINEL DO ADMINISTRADOR
   -------------------------------------------------------- */
async function renderPainelAdmin() {
    const adminPanel = document.getElementById("admin-section");
    if (!adminPanel || !window.fb) return;

    // 🔴 Correção (item 1 do plano de finalização): esta função rodava
    // para QUALQUER pessoa logada (ou nem logada), mesmo com o painel
    // escondido na tela — cada visita batia no Firestore para
    // estatísticas globais, lista de usuários e (sempre) tomava
    // "permission-denied" em auditoria_logs, que o firestore.rules
    // reserva só para ehAdmin(). Sem necessidade real, já que ninguém
    // além do admin enxerga essas tabelas. Agora só carrega para quem é
    // de fato administrador.
    if (window.appState?.user?.role !== "admin") return;

    await Promise.all([
        carregarEstatisticasAdmin(),
        carregarOngsPendentes(),
        carregarUsuariosAdmin(),
        carregarLogsAuditoria()
    ]);
}

// Estatísticas globais do topo do Painel Adm (admin-stat-usuarios,
// admin-stat-doacoes, admin-stat-campanhas). Reaproveita as mesmas
// coleções/campos já usados no restante do painel (users, doacoes,
// campanhas). "Vendas Realizadas" foi removida daqui de propósito: não
// existe, em nenhum lugar do sistema, uma tela ou função que crie um
// documento na coleção "vendas" — era só uma leitura órfã aqui (o antigo
// js/admin.js, que também lia "vendas" sem nenhuma tela correspondente,
// foi removido do projeto). Contar algo que nenhuma funcionalidade real produz é a mesma
// promessa vazia apontada no item 26; melhor mostrar "Campanhas Ativas",
// que É uma feature real (cadastro em saveCampanha(), js/doacoes.js), do
// que manter um card que vai ficar em "0" para sempre.
async function carregarEstatisticasAdmin() {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const [usersSnap, doacoesSnap, campanhasSnap] = await Promise.all([
            firestoreSdk.getDocs(firestoreSdk.collection(db, "users")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "doacoes")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "campanhas"))
        ]);

        const campanhasAtivas = campanhasSnap.docs.filter(d => d.data().status === "ativa").length;

        updateTxt("admin-stat-usuarios", usersSnap.size.toLocaleString("pt-BR"));
        updateTxt("admin-stat-doacoes", doacoesSnap.size.toLocaleString("pt-BR"));
        updateTxt("admin-stat-campanhas", campanhasAtivas.toLocaleString("pt-BR"));
    } catch (error) {
        console.error("Erro ao carregar estatísticas do Painel Adm:", error);
    }
}

async function carregarOngsPendentes() {
    const tbody = document.getElementById("admin-ongs-tbody");
    if (!tbody || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        // Schema real (o mesmo usado no cadastro, js/firebase-auth.js): coleção
        // "users", campos role/name/cnpj/status/approved — NÃO "usuarios"/papel/statusAprovacao.
        const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "users"));
        const ongs = [];

        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.role === "ong") ongs.push({ id: docSnap.id, ...u });
        });

        const pendentes = ongs.filter(o => !o.approved).length;
        updateTxt("admin-ongs-count", ongs.length === 0 ? "Nenhuma ONG" : `${pendentes} pendente${pendentes === 1 ? "" : "s"} de ${ongs.length}`);

        if (ongs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="admin-td-empty"><div class="admin-empty-state"><i data-lucide="building-2"></i><span>Nenhuma ONG cadastrada ainda.</span></div></td></tr>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // ONGs pendentes primeiro, pra quem abre o painel ver logo o que precisa de ação.
        ongs.sort((a, b) => Number(!!a.approved) - Number(!!b.approved));

        tbody.innerHTML = ongs.map(ong => `
            <tr>
                <td class="admin-td-identity">
                    <div class="admin-cell-identity">
                        <span class="admin-avatar">${iniciais(ong.name)}</span>
                        <div class="admin-cell-identity-text">
                            <strong>${escapeHtml(ong.name || 'ONG')}</strong>
                            <small>${escapeHtml(ong.email)}</small>
                        </div>
                    </div>
                </td>
                <td data-label="CNPJ">
                    ${escapeHtml(ong.cnpj || 'Não informado')}
                    ${ong.cnpjVerificado
                        ? `<br><small class="cnpj-verificado">✔ Receita: ${escapeHtml(ong.cnpjRazaoSocial || 'ativo')}</small>`
                        : `<br><small class="cnpj-nao-verificado">⚠ Não verificado na Receita — confira manualmente</small>`}
                </td>
                <td data-label="Status"><span class="badge-status ${ong.approved ? 'is-approved' : 'is-pending'}">${ong.approved ? 'Aprovado' : (ong.status || 'Pendente')}</span></td>
                <td data-label="Ação">
                    ${!ong.approved ? `
                        <button class="btn btn-sm btn-primary" onclick="aprovarOngAdmin('${ong.id}', '${escapeHtml(ong.name)}')">Aprovar ONG</button>
                    ` : `<span class="text-muted small">Aprovada</span>`}
                </td>
            </tr>
        `).join("");

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Erro ao carregar ONGs:", error);
    }
}

window.aprovarOngAdmin = async function (id, nome) {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const docRef = firestoreSdk.doc(db, "users", id);
        await firestoreSdk.updateDoc(docRef, { approved: true, status: "approved" });

        await window.registrarLogAuditoria("Aprovação", `Aprovou a ONG: ${nome}`);
        window.showToast?.(`ONG ${nome} aprovada!`);
        carregarOngsPendentes();
    } catch (error) {
        console.error("Erro ao aprovar ONG:", error);
    }
};

async function carregarUsuariosAdmin() {
    const tbody = document.getElementById("admin-usuarios-tbody");
    if (!tbody || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    // 🔴 Correção: sem essa checagem, o próprio administrador logado
    // aparecia na lista com o botão "Bloquear" ativo — nada nas regras do
    // Firestore ou na tela impedia ele de bloquear a própria conta.
    const idAdminLogado = window.appState?.user?.id;

    try {
        const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "users"));

        updateTxt("admin-usuarios-count", `${snap.size} usuário${snap.size === 1 ? "" : "s"}`);

        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" class="admin-td-empty"><div class="admin-empty-state"><i data-lucide="users"></i><span>Nenhum usuário cadastrado ainda.</span></div></td></tr>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const nomeRoleLabel = { admin: "Administrador", ong: "ONG", person: "Pessoa" };

        tbody.innerHTML = snap.docs.map(docSnap => {
            const u = docSnap.data();
            const id = docSnap.id;
            const bloqueado = u.blocked === true;
            const ehVoceMesmo = id === idAdminLogado;
            const role = u.role || "person";

            return `
                <tr>
                    <td class="admin-td-identity">
                        <div class="admin-cell-identity">
                            <span class="admin-avatar">${iniciais(u.name)}</span>
                            <div class="admin-cell-identity-text">
                                <strong>${escapeHtml(u.name || 'Usuário')}</strong>${ehVoceMesmo ? ' <span class="text-muted small">(você)</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td data-label="E-mail">${escapeHtml(u.email)}</td>
                    <td data-label="Perfil"><span class="badge-role role-${role}">${nomeRoleLabel[role] || escapeHtml(role)}</span></td>
                    <td data-label="Ação">
                        ${ehVoceMesmo ? '<span class="text-muted small">—</span>' : `
                        <button class="btn btn-sm ${bloqueado ? 'btn-secondary' : 'btn-danger'}" 
                                onclick="alternarBloqueioUsuario('${id}', '${escapeHtml(u.name)}', ${bloqueado})">
                            ${bloqueado ? 'Desbloquear' : 'Bloquear'}
                        </button>`}
                    </td>
                </tr>
            `;
        }).join("");

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Erro ao carregar usuários admin:", error);
    }
}

window.alternarBloqueioUsuario = async function (id, nome, estaBloqueado) {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;
    const novoBloqueado = !estaBloqueado;

    try {
        const docRef = firestoreSdk.doc(db, "users", id);
        await firestoreSdk.updateDoc(docRef, { blocked: novoBloqueado });

        await window.registrarLogAuditoria("Bloqueio/Acesso", `${estaBloqueado ? 'Desbloqueou' : 'Bloqueou'} o usuário: ${nome}`);
        window.showToast?.(`Usuário ${nome} foi ${estaBloqueado ? 'desbloqueado' : 'bloqueado'}.`);
        carregarUsuariosAdmin();
    } catch (error) {
        console.error("Erro ao alterar bloqueio de usuário:", error);
    }
};

async function carregarLogsAuditoria() {
    const tbody = document.getElementById("admin-auditoria-tbody");
    if (!tbody || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "auditoria_logs"));
        const logs = [];

        snap.forEach(d => logs.push(d.data()));
        logs.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="admin-td-empty"><div class="admin-empty-state"><i data-lucide="shield"></i><span>Nenhum log registrado ainda.</span></div></td></tr>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        tbody.innerHTML = logs.slice(0, 30).map(log => `
            <tr>
                <td data-label="Data/Hora"><small>${new Date(log.dataHora).toLocaleString('pt-BR')}</small></td>
                <td data-label="Usuário"><strong>${escapeHtml(log.usuarioNome)}</strong></td>
                <td data-label="Ação"><span class="badge-action">${escapeHtml(log.acao)}</span></td>
                <td data-label="Detalhes"><small>${escapeHtml(log.detalhes)}</small></td>
            </tr>
        `).join("");

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Erro ao carregar logs de auditoria:", error);
    }
}

// Duas iniciais (nome + sobrenome) usadas no avatar circular das tabelas do
// Painel Adm — mesma ideia usada em apps de gestão para não depender de foto.
function iniciais(nome) {
    const partes = String(nome || "?").trim().split(/\s+/);
    const primeira = partes[0]?.[0] || "?";
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
    return (primeira + ultima).toUpperCase();
}

function updateTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, match => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[match]));
}