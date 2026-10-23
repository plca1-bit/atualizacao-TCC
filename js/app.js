/* ========================================================
   PONTE SOLIDÁRIA - APP.JS
   ======================================================== */

// Controle de navegação das abas em Doações
document.addEventListener("click", (e) => {
  const button = e.target.closest(".donations-tabs .tab-btn");
  if (!button) return;

  const targetId = button.getAttribute("data-tab");
  const activeContent = document.getElementById(targetId);
  if (!targetId || !activeContent) return;
  const tabButtons = document.querySelectorAll(".donations-tabs .tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // Remove a classe ativa de todos os botões e abas
  tabButtons.forEach(btn => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
    // Item 40 da revisão: roving tabindex do padrão WAI-ARIA de tabs —
    // só a aba ativa fica no fluxo normal de Tab; as outras só são
    // alcançáveis pelas setas (ver js/a11y.js).
    btn.setAttribute("tabindex", "-1");
  });
  tabContents.forEach(content => content.classList.remove("active"));

  // Ativa o botão clicado e o conteúdo correspondente
  button.classList.add("active");
  button.setAttribute("aria-selected", "true");
  button.setAttribute("tabindex", "0");
  activeContent.classList.add("active");
});
function alternarAltoContraste() {
    document.body.classList.toggle('high-contrast');
    
    // Salva a preferência do usuário no navegador
    const ativo = document.body.classList.contains('high-contrast');
    localStorage.setItem('altoContraste', ativo ? 'true' : 'false');
}
window.alternarAltoContraste = alternarAltoContraste;

// 🔴 Achado durante a reformulação do Perfil (item 2): css/base/reset.css
// já define html.font-size-sm/md/lg (e as variáveis --font-base-size
// correspondentes) desde antes, mas nenhum script em nenhum lugar do
// projeto jamais aplicava essas classes — a opção de "tamanho de fonte"
// não existia de fato em canto nenhum da interface. Implementado aqui
// para ficar junto do alto contraste (mesmo padrão: aplica a classe,
// salva a preferência, restaura ao carregar a página).
function definirTamanhoFonte(tamanho) {
    const valido = ["sm", "md", "lg"].includes(tamanho) ? tamanho : "md";
    document.documentElement.classList.remove("font-size-sm", "font-size-md", "font-size-lg");
    document.documentElement.classList.add(`font-size-${valido}`);
    localStorage.setItem("tamanhoFonte", valido);
    return valido;
}
window.definirTamanhoFonte = definirTamanhoFonte;

// Restaura as preferências de acessibilidade ao carregar a página.
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('altoContraste') === 'true') {
        document.body.classList.add('high-contrast');
    }
    definirTamanhoFonte(localStorage.getItem("tamanhoFonte") || "md");
});

