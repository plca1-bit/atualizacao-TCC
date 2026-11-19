/* ========================================================
   PONTE SOLIDÁRIA — ACESSIBILIDADE (item 40 da revisão)
   ========================================================
   Duas coisas que faltavam e são comuns a TODOS os modais do site
   (login, cadastro, doação, campanha, editar perfil), então foram
   resolvidas aqui uma vez só, de forma genérica, em vez de mexer em
   cada botão de abrir/fechar espalhado por js/auth.js, js/doacoes.js
   e js/app.js:

   1) Foco ao abrir/fechar modal. Antes, todo modal só alternava a
      classe "hidden" — o foco do teclado continuava onde estava (às
      vezes atrás do próprio modal, invisível) e, ao fechar, não
      voltava pro botão que abriu. Agora, sempre que um elemento
      ".modal-backdrop" perde "hidden": o foco vai pro primeiro campo
      focável dele (ou pro card, como fallback) e um "focus trap"
      impede Tab/Shift+Tab de escapar pro resto da página enquanto
      ele estiver aberto — exatamente como qualquer diálogo modal
      acessível deveria se comportar (ver WAI-ARIA Dialog Pattern).
      Ao fechar (ganha "hidden" de novo, ou Esc), o foco volta pro
      elemento que tinha aberto o modal.

   2) Navegação por setas nas abas do Portal de Doações
      (".donations-tabs[role=tablist]"). Antes, dava pra clicar ou
      usar Tab botão por botão, mas não existia o padrão de tablist
      do WAI-ARIA (seta esquerda/direita move E ativa a aba; Home/End
      pulam pra primeira/última). Implementado abaixo.
   ======================================================== */

(function () {
    "use strict";

    const SELETOR_FOCAVEL = [
        "a[href]", "button:not([disabled])", "input:not([disabled]):not([type=hidden])",
        "select:not([disabled])", "textarea:not([disabled])", '[tabindex]:not([tabindex="-1"])'
    ].join(",");

    // elemento que tinha o foco antes de cada modal abrir, pra devolver
    // o foco a ele quando o modal fechar.
    const gatilhoPorModal = new WeakMap();

    function elementosFocaveis(modal) {
        return Array.from(modal.querySelectorAll(SELETOR_FOCAVEL))
            .filter((el) => el.offsetParent !== null); // ignora os escondidos
    }

    function aoAbrirModal(modal) {
        gatilhoPorModal.set(modal, document.activeElement);
        const focaveis = elementosFocaveis(modal);
        // Foca o primeiro campo de verdade (não o botão de fechar), pra
        // quem usa teclado cair direto na tarefa; se não houver nenhum,
        // foca o próprio card do modal.
        const alvo = focaveis.find((el) => !el.classList.contains("modal-close-btn")) || focaveis[0];
        if (alvo) {
            alvo.focus();
        } else {
            const card = modal.querySelector(".modal-card");
            if (card) {
                card.setAttribute("tabindex", "-1");
                card.focus();
            }
        }
    }

    function aoFecharModal(modal) {
        const gatilho = gatilhoPorModal.get(modal);
        gatilhoPorModal.delete(modal);
        if (gatilho && typeof gatilho.focus === "function" && document.contains(gatilho)) {
            gatilho.focus();
        }
    }

    function modalVisivel(modal) {
        return modal && !modal.classList.contains("hidden");
    }

    function modalAbertoNoMomento() {
        return Array.from(document.querySelectorAll(".modal-backdrop"))
            .find((m) => modalVisivel(m)) || null;
    }

    // Trap de Tab: enquanto algum modal estiver visível, Tab/Shift+Tab
    // não saem dele. Um único listener cobre todos os modais.
    document.addEventListener("keydown", (event) => {
        const modal = modalAbertoNoMomento();
        if (!modal) return;

        if (event.key === "Escape") {
            const fecharBtn = modal.querySelector(".modal-close-btn");
            // Reaproveita o botão de fechar de cada modal (em vez de só
            // esconder a div aqui), porque alguns fecham fazendo mais
            // coisa além de esconder (ex.: resetar um wizard de etapas).
            if (fecharBtn) fecharBtn.click();
            return;
        }

        if (event.key !== "Tab") return;
        const focaveis = elementosFocaveis(modal);
        if (!focaveis.length) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (event.shiftKey && document.activeElement === primeiro) {
            event.preventDefault();
            ultimo.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
            event.preventDefault();
            primeiro.focus();
        }
    });

    // Observa a classe "hidden" de cada modal pra saber quando abre/fecha,
    // sem precisar alterar os handlers de abrir/fechar já existentes em
    // js/auth.js, js/doacoes.js e js/app.js — eles continuam só dando
    // classList.add/remove("hidden") normalmente.
    function observarModal(modal) {
        let estavaVisivel = modalVisivel(modal);
        new MutationObserver(() => {
            const agoraVisivel = modalVisivel(modal);
            if (agoraVisivel && !estavaVisivel) aoAbrirModal(modal);
            if (!agoraVisivel && estavaVisivel) aoFecharModal(modal);
            estavaVisivel = agoraVisivel;
        }).observe(modal, { attributes: true, attributeFilter: ["class"] });
    }

    function initFocoDosModais() {
        document.querySelectorAll(".modal-backdrop").forEach(observarModal);
    }

    // ---------- Navegação por setas na tablist do Portal de Doações ----------
    function initTablistDoacoes() {
        const tablist = document.querySelector(".donations-tabs[role='tablist']");
        if (!tablist || tablist.dataset.a11yTabsReady) return;
        tablist.dataset.a11yTabsReady = "true";

        tablist.addEventListener("keydown", (event) => {
            const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
            const atual = tabs.indexOf(document.activeElement);
            if (atual === -1) return;

            let alvo = null;
            if (event.key === "ArrowRight") alvo = tabs[(atual + 1) % tabs.length];
            else if (event.key === "ArrowLeft") alvo = tabs[(atual - 1 + tabs.length) % tabs.length];
            else if (event.key === "Home") alvo = tabs[0];
            else if (event.key === "End") alvo = tabs[tabs.length - 1];
            if (!alvo) return;

            event.preventDefault();
            alvo.focus();
            alvo.click(); // reaproveita o handler de troca de aba já existente (js/app.js)
        });
    }

    document.addEventListener("includesLoaded", () => {
        initFocoDosModais();
        initTablistDoacoes();
    });
})();
