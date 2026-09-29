/* ========================================================
   PONTE SOLIDÁRIA — PAINEL DE ACESSIBILIDADE (item 6 da revisão)
   ========================================================
   Liga o botão fixo + painel (markup em index.html, termos.html e
   privacidade.html) às funções que já existem:
     - window.alternarAltoContraste  (js/app.js)
     - window.definirTamanhoFonte    (js/app.js)
   e adiciona as que faltavam:
     - reduzir animações
     - destacar links
     - VLibras (Libras)

   O painel usa a classe ".modal-backdrop", então o focus trap e o
   Esc-para-fechar já genéricos de js/a11y.js cobrem ele de graça —
   este arquivo só cuida de abrir/fechar e sincronizar os estados.
   ======================================================== */

(function () {
    "use strict";

    function alternarClasse(alvo, classe, chaveStorage) {
        alvo.classList.toggle(classe);
        const ativo = alvo.classList.contains(classe);
        localStorage.setItem(chaveStorage, ativo ? "true" : "false");
        return ativo;
    }

    // ---------- Reduzir animações ----------
    function alternarReduzirAnimacoes() {
        return alternarClasse(document.documentElement, "reduce-motion", "reduzirAnimacoes");
    }

    // ---------- Destacar links ----------
    function alternarDestacarLinks() {
        return alternarClasse(document.body, "highlight-links", "destacarLinks");
    }

    // ---------- VLibras ----------
    // Carregado só na primeira ativação (evita peso pra quem não usa),
    // e depois só alterna visibilidade — o próprio widget oficial
    // guarda seu estado internamente.
    let vlibrasCarregado = false;
    function garantirWidgetVLibras() {
        if (vlibrasCarregado) return;
        vlibrasCarregado = true;

        const container = document.createElement("div");
        container.setAttribute("vw", "");
        container.className = "enabled";
        container.innerHTML = `
            <div vw-access-button class="active"></div>
            <div vw-plugin-wrapper>
                <div class="vw-plugin-top-wrapper"></div>
            </div>
        `;
        document.body.appendChild(container);

        const script = document.createElement("script");
        script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
        script.onload = () => {
            if (window.VLibras) new window.VLibras.Widget("https://vlibras.gov.br/app");
        };
        script.onerror = () => {
            window.showToast?.("Não foi possível carregar o tradutor de Libras agora. Tente novamente mais tarde.", "danger");
        };
        document.body.appendChild(script);
    }

    function alternarLibras() {
        const ativo = localStorage.getItem("librasAtivo") !== "true";
        localStorage.setItem("librasAtivo", ativo ? "true" : "false");
        if (ativo) {
            garantirWidgetVLibras();
            document.querySelector("div[vw]")?.classList.remove("ponte-vlibras-hidden");
        } else {
            document.querySelector("div[vw]")?.classList.add("ponte-vlibras-hidden");
        }
        return ativo;
    }

    // ---------- Sincroniza os botões do painel com o estado atual ----------
    function sincronizarPainel() {
        const contrasteBtn = document.getElementById("a11y-panel-contraste-btn");
        if (contrasteBtn) {
            const ativo = document.body.classList.contains("high-contrast");
            contrasteBtn.setAttribute("aria-pressed", String(ativo));
        }

        const animacoesBtn = document.getElementById("a11y-panel-animacoes-btn");
        if (animacoesBtn) {
            const ativo = document.documentElement.classList.contains("reduce-motion");
            animacoesBtn.setAttribute("aria-pressed", String(ativo));
        }

        const linksBtn = document.getElementById("a11y-panel-links-btn");
        if (linksBtn) {
            const ativo = document.body.classList.contains("highlight-links");
            linksBtn.setAttribute("aria-pressed", String(ativo));
        }

        const librasBtn = document.getElementById("a11y-panel-libras-btn");
        if (librasBtn) {
            const ativo = localStorage.getItem("librasAtivo") === "true";
            librasBtn.setAttribute("aria-pressed", String(ativo));
        }

        const tamanhoAtual = localStorage.getItem("tamanhoFonte") || "md";
        document.querySelectorAll("#a11y-panel .font-size-btn").forEach((btn) => {
            btn.setAttribute("aria-pressed", String(btn.getAttribute("data-tamanho") === tamanhoAtual));
        });
    }

    // ---------- Restaura preferências ao carregar a página ----------
    function restaurarPreferencias() {
        if (localStorage.getItem("reduzirAnimacoes") === "true") {
            document.documentElement.classList.add("reduce-motion");
        }
        if (localStorage.getItem("destacarLinks") === "true") {
            document.body.classList.add("highlight-links");
        }
        if (localStorage.getItem("librasAtivo") === "true") {
            garantirWidgetVLibras();
        }
    }

    function initPainel() {
        const fab = document.getElementById("a11y-fab-btn");
        const painel = document.getElementById("a11y-panel");
        if (!fab || !painel) return; // página sem o painel (não deveria acontecer)

        fab.addEventListener("click", () => {
            sincronizarPainel();
            painel.classList.remove("hidden");
            fab.setAttribute("aria-expanded", "true");
        });

        function fechar() {
            painel.classList.add("hidden");
            fab.setAttribute("aria-expanded", "false");
        }
        document.getElementById("a11y-panel-close-btn")?.addEventListener("click", fechar);

        document.getElementById("a11y-panel-contraste-btn")?.addEventListener("click", () => {
            window.alternarAltoContraste?.();
            sincronizarPainel();
        });
        document.getElementById("a11y-panel-animacoes-btn")?.addEventListener("click", () => {
            alternarReduzirAnimacoes();
            sincronizarPainel();
        });
        document.getElementById("a11y-panel-links-btn")?.addEventListener("click", () => {
            alternarDestacarLinks();
            sincronizarPainel();
        });
        document.getElementById("a11y-panel-libras-btn")?.addEventListener("click", () => {
            alternarLibras();
            sincronizarPainel();
        });
        document.querySelectorAll("#a11y-panel .font-size-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                window.definirTamanhoFonte?.(btn.getAttribute("data-tamanho"));
                sincronizarPainel();
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }

    // O botão e o painel são markup estático (presentes em index.html,
    // termos.html e privacidade.html desde o carregamento inicial — não
    // dependem dos includes assíncronos de js/includes.js), então já
    // existem no DOMContentLoaded em todas as páginas.
    document.addEventListener("DOMContentLoaded", () => {
        restaurarPreferencias();
        initPainel();
    });
})();
