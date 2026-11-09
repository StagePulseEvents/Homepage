import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.1";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization");if(!auth)return json({error:"Unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin=createClient(url,service);
  const token=auth.replace("Bearer ","");
  const {data:{user},error:uerr}=await admin.auth.getUser(token);
  if(uerr||!user)return json({error:"Unauthorized"},401);
  const {data:profile}=await admin.from("profiles").select("role,active").eq("id",user.id).single();
  if(!profile?.active||!["admin","employee"].includes(profile.role))return json({error:"Forbidden"},403);
  const {action,inquiry_id,status}=await req.json();
  if(action!=="status"||typeof inquiry_id!=="string"||!["Neu","Angenommen","In Bearbeitung","Abgeschlossen","Abgelehnt"].includes(status))return json({error:"Invalid request"},400);
  const {data:before,error:readErr}=await admin.from("inquiries").select("*").eq("id",inquiry_id).single();
  if(readErr||!before)return json({error:"Not found"},404);
  const {error}=await admin.from("inquiries").update({status,updated_at:new Date().toISOString()}).eq("id",inquiry_id);
  if(error)throw error;
  if(status==="Angenommen"&&before.status!=="Angenommen"){
   const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("MAIL_FROM");
   if(key&&from){const mail=new Resend(key);await mail.emails.send({from,to:[before.email],subject:"Update zu deiner Anfrage – StagePulse Events",html:`<p>Vielen Dank für deine Anfrage bei StagePulse Events!</p><p>Wir haben deine Anfrage erhalten und angenommen. Unser Team wird sich innerhalb von 3–4 Werktagen telefonisch oder per E-Mail bei dir melden, um die weiteren Einzelheiten zu besprechen.</p><p>Wir freuen uns auf deine Veranstaltung!</p><p>Dein Team von StagePulse Events</p><hr><p>Wichtig: Die Annahme deiner Anfrage ist noch keine verbindliche Buchungsbestätigung.</p>`});}
  }
  return json({ok:true});
 }catch(e){console.error(e);return json({error:"Could not update inquiry"},500);}
});
