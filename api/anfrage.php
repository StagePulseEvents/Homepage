<?php
require __DIR__ . '/../lib.php';
header('Content-Type: application/json; charset=utf-8');
$p = $_POST; $g = fn($k) => trim((string)($p[$k] ?? ''));
if ($g('website') !== '') { echo '{"ok":true}'; exit; } // Honeypot
if (!$g('name') || !$g('phone') || !filter_var($g('email'), FILTER_VALIDATE_EMAIL) || empty($p['consent']) || empty($p['items']) || !is_array($p['items'])) {
  http_response_code(422); echo json_encode(['ok' => false, 'error' => 'Bitte alle Pflichtfelder ausfüllen.']); exit;
}
$items = [];
foreach ($p['items'] as $s) $items[] = mb_substr($s, 0, 60) . ' × ' . max(1, (int)($p['qty'][$s] ?? 1));
$items = implode(', ', $items);
db()->prepare('INSERT INTO requests(created,name,phone,email,event,date,place,guests,items,msg) VALUES(?,?,?,?,?,?,?,?,?,?)')
  ->execute([date('c'), mb_substr($g('name'), 0, 100), mb_substr($g('phone'), 0, 40), $g('email'), mb_substr($g('event'), 0, 40), $g('date'), mb_substr($g('place'), 0, 120), (int)$g('guests'), $items, mb_substr($g('msg'), 0, 2000)]);
send($g('email'), 'Deine Anfrage bei StagePulse Events', "Hallo {$g('name')},\n\nvielen Dank, deine Anfrage ist bei uns eingegangen:\n$items\n\nWir melden uns bei dir.\n\nDein Event. Unser Puls.\nStagePulse Events");
send(OWNER_MAIL, 'Neue Anfrage von ' . $g('name'), "Neue Anfrage im Admin-Bereich: $items");
echo '{"ok":true}';
