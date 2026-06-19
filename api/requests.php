<?php
require __DIR__ . '/bootstrap.php';

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $pdo->query("
        SELECT id, user_id, family_name, type, family_size, kids, elderly, special, frequency, description, city, status, date(created_at) AS created_at
        FROM help_requests
        ORDER BY id DESC
    ")->fetchAll();

    respond(['requests' => $rows]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Metodo nao permitido.', 405);
}

$data = input();
require_fields($data, ['family_name', 'type', 'description']);

$stmt = $pdo->prepare("
    INSERT INTO help_requests
        (user_id, family_name, type, family_size, kids, elderly, special, frequency, description, city, status)
    VALUES
        (:user_id, :family_name, :type, :family_size, :kids, :elderly, :special, :frequency, :description, :city, 'active')
");

$stmt->execute([
    ':user_id' => $data['user_id'] ?? null,
    ':family_name' => $data['family_name'],
    ':type' => $data['type'],
    ':family_size' => (int) ($data['family_size'] ?? 1),
    ':kids' => (int) ($data['kids'] ?? 0),
    ':elderly' => (int) ($data['elderly'] ?? 0),
    ':special' => $data['special'] ?? null,
    ':frequency' => $data['frequency'] ?? null,
    ':description' => $data['description'],
    ':city' => $data['city'] ?? null,
]);

$id = (int) $pdo->lastInsertId();
$stmt = $pdo->prepare('SELECT *, date(created_at) AS created_at FROM help_requests WHERE id = :id');
$stmt->execute([':id' => $id]);

respond(['request' => $stmt->fetch()], 201);
