<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
session_start();
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $storageDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database';
    if (!is_dir($storageDir)) {
        mkdir($storageDir, 0775, true);
    }
    $pdo = new PDO('sqlite:' . $storageDir . DIRECTORY_SEPARATOR . 'ponte_solidaria.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    migrate($pdo);
    seed($pdo);
    return $pdo;
}
function migrate(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'common',
            document TEXT,
            phone TEXT,
            address TEXT,
            responsible_name TEXT,
            responsible_document TEXT,
            document_file TEXT,
            status TEXT NOT NULL DEFAULT 'approved',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS help_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            family_name TEXT NOT NULL,
            type TEXT NOT NULL,
            family_size INTEGER NOT NULL DEFAULT 1,
            kids INTEGER NOT NULL DEFAULT 0,
            elderly INTEGER NOT NULL DEFAULT 0,
            special TEXT,
            frequency TEXT,
            description TEXT NOT NULL,
            city TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            ong_name TEXT NOT NULL,
            type TEXT NOT NULL,
            target INTEGER NOT NULL,
            current INTEGER NOT NULL DEFAULT 0,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS donations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            donor_name TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Registrada',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    ");
}
function seed(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($count > 0) {
        return;
    }
    $insertUser = $pdo->prepare("
        INSERT INTO users
            (name, email, password_hash, role, document, phone, address, responsible_name, responsible_document, document_file, status)
        VALUES
            (:name, :email, :password_hash, :role, :document, :phone, :address, :responsible_name, :responsible_document, :document_file, :status)
    ");
    $insertUser->execute([
        ':name' => 'Administrador',
        ':email' => 'admin@ponte.org',
        ':password_hash' => password_hash('admin123', PASSWORD_DEFAULT),
        ':role' => 'admin',
        ':document' => null,
        ':phone' => '(11) 90000-0000',
        ':address' => 'Painel administrativo',
        ':responsible_name' => null,
        ':responsible_document' => null,
        ':document_file' => null,
        ':status' => 'approved',
    ]);
    $insertUser->execute([
        ':name' => 'Maria do Carmo',
        ':email' => 'maria@email.com',
        ':password_hash' => password_hash('maria123', PASSWORD_DEFAULT),
        ':role' => 'common',
        ':document' => '222.333.444-55',
        ':phone' => '(11) 98765-4321',
        ':address' => 'Sao Paulo - SP',
        ':responsible_name' => null,
        ':responsible_document' => null,
        ':document_file' => null,
        ':status' => 'approved',
    ]);
    $pdo->exec("
        INSERT INTO help_requests
            (user_id, family_name, type, family_size, kids, elderly, special, frequency, description, city, status)
        VALUES
            (2, 'Familia Silva', 'Alimentos', 4, 2, 0, 'Leite, arroz, feijao e fraldas tamanho G.', 'Mensal', 'Mae desempregada precisa de apoio alimentar para as criancas.', 'Sao Paulo - SP', 'active'),
            (2, 'Familia Oliveira', 'Higiene', 3, 1, 1, 'Produtos de higiene e fraldas geriatricas.', 'Pontual', 'Familia precisa montar um kit de higiene basico.', 'Osasco - SP', 'active');
        INSERT INTO campaigns
            (title, ong_name, type, target, current, description, status)
        VALUES
            ('Prato Cheio de Esperanca', 'ONG Amor ao Proximo', 'Alimentos', 100, 42, 'Arrecadacao de cestas basicas para familias cadastradas.', 'active'),
            ('Inverno sem Frio', 'Instituto Maos Amigas', 'Roupas', 200, 155, 'Campanha de cobertores e agasalhos para pessoas vulneraveis.', 'active');
        INSERT INTO donations
            (user_id, donor_name, type, amount, description, status)
        VALUES
            (2, 'Roberto Souza', 'Alimentos', 80, 'Cesta basica completa', 'Entregue');
    ");
}
function input(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('JSON invalido.', 400);
    }
    return $data;
}
function respond(array $data = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
function require_fields(array $data, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
            fail("Campo obrigatorio ausente: {$field}", 422);
        }
    }
}
function public_user(array $user): array
{
    unset($user['password_hash']);
    return $user;
}
