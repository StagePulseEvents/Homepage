<?php
const OWNER_MAIL = 'info-stagepulseevents@gmx.de';
function db() {
  static $d;
  if (!$d) {
    $d = new PDO('sqlite:' . __DIR__ . '/data/app.db');
    $d->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $d->exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,hash TEXT,role TEXT);
    CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY,created TEXT,name TEXT,phone TEXT,email TEXT,event TEXT,date TEXT,place TEXT,guests INT,items TEXT,msg TEXT,status TEXT DEFAULT 'Neu')");
  }
  return $d;
}
function send($to, $subject, $body) {
  return mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body,
    "From: StagePulse Events <" . OWNER_MAIL . ">\r\nContent-Type: text/plain; charset=UTF-8");
}
