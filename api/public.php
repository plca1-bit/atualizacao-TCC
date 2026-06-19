<?php
require __DIR__ . '/bootstrap.php';

$pdo = db();

$requests = $pdo->query("
    SELECT id, user_id, family_name, type, family_size, kids, elderly, special, frequency, description, city, status, date(created_at) AS created_at
    FROM help_requests
    WHERE status = 'active'
    ORDER BY id DESC
")->fetchAll();

$campaigns = $pdo->query("
    SELECT id, title, ong_name, type, target, current, description, status
    FROM campaigns
    ORDER BY id DESC
")->fetchAll();

$donations = $pdo->query("
    SELECT id, user_id, donor_name, type, amount, description, status, date(created_at) AS created_at
    FROM donations
    ORDER BY id DESC
    LIMIT 20
")->fetchAll();

respond([
    'requests' => $requests,
    'campaigns' => $campaigns,
    'donations' => $donations,
]);
