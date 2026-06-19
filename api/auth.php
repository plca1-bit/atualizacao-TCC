<?php
require __DIR__ . '/bootstrap.php';
$pdo = db();
$action = $_GET['action'] ?? 'session';
if ($action === 'session') {
    respond(['user' => $_SESSION['user'] ?? null]);
}
if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    respond();
}
$data = input();
if ($action === 'login') {
    require_fields($data, ['email', 'password']);
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $data['email']]);
    $user = $stmt->fetch();
    if (!$user || !password_verify((string) $data['password'], (string) $user['password_hash'])) {
        fail('E-mail ou senha incorretos.', 401);
    }
    if ($user['role'] === 'ong' && $user['status'] === 'rejected') {
        fail('Cadastro de ONG rejeitado. Procure a administracao.', 403);
    }
    $_SESSION['user'] = public_user($user);
    respond(['user' => $_SESSION['user']]);
}
if ($action === 'register') {
    require_fields($data, ['name', 'email', 'password', 'role']);
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        fail('E-mail invalido.', 422);
    }
    if (strlen((string) $data['password']) < 6) {
        fail('A senha deve ter pelo menos 6 caracteres.', 422);
    }
    $role = $data['role'] === 'ong' ? 'ong' : 'common';
    $status = $role === 'ong' ? 'pending' : 'approved';
    try {
        $stmt = $pdo->prepare("
            INSERT INTO users
                (name, email, password_hash, role, document, phone, address, responsible_name, responsible_document, document_file, status)
            VALUES
                (:name, :email, :password_hash, :role, :document, :phone, :address, :responsible_name, :responsible_document, :document_file, :status)
        ");
        $stmt->execute([
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':password_hash' => password_hash((string) $data['password'], PASSWORD_DEFAULT),
            ':role' => $role,
            ':document' => $data['document'] ?? null,
            ':phone' => $data['phone'] ?? null,
            ':address' => $data['address'] ?? null,
            ':responsible_name' => $data['responsible_name'] ?? null,
            ':responsible_document' => $data['responsible_document'] ?? null,
            ':document_file' => $data['document_file'] ?? null,
            ':status' => $status,
        ]);
    } catch (PDOException $error) {
        fail('Este e-mail ja esta cadastrado.', 409);
    }
    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $user = public_user($stmt->fetch());
    $_SESSION['user'] = $user;
    respond(['user' => $user], 201);
}
fail('Acao de autenticacao invalida.', 404);fail('Acao de autenticacao invalida.', 404);