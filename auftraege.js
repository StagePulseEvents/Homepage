// Mitarbeiter-App: zeigt ausschließlich die Aufträge (nur Ansicht), mit Ton und Handy-Benachrichtigung
(() => {
 const $=s=>document.querySelector(s),cfg=window.STAGEPULSE_CONFIG||{};
 if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){$("#login-error").textContent="Supabase ist noch nicht konfiguriert.";return;}
 const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=s=>s?new Date(s).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"}):"—";
 const dde=d=>{if(!d)return "—";const [y,m,t]=String(d).split("-");return t+"."+m+"."+y;};
 let requests=[],knownIds=null,unseen=0,live=false,deferred=null;const fresh=new Set(),baseTitle=document.title;

 async function init(){const {data:{session}}=await sb.auth.getSession();if(session)await enter(session.user);}
 async function enter(user){
  const {data:p}=await sb.from("profiles").select("role,active").eq("id",user.id).single();
  if(!p||!p.active||!["admin","employee"].includes(p.role)){await sb.auth.signOut();$("#login-panel").hidden=false;$("#app-main").hidden=true;$("#logout").hidden=true;$("#login-error").textContent="Kein Zugang. Diese App ist nur für aktive Mitarbeiter.";return;}
  $("#login-panel").hidden=true;$("#app-main").hidden=false;$("#logout").hidden=false;$("#user-label").textContent=user.email;
  await load();startLive();updateNotifyUI();
 }
 $("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
  if(error){$("#login-error").textContent="Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.";return;}$("#login-error").textContent="";await enter(data.user);});
 $("#logout").addEventListener("click",async()=>{await sb.auth.signOut();location.reload();});

 async function load(){
  const {data,error}=await sb.from("inquiries").select("id,full_name,email,phone,event_type,event_date,venue,services,quantities,guest_count,message,status,created_at").order("created_at",{ascending:false});
  if(error){$("#app-error").textContent="Aufträge konnten nicht geladen werden.";return;}$("#app-error").textContent="";requests=data||[];detectNew();render();
 }
 function detectNew(){const ids=new Set(requests.map(r=>r.id));
  if(knownIds){const nw=requests.filter(r=>!knownIds.has(r.id));if(nw.length){nw.forEach(r=>fresh.add(r.id));unseen+=nw.length;if(window.SPPush&&SPPush.soundOn())SPPush.beep();document.title="("+unseen+") Neuer Auftrag";$("#app-info").textContent="🔔 Neuer Auftrag von "+nw.map(r=>r.full_name).join(", ");}}
  knownIds=ids;}
 function render(){$("#list").innerHTML=requests.length?requests.map(r=>`<button class="app-card${fresh.has(r.id)?" fresh":""}" data-id="${r.id}"><div class="app-card-top"><strong>${esc(r.full_name)}</strong><span class="status status-${esc(r.status.toLowerCase().replaceAll(" ","-"))}">${esc(r.status)}</span></div><p>${esc((r.services||[]).join(", "))}</p><p>${esc(r.event_type)} · ${dde(r.event_date)} · ${esc(r.venue||"")}</p><p class="when">Eingegangen ${fmt(r.created_at)}</p></button>`).join(""):'<p class="app-empty">Noch keine Aufträge.</p>';}
 const cell=(l,v)=>`<div class="detail-cell"><small>${l}</small><p>${esc(v||"—")}</p></div>`;
 $("#list").addEventListener("click",ev=>{const c=ev.target.closest(".app-card");if(!c)return;const r=requests.find(x=>x.id===c.dataset.id);if(!r)return;
  fresh.delete(r.id);if(!fresh.size){unseen=0;document.title=baseTitle;$("#app-info").textContent="";}render();
  $("#d-name").textContent=r.full_name;
  $("#d-body").innerHTML=[cell("Status",r.status),cell("Dienstleistungen",(r.services||[]).join(", ")),cell("Veranstaltung",r.event_type+" · "+dde(r.event_date)),cell("Ort",r.venue),cell("Gästezahl",r.guest_count),cell("Mengen / Anzahl",r.quantities),cell("Nachricht",r.message),cell("Telefon",r.phone),cell("E-Mail",r.email),cell("Eingegangen",fmt(r.created_at))].join("");
  $("#d-actions").innerHTML=`<a class="button button-primary" href="tel:${esc(String(r.phone||"").replace(/[^+\d]/g,""))}">Anrufen</a><a class="button button-ghost" href="mailto:${esc(r.email)}">E-Mail schreiben</a>`;
  $("#detail").showModal();});
 $("#d-close").addEventListener("click",()=>$("#detail").close());$("#detail").addEventListener("click",e=>{if(e.target.id==="detail")$("#detail").close();});
 $("#reload").addEventListener("click",load);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){if(knownIds)load();if(unseen&&!fresh.size){unseen=0;document.title=baseTitle;}}});

 function startLive(){if(live)return;live=true;
  try{sb.channel("inquiries-app").on("postgres_changes",{event:"*",schema:"public",table:"inquiries"},()=>load()).subscribe();}catch(e){console.error(e);}
  setInterval(()=>{if(!document.hidden)load();},30000);}

 async function updateNotifyUI(){const S=window.SPPush;if(!S)return;$("#sound-toggle").textContent="Ton: "+(S.soundOn()?"an":"aus");
  const st=await S.state(),b=$("#push-toggle"),m=$("#notify-msg");$("#push-test").hidden=st!=="on";
  if(st==="unsupported"){b.disabled=true;b.textContent="Benachrichtigung nicht verfügbar";m.textContent="Dieser Browser unterstützt keine Benachrichtigungen. Am Handy bitte Chrome verwenden.";}
  else if(st==="denied"){b.disabled=true;b.textContent="Benachrichtigungen blockiert";m.textContent="Bitte in den Einstellungen für diese App Benachrichtigungen erlauben.";}
  else if(st==="on"){b.disabled=false;b.textContent="Benachrichtigung: an";if(!$("#app-info").textContent)m.textContent="Dieses Gerät meldet sich bei jedem neuen Auftrag. Tippen zum Ausschalten.";}
  else{b.disabled=false;b.textContent="Benachrichtigung aktivieren";m.textContent="";}}
 $("#sound-toggle").addEventListener("click",()=>{SPPush.setSound(!SPPush.soundOn());updateNotifyUI();});
 $("#push-toggle").addEventListener("click",async()=>{const b=$("#push-toggle"),m=$("#notify-msg");b.disabled=true;try{if(await SPPush.state()==="on")await SPPush.disable(sb);else await SPPush.enable(sb);m.textContent="";}catch(e){m.textContent=e.message;}b.disabled=false;await updateNotifyUI();});
 $("#push-test").addEventListener("click",async()=>{const m=$("#notify-msg");m.textContent="Test wird gesendet …";try{const r=await SPPush.test(sb);m.textContent=r.sent?"✓ Test gesendet. Die Benachrichtigung erscheint gleich.":"Der Push-Dienst hat den Test nicht angenommen. Bitte aus- und wieder einschalten.";}catch(e){m.textContent=e.message;}});
 window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#install").hidden=false;});
 $("#install").addEventListener("click",async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$("#install").hidden=true;});
 init();
})();
