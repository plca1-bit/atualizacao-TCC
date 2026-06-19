<?php
require __DIR__ . '/bootstrap.php';
$pdo = db();
if (($_SESSION['user']['role'] ?? '') !== 'admin') {
    fail('Acesso restrito ao administrador.', 403);
}
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $pendingOngs = $pdo->query("
        SELECT id, name, email, document, responsible_name, responsible_document, document_file, status, date(created_at) AS created_at
        FROM users
        WHERE role = 'ong'
        ORDER BY id DESC
    ")->fetchAll();
    respond(['ongs' => $pendingOngs]);
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = input();
    require_fields($data, ['id', 'status']);
    if (!in_array($data['status'], ['approved', 'rejected', 'pending'], true)) {
        fail('Status invalido.', 422);
    }
    $stmt = $pdo->prepare("UPDATE users SET status = :status WHERE id = :id AND role = 'ong'");
    $stmt->execute([
        ':status' => $data['status'],
        ':id' => (int) $data['id'],
    ]);
    respond();
}
fail('Metodo nao permitido.', 405);
