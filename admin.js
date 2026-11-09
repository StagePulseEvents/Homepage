(() => {
 const $=s=>document.querySelector(s), cfg=window.STAGEPULSE_CONFIG||{};
 if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){$("#login-error").textContent="Supabase ist noch nicht konfiguriert.";return;}
 const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 let currentUser=null, requests=[], selected=null;
 const statuses=["Neu","Angenommen","In Bearbeitung","Abgeschlossen","Abgelehnt"];
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=s=>s?new Date(s).toLocaleString("de-DE"):"—";
 async function init(){const {data:{session}}=await sb.auth.getSession();if(session)await enter(session.user);}
 async function enter(user){currentUser=user;$("#login-panel").hidden=true;$("#dashboard").hidden=false;$("#user-label").textContent=user.email;await loadRequests();const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).single();if(profile?.role==="admin"){ $("#employee-panel").hidden=false; await loadEmployees(); }}
 $("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error){$("#login-error").textContent="Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.";return;}$("#login-error").textContent="";await enter(data.user);});
 $("#logout").addEventListener("click",async()=>{await sb.auth.signOut();location.reload();});
 $("#refresh").addEventListener("click",loadRequests);$("#status-filter").addEventListener("change",render);$("#search").addEventListener("input",render);
 async function loadRequests(){const {data,error}=await sb.from("inquiries").select("*").order("created_at",{ascending:false});if(error){$("#dashboard-error").textContent="Anfragen konnten nicht geladen werden. Prüfe Benutzerrolle und Datenbankrichtlinien.";return;}requests=data||[];$("#dashboard-error").textContent="";render();}
 function render(){const q=$("#search").value.toLowerCase(),st=$("#status-filter").value;const filtered=requests.filter(r=>(!st||r.status===st)&&[r.full_name,r.email,r.venue,r.event_type].join(" ").toLowerCase().includes(q));$("#request-list").innerHTML=filtered.length?filtered.map(r=>`<article class="request-row" data-id="${r.id}"><div><h3>${esc(r.full_name)}</h3><p>${esc((r.services||[]).join(", "))} · ${esc(r.venue||"")}</p></div><span class="status status-${r.status.toLowerCase().replaceAll(" ","-")}">${esc(r.status)}</span><time>${fmt(r.created_at)}</time></article>`).join(""):'<p class="form-hint">Keine passenden Anfragen gefunden.</p>';document.querySelectorAll(".request-row").forEach(el=>el.addEventListener("click",()=>openRequest(el.dataset.id)));}
 function detailCell(label,value){return `<div class="detail-cell"><small>${label}</small><p>${esc(value||"—")}</p></div>`;}
 async function openRequest(id){selected=requests.find(r=>r.id===id);if(!selected)return;$("#detail-name").textContent=selected.full_name;$("#detail-body").innerHTML=[detailCell("Kontakt",selected.email+" · "+selected.phone),detailCell("Veranstaltungsart",selected.event_type),detailCell("Datum",selected.event_date),detailCell("Ort",selected.venue),detailCell("Dienstleistungen",(selected.services||[]).join(", ")),detailCell("Gästezahl",selected.guest_count),detailCell("Mengen / Anzahl",selected.quantities),detailCell("Nachricht",selected.message),detailCell("Eingegangen",fmt(selected.created_at))].join("")+`<div class="detail-actions"><select id="new-status">${statuses.map(s=>`<option ${s===selected.status?"selected":""}>${s}</option>`).join("")}</select><button id="save-status" class="button button-primary">Status speichern</button></div>`;$("#internal-note").value="";await loadNotes();$("#request-dialog").showModal();$("#save-status").onclick=saveStatus;}
 async function saveStatus(){const status=$("#new-status").value;const {data,error}=await sb.functions.invoke("manage-inquiry",{body:{action:"status",inquiry_id:selected.id,status}});if(error){alert("Status konnte nicht geändert werden. Bitte Berechtigungen und Edge Function prüfen.");return;}selected.status=status;await loadRequests();$("#request-dialog").close();}
 async function loadNotes(){const {data,error}=await sb.from("inquiry_notes").select("id,note,created_at,author_email").eq("inquiry_id",selected.id).order("created_at",{ascending:false});$("#note-list").innerHTML=error?"":(data||[]).map(n=>`<div class="note-item">${esc(n.note)}<small>${esc(n.author_email)} · ${fmt(n.created_at)}</small></div>`).join("");}
 $("#save-note").addEventListener("click",async()=>{const note=$("#internal-note").value.trim();if(!note||!selected)return;const {error}=await sb.from("inquiry_notes").insert({inquiry_id:selected.id,note,author_email:currentUser.email});if(error){alert("Notiz konnte nicht gespeichert werden.");return;}$("#internal-note").value="";await loadNotes();});
 $("#close-request").addEventListener("click",()=>$("#request-dialog").close());
 async function loadEmployees(){
  const {data,error}=await sb.from("profiles").select("id,email,role,active").order("created_at",{ascending:true});
  if(error){$("#employee-list").textContent="Teamkonten konnten nicht geladen werden.";return;}
  $("#employee-list").innerHTML=(data||[]).map(p=>`<div class="employee-row"><div>${esc(p.email)}<small>${esc(p.role)} · ${p.active?"Aktiv":"Deaktiviert"}</small></div>${p.role==="admin"?"<span>Geschäftsführung</span>":`<button class="button button-ghost" data-user="${p.id}" data-active="${p.active}">${p.active?"Deaktivieren":"Aktivieren"}</button>`}</div>`).join("")||"Noch keine Mitarbeiterkonten vorhanden.";
  document.querySelectorAll("#employee-list button[data-user]").forEach(btn=>btn.addEventListener("click",async()=>{
    const active=btn.dataset.active!=="true";
    const {error}=await sb.from("profiles").update({active}).eq("id",btn.dataset.user);
    if(error){alert("Änderung fehlgeschlagen.");return;}
    await loadEmployees();
  }));
}
$("#invite-form").addEventListener("submit",async e=>{e.preventDefault();const email=new FormData(e.currentTarget).get("email");const {error}=await sb.functions.invoke("invite-employee",{body:{email}});$("#invite-message").textContent=error?"Einladung fehlgeschlagen. Prüfe die Admin-Berechtigung.":"Einladung wurde angefordert. Der Mitarbeiter erhält eine E-Mail, sofern SMTP eingerichtet ist.";if(!error){e.currentTarget.reset();await loadEmployees();}});
 init();
})();