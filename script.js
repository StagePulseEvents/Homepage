(() => {
  const S = ['Ton- und Lichttechnik (ohne Bühne)','Bierzelt','Bierzeltgarnituren','Stehtische','Catering-Personalservice','Plakatierservice','DJ-Allround-Service'];
  const dlg = document.getElementById('dlg'), f = document.getElementById('f'), msg = document.getElementById('msg');
  document.getElementById('opts').innerHTML = S.map(s => `<label class="o"><input type="checkbox" name="items[]" value="${s}"> ${s}<input type="number" name="qty[${s}]" value="1" min="1" aria-label="Menge ${s}"></label>`).join('');
  document.querySelectorAll('[data-ask]').forEach(b => b.addEventListener('click', () => {
    f.reset(); msg.textContent = '';
    const v = b.dataset.ask; if (v) f.querySelectorAll('[name="items[]"]').forEach(c => { c.checked = c.value === v; });
    dlg.showModal();
  }));
  document.getElementById('x').addEventListener('click', () => dlg.close());
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!f.querySelector('[name="items[]"]:checked')) { msg.textContent = 'Bitte mindestens eine Leistung wählen.'; return; }
    msg.textContent = 'Wird gesendet …';
    try {
      const r = await fetch(f.action, { method: 'POST', body: new FormData(f) });
      const j = await r.json();
      msg.textContent = j.ok ? 'Danke! Deine Anfrage ist eingegangen, eine Bestätigung kommt per E-Mail.' : j.error;
      if (j.ok) f.reset();
    } catch { msg.textContent = 'Senden fehlgeschlagen. Bitte ruf uns an: 0176 41745539.'; }
  });
})();
