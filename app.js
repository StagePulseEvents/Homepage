(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  $("#year").textContent = new Date().getFullYear();
  const menu = $(".menu-toggle"), nav = $(".main-nav");
  menu.addEventListener("click", () => { const open=nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); });
  $$(".main-nav a").forEach(a => a.addEventListener("click",()=>nav.classList.remove("open")));
  const form=$("#inquiry-form"), steps=$$(".form-step",form), progress=$(".form-progress i",form);
  let step=1;
  const showStep=n=>{step=n;steps.forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===n));progress.style.width=n===1?"50%":"100%";$(".form-top span:last-child",form).textContent=n===1?"01 — 02":"02 — 02";};
  $$(".inquiry-shortcut").forEach(btn=>btn.addEventListener("click",()=>{$$('[name="services"]',form).forEach(c=>c.checked=c.value===btn.dataset.service);$("#anfrage").scrollIntoView({behavior:"smooth"});}));
  $(".form-next",form).addEventListener("click",()=>{const required=["event_type","event_date","venue"];let valid=true;required.forEach(n=>{const el=form.elements[n];if(!el.value.trim()){el.reportValidity();valid=false;}});if(!$$('[name="services"]:checked',form).length){showError("Bitte wähle mindestens eine Dienstleistung aus.");valid=false;}if(valid){$(".form-error",form).hidden=true;showStep(2);}});
  $(".form-back",form).addEventListener("click",()=>showStep(1));
  function showError(msg){const el=$(".form-error",form);el.textContent=msg;el.hidden=false;}
  form.addEventListener("submit",async e=>{
    e.preventDefault();$(".form-error",form).hidden=true;
    if(!form.reportValidity())return;
    const cfg=window.STAGEPULSE_CONFIG||{};
    if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){showError("Das Anfrage-System ist noch nicht verbunden. Bitte kontaktiere uns direkt per Telefon oder E-Mail.");return;}
    const data=new FormData(form);
    const payload={full_name:data.get("full_name"),phone:data.get("phone"),email:data.get("email"),event_type:data.get("event_type"),event_date:data.get("event_date"),venue:data.get("venue"),services:data.getAll("services"),quantities:data.get("quantities"),guest_count:data.get("guest_count")?Number(data.get("guest_count")):null,message:data.get("message")};
    const submit=$('button[type="submit"]',form);submit.disabled=true;submit.textContent="Wird gesendet …";
    try{
      const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
      const {data:result,error}=await client.functions.invoke("submit-inquiry",{body:payload});
      if(error)throw error;
      steps.forEach(s=>s.classList.remove("active"));$(".form-success",form).hidden=false;progress.style.width="100%";form.reset();
    }catch(err){console.error(err);showError("Deine Anfrage konnte gerade nicht gesendet werden. Bitte versuche es erneut oder nutze Telefon/E-Mail.");}
    finally{submit.disabled=false;submit.innerHTML='Anfrage senden <span>↗</span>';}
  });
  const dialog=$("#notice-dialog");$(".dialog-close").addEventListener("click",()=>dialog.close());
})();