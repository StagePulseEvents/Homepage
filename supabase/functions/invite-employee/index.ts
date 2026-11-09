import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization");if(!auth)return json({error:"Unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db=createClient(url,service);const {data:{user},error}=await db.auth.getUser(auth.replace("Bearer ",""));
  if(error||!user)return json({error:"Unauthorized"},401);
  const {data:profile}=await db.from("profiles").select("role,active").eq("id",user.id).single();
  if(profile?.role!=="admin"||!profile.active)return json({error:"Forbidden"},403);
  const {email}=await req.json();if(typeof email!=="string"||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"Invalid email"},400);
  const {error:inviteError}=await db.auth.admin.inviteUserByEmail(email);
  if(inviteError)throw inviteError;
  return json({ok:true});
 }catch(e){console.error(e);return json({error:"Invitation failed"},500);}
});
