/* ========================================================
   PONTE SOLIDÁRIA - MÓDULO DE DOAÇÕES, PEDIDOS E MAPAS
   ======================================================== */

function renderRequests() {
    const requestsGrid = document.getElementById("requests-grid");
    if (!requestsGrid) return;

    const requests = state.getRequests();
    
    if (requests.length === 0) {
        requestsGrid.innerHTML = `<p class="no-data">Nenhum pedido de ajuda em aberto.</p>`;
        return;
    }

    requestsGrid.innerHTML = requests.map(req => `
        <div class="card-pedido">
            <h3>${req.name}</h3>
            <p><strong>Necessidade:</strong> ${req.type}</p>
            <p>${req.description}</p>
            <button class="btn btn-primary btn-sm" onclick="abrirChatCom('${req.userId}')">Ajudar Família</button>
        </div>
    `).join('');
}
