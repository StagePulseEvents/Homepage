import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.1";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const body=await req.json();
  const required=["full_name","phone","email","event_type","event_date","venue"];
  if(required.some(k=>typeof body[k]!=="string"||!body[k].trim()))return json({error:"Missing required fields"},400);
  if(!Array.isArray(body.services)||body.services.length<1||body.services.length>6)return json({error:"Select at least one service"},400);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return json({error:"Invalid email"},400);
  if(body.full_name.length>160||body.message?.length>5000||body.quantities?.length>1500)return json({error:"Input too long"},400);
  const allowed=["Ton- und Lichttechnik","Bierzelt- und Zeltverleih","Bierzeltgarnituren und Stehtische","Catering-Personal-Service","Plakatier-Service","DJ-Allround-Service"];
  if(body.services.some((s:string)=>!allowed.includes(s)))return json({error:"Invalid service"},400);
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db=createClient(url,key);
  const {data,error}=await db.from("inquiries").insert({
   full_name:body.full_name.trim(),phone:body.phone.trim(),email:body.email.trim().toLowerCase(),
   event_type:body.event_type.trim(),event_date:body.event_date,venue:body.venue.trim(),
   services:body.services,quantities:body.quantities||null,guest_count:Number.isInteger(body.guest_count)?body.guest_count:null,
   message:body.message||null
  }).select("id,created_at").single();
  if(error)throw error;
  const resendKey=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("MAIL_FROM"),owner=Deno.env.get("INTERNAL_NOTIFY_EMAIL");
  let emailSent=false;
  if(resendKey&&from){
   try{
    const mail=new Resend(resendKey);
    await mail.emails.send({from,to:[body.email],subject:"Wir haben deine Anfrage erhalten – StagePulse Events",
     html:`<p>Hallo ${escapeHtml(body.full_name)},</p><p>vielen Dank für deine Anfrage bei StagePulse Events!</p><p>Wir haben deine Angaben erhalten und melden uns zur Abstimmung der Einzelheiten. Eine Anfrage ist noch keine verbindliche Buchungsbestätigung.</p><p>Dein Team von StagePulse Events</p>`});
    if(owner)await mail.emails.send({from,to:[owner],subject:"Neue Kundenanfrage – StagePulse Events",html:`<p>Neue Anfrage von ${escapeHtml(body.full_name)} (${escapeHtml(body.email)}).</p><p>Leistungen: ${body.services.map(escapeHtml).join(", ")}</p><p>Veranstaltung: ${escapeHtml(body.event_type)} am ${escapeHtml(body.event_date)} in ${escapeHtml(body.venue)}.</p><p>Anfrage-ID: ${data.id}</p>`});
    emailSent=true;
   }catch(mailError){console.error("Inquiry saved; email delivery failed",mailError);}
  }
  return json({ok:true,id:data.id,email_sent:emailSent});
 }catch(e){console.error(e);return json({error:"Could not submit inquiry"},500);}
});
function escapeHtml(v:string){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
