/* Carrega as partes menores do HTML antes de iniciar o site. */
async function carregarPartesDoSite() {
    const partes = Array.from(document.querySelectorAll('[data-include]'));
    for (const parte of partes) {
        const caminho = parte.getAttribute('data-include');
        const resposta = await fetch(caminho);
        if (!resposta.ok) {
            throw new Error(`Não foi possível carregar: ${caminho}`);
        }
        parte.outerHTML = await resposta.text();
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await carregarPartesDoSite();
        window.__siteReady = true;
        document.dispatchEvent(new Event('site:ready'));
    } catch (erro) {
        console.error(erro);
        document.body.innerHTML = `
            <main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Arial,sans-serif;background:#fff7ed;color:#7c2d12;">
                <section style="max-width:680px;background:white;border:1px solid #fed7aa;border-radius:12px;padding:24px;box-shadow:0 12px 32px rgba(124,45,18,.08);">
                    <h1 style="margin:0 0 12px;font-size:24px;">Não foi possível carregar o site</h1>
                    <p style="margin:0 0 10px;line-height:1.5;">Confira se a pasta <strong>partials</strong> está junto do <strong>index.html</strong> e se você está abrindo pelo <strong>Go Live</strong>.</p>
                    <p style="margin:0;line-height:1.5;"><strong>Detalhe:</strong> ${erro.message}</p>
                </section>
            </main>
        `;
    }
});