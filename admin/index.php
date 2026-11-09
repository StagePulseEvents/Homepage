<?php
require __DIR__ . '/../lib.php';
session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('X-Robots-Tag: noindex');
$e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES);
$csrf = $_SESSION['csrf'] ??= bin2hex(random_bytes(16));
$ok = hash_equals($csrf, $_POST['csrf'] ?? '');
$db = db(); $err = '';
$first = !$db->query('SELECT 1 FROM users')->fetch();
if ($_POST && $ok) {
  $a = $_POST['a'] ?? '';
  if ($a === 'setup' && $first && strlen($_POST['pw']) >= 12) {
    $db->prepare('INSERT INTO users(email,hash,role) VALUES(?,?,?)')->execute([$_POST['email'], password_hash($_POST['pw'], PASSWORD_DEFAULT), 'inhaber']); $first = false;
  } elseif ($a === 'login') {
    sleep(1); $s = $db->prepare('SELECT * FROM users WHERE email=?'); $s->execute([$_POST['email']]); $u = $s->fetch(PDO::FETCH_ASSOC);
    if ($u && password_verify($_POST['pw'], $u['hash'])) { session_regenerate_id(true); $_SESSION['u'] = $u['email']; } else $err = 'Login fehlgeschlagen.';
  } elseif ($a === 'logout') { session_destroy(); header('Location: ./'); exit; }
  elseif (isset($_SESSION['u']) && in_array($a, ['accept', 'reject'])) {
    $r = $db->prepare('SELECT * FROM requests WHERE id=?'); $r->execute([(int)$_POST['id']]); $r = $r->fetch(PDO::FETCH_ASSOC);
    if ($r) {
      $acc = $a === 'accept';
      $db->prepare('UPDATE requests SET status=? WHERE id=?')->execute([$acc ? 'Angenommen' : 'Abgelehnt', $r['id']]);
      $t = $acc ? "wir haben deine Anfrage angenommen und bearbeiten sie jetzt. Du bekommst innerhalb von 3 bis 4 Werktagen einen Anruf oder eine Rückmeldung von uns. Das ist noch keine verbindliche Buchung, ein Angebot folgt separat."
                : "leider können wir deine Anfrage zu dem Termin nicht erfüllen. Melde dich gern für einen anderen Termin.";
      send($r['email'], 'Deine Anfrage bei StagePulse Events', "Hallo {$r['name']},\n\n$t\n\nDeine Anfrage: {$r['items']}, {$r['date']}, {$r['place']}\n\nDein Event. Unser Puls.\nSteven Wilke, StagePulse Events\nTel. 0176 41745539 · " . OWNER_MAIL);
    }
  }
}
?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Admin – StagePulse</title>
<style>body{font:16px/1.5 system-ui;background:#0d0d0e;color:#fff;max-width:900px;margin:auto;padding:1rem}input{padding:.5rem;margin:.2rem 0;display:block}button{background:#f28c1b;border:0;border-radius:6px;padding:.5rem 1rem;font-weight:700;cursor:pointer}.c{background:#1a1a1c;padding:1rem;margin:1rem 0;border-left:4px solid #f28c1b}small{color:#b5b5b8}a{color:#f28c1b}</style></head><body>
<h1>StagePulse Admin</h1>
<?php if ($first): ?>
<form method="post"><h2>Inhaber-Konto anlegen</h2><input type="hidden" name="a" value="setup"><input type="hidden" name="csrf" value="<?=$csrf?>">
<input type="email" name="email" placeholder="E-Mail" required><input type="password" name="pw" placeholder="Passwort (mind. 12 Zeichen)" minlength="12" required><button>Anlegen</button></form>
<?php elseif (!isset($_SESSION['u'])): ?>
<form method="post"><input type="hidden" name="a" value="login"><input type="hidden" name="csrf" value="<?=$csrf?>"><p><?=$e($err)?></p>
<input type="email" name="email" placeholder="E-Mail" required><input type="password" name="pw" placeholder="Passwort" required><button>Einloggen</button></form>
<?php else: ?>
<form method="post"><input type="hidden" name="a" value="logout"><input type="hidden" name="csrf" value="<?=$csrf?>"><button>Ausloggen (<?=$e($_SESSION['u'])?>)</button></form>
<?php foreach ($db->query('SELECT * FROM requests ORDER BY id DESC') as $r): ?>
<div class="c"><strong><?=$e($r['name'])?></strong> · <?=$e($r['status'])?> <small><?=$e($r['created'])?></small><br>
<?=$e($r['items'])?><br><?=$e($r['event'])?>, <?=$e($r['date'])?>, <?=$e($r['place'])?>, <?=$e($r['guests'])?> Gäste<br>
<a href="tel:<?=$e($r['phone'])?>"><?=$e($r['phone'])?></a> · <a href="mailto:<?=$e($r['email'])?>"><?=$e($r['email'])?></a><br><?=nl2br($e($r['msg']))?>
<?php if ($r['status'] === 'Neu'): ?><form method="post" style="margin-top:.6rem"><input type="hidden" name="csrf" value="<?=$csrf?>"><input type="hidden" name="id" value="<?=$r['id']?>">
<button name="a" value="accept">Annehmen</button> <button name="a" value="reject">Ablehnen</button></form><?php endif; ?></div>
<?php endforeach; endif; ?></body></html>
