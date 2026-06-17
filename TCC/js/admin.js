/* ========================================================
   PONTE SOLIDÁRIA - MÓDULO ADMINISTRATIVO (PAINEL ADM)
   ======================================================== */

function renderAdminDashboard() {
    const adminPendingOngsTbody = document.getElementById("admin-pending-ongs-tbody");
    const adminComplaintsList = document.getElementById("admin-complaints-list");

    if (!adminPendingOngsTbody) return;

    const users = state.getUsers();
    const pendingOngs = users.filter(u => u.role === 'ong' && u.status === 'pending');

    adminPendingOngsTbody.innerHTML = pendingOngs.map(ong => `
        <tr>
            <td><strong>${ong.name}</strong></td>
            <td>${ong.cnpj}</td>
            <td><span class="badge-status status-pending">Pendente</span></td>
            <td>
                <button class="btn btn-success btn-sm btn-approve" data-id="${ong.id}">Aprovar</button>
                <button class="btn btn-danger btn-sm btn-reject" data-id="${ong.id}">Rejeitar</button>
            </td>
        </tr>
    `).join('');
}

