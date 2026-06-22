import { useState, useRef, useEffect, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPA_URL = "https://csdbtnfachdxafczqnal.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZGJ0bmZhY2hkeGFmY3pxbmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDA0MDQsImV4cCI6MjA5NzM3NjQwNH0.qa7YXHxjnCji0MXHvb5_geSiqAd1MlBc9B2RhUd4wpE";
const GOLD = "#7C3AED"; // Violet électrique (couleur principale)
const ORANGE = "#FF6B2B"; // Orange vif (accent/CTA)
const BLUE = "#2563EB"; // Bleu électrique (secondaire)
const GRAD = "linear-gradient(135deg,#7C3AED,#2563EB)"; // Gradient violet→bleu
const GRAD_O = "linear-gradient(135deg,#FF6B2B,#FF9500)"; // Gradient orange
const SHIP = [{l:"Lettre suivie",p:2.99},{l:"Colissimo S",p:3.99},{l:"Colissimo M",p:4.99},{l:"Mondial Relay S",p:3.49},{l:"Mondial Relay M",p:4.99},{l:"Colissimo L",p:6.99},{l:"Colissimo XL",p:8.99}];
const ETAT = ["Neuf avec étiquette","Neuf sans étiquette","Très bon état","Bon état","Satisfaisant"];
const ETAT_C = ["#34c759","#30d158","#007aff","#ff9500","#ff3b30"];
const PLATFORMS = ["Vinted","Leboncoin","eBay","Depop","Vestiaire"];
const TABS = [{id:"annonce",icon:"✦",label:"Annonce"},{id:"tendances",icon:"📈",label:"Tendances"},{id:"marge",icon:"💰",label:"Marge"},{id:"agent",icon:"🤖",label:"Agent"},{id:"stock",icon:"📦",label:"Stock"},{id:"reponses",icon:"💬",label:"Réponses"},{id:"reopt",icon:"🔄",label:"Ré-opt."},{id:"ventes",icon:"📊",label:"Ventes"},{id:"historique",icon:"🕓",label:"Historique"},{id:"extension",icon:"🧩",label:"Extension"}];

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const supa = {
  async select(table,filters,tok){const q=filters?"?"+Object.entries(filters).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join("&")+"&order=created_at.desc&limit=100":"?order=created_at.desc&limit=100";const res=await fetch(`${SUPA_URL}/rest/v1/${table}${q}`,{headers:{apikey:SUPA_KEY,Authorization:`Bearer ${tok||SUPA_KEY}`,"Content-Type":"application/json"}});return res.json();},
  async insert(table,data,tok){const res=await fetch(`${SUPA_URL}/rest/v1/${table}`,{method:"POST",headers:{apikey:SUPA_KEY,Authorization:`Bearer ${tok||SUPA_KEY}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(data)});const d=await res.json();return Array.isArray(d)?d[0]:d;},
  async update(table,id,data,tok){await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`,{method:"PATCH",headers:{apikey:SUPA_KEY,Authorization:`Bearer ${tok||SUPA_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(data)});},
  async delete(table,id,tok){await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`,{method:"DELETE",headers:{apikey:SUPA_KEY,Authorization:`Bearer ${tok||SUPA_KEY}`,"Content-Type":"application/json"}});},
  async deleteWhere(table,field,value,tok){await fetch(`${SUPA_URL}/rest/v1/${table}?${field}=eq.${encodeURIComponent(value)}`,{method:"DELETE",headers:{apikey:SUPA_KEY,Authorization:`Bearer ${tok||SUPA_KEY}`,"Content-Type":"application/json"}});},
  async upsert(table,data,conflict,tok){await fetch(`${SUPA_URL}/rest/v1/${table}?on_conflict=${conflict}`,{method:"POST",headers:{apikey:SUPA_KEY,Authorization:`Bearer ${tok||SUPA_KEY}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(data)});},
  async signUp(email,password){const res=await fetch(`${SUPA_URL}/auth/v1/signup`,{method:"POST",headers:{apikey:SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});return res.json();},
  async signIn(email,password){const res=await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});return res.json();},
  async resetPassword(email){await fetch(`${SUPA_URL}/auth/v1/recover`,{method:"POST",headers:{apikey:SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({email})});},
  async refreshToken(refresh_token){const res=await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token})});return res.json();}
};

const db = {
  async getListings(uid,tok){const d=await supa.select("listings",{user_id:uid},tok);return Array.isArray(d)?d:[];},
  async addListing(uid,e,tok){return supa.insert("listings",{user_id:uid,date:e.date,result:e.result},tok);},
  async delListing(uid,id,tok){return supa.delete("listings",id,tok);},
  async clearListings(uid,tok){return supa.deleteWhere("listings","user_id",uid,tok);},
  async getStock(uid,tok){const d=await supa.select("stock",{user_id:uid},tok);return Array.isArray(d)?d:[];},
  async addStock(uid,a,tok){return supa.insert("stock",{user_id:uid,titre:a.titre,marque:a.marque||"",taille:a.taille||"",prix:a.prix||"",plateforme:a.plateforme||"Vinted",etat:a.etat||"",notes:a.notes||"",statut:a.statut||"en_vente",date_ajout:a.dateAjout||""},tok);},
  async updStock(uid,id,fields,tok){return supa.update("stock",id,{...fields,updated_at:new Date().toISOString()},tok);},
  async delStock(uid,id,tok){return supa.delete("stock",id,tok);},
  async getVentes(uid,tok){const d=await supa.select("ventes",{user_id:uid},tok);return Array.isArray(d)?d:[];},
  async addVente(uid,v,tok){return supa.insert("ventes",{user_id:uid,article:v.article,prix_vente:v.prix_vente||"",prix_achat:v.prix_achat||"",plateforme:v.plateforme||"Vinted",date:v.date||""},tok);},
  async delVente(uid,id,tok){return supa.delete("ventes",id,tok);},
  async getPrefs(uid,tok){const d=await supa.select("preferences",{user_id:uid},tok);return Array.isArray(d)&&d.length>0?d[0]:null;},
  async savePrefs(uid,p,tok){return supa.upsert("preferences",{user_id:uid,...p,updated_at:new Date().toISOString()},"user_id",tok);},
  async migrate(uid,tok){try{let count=0;const lsL=JSON.parse(localStorage.getItem("vh2")||"[]");const lsS=JSON.parse(localStorage.getItem("listai_stock")||"[]");const lsV=JSON.parse(localStorage.getItem("listai_ventes")||"[]");for(const e of lsL.slice(0,50)){await supa.insert("listings",{user_id:uid,date:e.date,result:e.result},tok);count++;}for(const s of lsS){await supa.insert("stock",{user_id:uid,titre:s.titre,marque:s.marque||"",taille:s.taille||"",prix:s.prix||"",plateforme:s.plateforme||"Vinted",etat:s.etat||"",notes:s.notes||"",statut:s.statut||"en_vente",date_ajout:s.dateAjout||""},tok);count++;}for(const v of lsV){await supa.insert("ventes",{user_id:uid,article:v.article,prix_vente:v.prix_vente||"",prix_achat:v.prix_achat||"",plateforme:v.plateforme||"Vinted",date:v.date||""},tok);count++;}if(lsL.length)localStorage.removeItem("vh2");if(lsS.length)localStorage.removeItem("listai_stock");if(lsV.length)localStorage.removeItem("listai_ventes");return count;}catch{return 0;}}
};

function loadSession(){try{return JSON.parse(localStorage.getItem("listai_session")||"null");}catch{return null;}}
function saveSession(s){try{localStorage.setItem("listai_session",JSON.stringify(s));}catch{}}
function clearSession(){try{localStorage.removeItem("listai_session");}catch{}}

async function callClaude(prompt,images=[]){
  const content=[...images.map(i=>({type:"image",source:{type:"base64",media_type:i.type,data:i.base64}})),{type:"text",text:prompt}];
  const body={model:"claude-sonnet-4-6",max_tokens:1200,messages:[{role:"user",content}]};
  const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const data=await res.json();
  if(data.error) throw new Error(data.error);
  // Gère les deux formats : proxy Mistral et format Anthropic
  if(data.content&&Array.isArray(data.content)){
    return data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  }
  if(typeof data.content==="string") return data.content;
  if(data.text) return data.text;
  throw new Error("Format de réponse inattendu");
}
function pj(t){
  try{
    if(!t)return null;
    // Nettoie tous les formats markdown possibles
    let clean=t.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
    // Extrait uniquement le JSON entre { }
    const start=clean.indexOf("{");
    const end=clean.lastIndexOf("}");
    if(start!==-1&&end!==-1&&end>start) clean=clean.slice(start,end+1);
    // Parse direct
    try{ return JSON.parse(clean); }catch{}
    // Fallback : échappe les caractères spéciaux dans les valeurs string
    try{
      const fixed=clean.replace(/:\s*"([\s\S]*?)"/g,(m,v)=>{
        const escaped=v
          .replace(/\\/g,"\\\\")
          .replace(/\n/g,"\\n")
          .replace(/\r/g,"")
          .replace(/\t/g,"\\t")
          .replace(/"/g,'\\"');
        return `:"${escaped}"`;
      });
      return JSON.parse(fixed);
    }catch{}
    return null;
  }catch(e){
    console.error("pj error:",e.message,t?.slice(0,100));
    return null;
  }
}

// ── DESIGN SYSTEM ─────────────────────────────────────────────────────────────
function useTheme(){
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem("listai_theme")==="dark";}catch{return true;}});
  const toggle=useCallback(()=>setDark(d=>{const nd=!d;try{localStorage.setItem("listai_theme",nd?"dark":"light");}catch{}return nd;}),[]);
  return [dark,toggle];
}

const T = {
  bg: (dark) => dark?"#000000":"#f5f5f7",
  card: (dark) => dark?"#1c1c1e":"#ffffff",
  card2: (dark) => dark?"#2c2c2e":"#f2f2f7",
  border: (dark) => dark?"#3a3a3c":"#e5e5ea",
  text: (dark) => dark?"#f5f5f7":"#1d1d1f",
  text2: (dark) => dark?"#aeaeb2":"#6e6e73",
  text3: (dark) => dark?"#636366":"#aeaeb2",
};

function Card({children,dark,style={},onClick}){return <div onClick={onClick} style={{background:T.card(dark),borderRadius:16,border:`1px solid ${T.border(dark)}`,padding:16,marginBottom:10,...style}}>{children}</div>;}
function Label({children,dark,style={}}){return <div style={{fontSize:11,fontWeight:700,color:T.text2(dark),textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8,...style}}>{children}</div>;}
function Title({children,sub,dark}){return <div style={{marginBottom:20}}><h2 style={{fontSize:22,fontWeight:800,color:T.text(dark),margin:"0 0 4px",letterSpacing:"-0.3px"}}>{children}</h2>{sub&&<p style={{color:T.text2(dark),fontSize:13,margin:0,lineHeight:1.5}}>{sub}</p>}</div>;}

function Btn({onClick,disabled,children,variant="gold",small,full,style={}}){
  const styles={
    gold:{background:GRAD,color:"white",border:"none",boxShadow:"0 4px 15px rgba(124,58,237,0.4)"},
    outline:{background:"transparent",border:`1.5px solid ${GOLD}`,color:GOLD},
    ghost:{background:"transparent",border:`1.5px solid #e5e5ea`,color:"#6e6e73"},
    danger:{background:"transparent",border:"1.5px solid #ff3b30",color:"#ff3b30"},
    orange:{background:GRAD_O,color:"white",border:"none",boxShadow:"0 4px 15px rgba(255,107,43,0.4)"},
  };
  const s=styles[variant]||styles.gold;
  return <button onClick={onClick} disabled={disabled} style={{padding:small?"8px 14px":"13px 20px",borderRadius:small?8:12,...s,fontSize:small?12:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,width:full?"100%":"auto",transition:"all 0.15s",letterSpacing:"0.1px",...style}}>{children}</button>;
}

function Inp({value,onChange,placeholder,dark,type="text",onKeyDown,style={}}){
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border(dark)}`,borderRadius:10,fontSize:14,background:T.card(dark),color:T.text(dark),outline:"none",boxSizing:"border-box",transition:"border-color .15s",...style}}/>;
}
function Txta({value,onChange,placeholder,dark,rows=4}){
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{width:"100%",padding:"12px 14px",border:`1.5px solid #e5e5ea`,borderRadius:10,fontSize:14,background:T.card(dark),color:T.text(dark),outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}/>;
}

function FieldPill({label,value,dark}){return <div style={{background:T.card2(dark),borderRadius:10,padding:"8px 12px"}}><div style={{fontSize:9,fontWeight:700,color:T.text3(dark),textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>{label}</div><div style={{fontSize:13,fontWeight:600,color:T.text(dark)}}>{value||"—"}</div></div>;}

function CopyField({icon,label,value,dark}){
  const [copied,setCopied]=useState(false);
  return <div style={{background:T.card(dark),borderRadius:14,border:`1px solid ${T.border(dark)}`,padding:14,marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}><span>{icon}</span><span style={{fontSize:10,fontWeight:700,color:T.text2(dark),textTransform:"uppercase",letterSpacing:"0.8px"}}>{label}</span></div>
      <button onClick={()=>{navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${T.border(dark)}`,background:T.card2(dark),color:copied?"#34c759":GOLD,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>{copied?"✓ Copié":"Copier"}</button>
    </div>
    <p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.8,whiteSpace:"pre-wrap"}}>{value}</p>
  </div>;
}

function Toggle({checked,onChange,dark}){
  return <label style={{position:"relative",width:44,height:26,display:"inline-block",flexShrink:0}}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{opacity:0,width:0,height:0}}/>
    <span style={{position:"absolute",inset:0,background:checked?"#34c759":T.border(dark),borderRadius:26,cursor:"pointer",transition:".25s"}}>
      <span style={{position:"absolute",height:20,width:20,left:checked?21:3,bottom:3,background:"white",borderRadius:"50%",transition:".25s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
    </span>
  </label>;
}

function Spin(){return <div style={{textAlign:"center",padding:"24px 0"}}><div style={{display:"inline-block",width:28,height:28,border:`3px solid #e5e5ea`,borderTopColor:GOLD,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;}

function Empty({emoji,title,sub}){return <div style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:42,marginBottom:12}}>{emoji}</div><p style={{fontSize:15,fontWeight:700,color:"#1d1d1f",margin:"0 0 4px"}}>{title}</p><p style={{fontSize:13,color:"#6e6e73",margin:0,lineHeight:1.5}}>{sub}</p></div>;}

function Toast({msg,onDone}){useEffect(()=>{const t=setTimeout(onDone,2400);return()=>clearTimeout(t);},[]);return <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"#1d1d1f",color:"white",padding:"10px 20px",borderRadius:50,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",whiteSpace:"nowrap"}}>{msg}</div>;}

// ── TUTORIEL ──────────────────────────────────────────────────────────────────
const TUTO_STEPS = [
  {icon:"✦",title:"Bienvenue sur ListAI Pro !",desc:"Ton assistant IA pour créer des annonces Vinted parfaites en quelques secondes. Voici comment démarrer."},
  {icon:"📸",title:"Génère une annonce",desc:"Dans l'onglet ✦ Annonce, uploade tes photos et clique \"Générer\". L'IA analyse tes photos et crée titre, description, prix et hashtags optimisés."},
  {icon:"📈",title:"Analyse les tendances",desc:"L'onglet Tendances te donne le score de tendance, la fourchette de prix idéale et le meilleur moment pour publier."},
  {icon:"🧩",title:"Installe l'extension",desc:"Dans l'onglet Extension, télécharge l'extension Chrome ListAI Pro v2. Elle publie automatiquement tes annonces sur Vinted !"},
  {icon:"☁️",title:"Synchronise partout",desc:"Tes données sont sauvegardées dans le cloud. Connecte-toi depuis ton téléphone ou ton PC — tout est synchronisé !"},
];

function TutoOverlay({dark,onDone}){
  const [step,setStep]=useState(0);
  const s=TUTO_STEPS[step];
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:20}}>
    <div style={{background:T.card(dark),borderRadius:24,padding:28,maxWidth:360,width:"100%",boxShadow:"0 24px 80px rgba(0,0,0,0.4)",textAlign:"center"}}>
        <div style={{width:60,height:60,borderRadius:18,background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 12px",boxShadow:"0 8px 24px rgba(124,58,237,0.4)"}}>{s.icon}</div>
      <div style={{fontSize:11,fontWeight:700,background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Étape {step+1} / {TUTO_STEPS.length}</div>
      <h3 style={{fontSize:19,fontWeight:800,color:T.text(dark),margin:"0 0 10px",letterSpacing:"-0.2px"}}>{s.title}</h3>
      <p style={{fontSize:14,color:T.text2(dark),lineHeight:1.65,margin:"0 0 20px"}}>{s.desc}</p>
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>
        {TUTO_STEPS.map((_,i)=><div key={i} style={{height:6,borderRadius:3,background:i===step?GRAD:T.border(dark),width:i===step?20:6,transition:"all .2s"}}/>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={onDone} variant="ghost" style={{flex:1}}>Passer</Btn>
        <Btn onClick={()=>{if(step<TUTO_STEPS.length-1)setStep(s=>s+1);else onDone();}} style={{flex:1}}>
          {step<TUTO_STEPS.length-1?"Suivant →":"✓ Commencer !"}
        </Btn>
      </div>
    </div>
  </div>;
}

// ── AUTH SCREEN ───────────────────────────────────────────────────────────────
function AuthScreen({onAuth,dark}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  const handle=async()=>{
    if(mode!=="forgot"&&(!email||!password)){setError("Remplis tous les champs.");return;}
    if(mode!=="forgot"&&password.length<6){setError("Mot de passe minimum 6 caractères.");return;}
    setLoading(true);setError("");setSuccess("");
    try{
      if(mode==="login"){
        const data=await supa.signIn(email,password);
        if(data.error||!data.access_token)throw new Error(data.error?.message||"Email ou mot de passe incorrect");
        const session={access_token:data.access_token,refresh_token:data.refresh_token,user:data.user};
        saveSession(session);onAuth(session);
      }else if(mode==="register"){
        const data=await supa.signUp(email,password);
        if(data.error)throw new Error(data.error?.message||"Erreur lors de l'inscription");
        if(data.access_token){const session={access_token:data.access_token,refresh_token:data.refresh_token,user:data.user};saveSession(session);onAuth(session);}
        else{setSuccess("Compte créé ! Connecte-toi maintenant.");setMode("login");}
      }else{
        await supa.resetPassword(email);setSuccess("Email envoyé !");
      }
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  return <div style={{minHeight:"100vh",background:dark?"#0a0a0f":"#f0f0ff",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"}}>
    {/* Fond décoratif */}
    <div style={{position:"fixed",inset:0,overflow:"hidden",zIndex:0}}>
      <div style={{position:"absolute",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(circle,rgba(124,58,237,0.3),transparent 70%)",borderRadius:"50%"}}/>
      <div style={{position:"absolute",bottom:"-20%",right:"-10%",width:"60%",height:"60%",background:"radial-gradient(circle,rgba(255,107,43,0.2),transparent 70%)",borderRadius:"50%"}}/>
    </div>
    <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{width:80,height:80,borderRadius:24,background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 16px",boxShadow:"0 12px 40px rgba(124,58,237,0.5)"}}>⚡</div>
        <h1 style={{fontSize:32,fontWeight:900,color:T.text(dark),margin:"0 0 4px",letterSpacing:"-0.5px"}}>ListAI <span style={{background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Pro</span></h1>
        <p style={{fontSize:14,color:T.text2(dark),margin:0}}>Transforme tes photos en annonces parfaites</p>
      </div>

      <div style={{background:T.card(dark),borderRadius:24,border:`1px solid ${T.border(dark)}`,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        {mode!=="forgot"&&<div style={{display:"flex",background:T.card2(dark),borderRadius:14,padding:4,marginBottom:20,gap:3}}>
          {[["login","Connexion"],["register","Inscription"]].map(([k,l])=>(
            <button key={k} onClick={()=>{setMode(k);setError("");setSuccess("");}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:mode===k?GRAD:"transparent",color:mode===k?"white":T.text2(dark),fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>{l}</button>
          ))}
        </div>}

        {mode==="forgot"&&<h3 style={{fontSize:16,fontWeight:700,color:T.text(dark),margin:"0 0 16px"}}>🔑 Mot de passe oublié</h3>}

        <div style={{marginBottom:12}}><Label dark={dark}>Email</Label><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.com" dark={dark} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
        {mode!=="forgot"&&<div style={{marginBottom:20}}><Label dark={dark}>Mot de passe</Label><Inp type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" dark={dark} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>}

        {error&&<div style={{background:"#fff2f2",border:"1px solid #ffd0d0",borderRadius:10,padding:"10px 14px",marginBottom:12,color:"#ff3b30",fontSize:13}}>❌ {error}</div>}
        {success&&<div style={{background:"#f0fff4",border:"1px solid #c3f0ca",borderRadius:10,padding:"10px 14px",marginBottom:12,color:"#34c759",fontSize:13}}>✅ {success}</div>}

        <button onClick={handle} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:loading?T.border(dark):GRAD,color:"white",fontSize:15,fontWeight:800,cursor:loading?"not-allowed":"pointer",marginBottom:12,letterSpacing:"0.1px",boxShadow:loading?"none":"0 8px 24px rgba(124,58,237,0.4)"}}>
          {loading?"⟳ Chargement...":{login:"🚀 Se connecter",register:"✨ Créer mon compte",forgot:"📧 Envoyer le lien"}[mode]}
        </button>

        {mode==="login"&&<button onClick={()=>{setMode("forgot");setError("");setSuccess("");}} style={{width:"100%",background:"transparent",border:"none",color:T.text2(dark),fontSize:12,cursor:"pointer",padding:"4px"}}>Mot de passe oublié ?</button>}
        {mode==="forgot"&&<button onClick={()=>{setMode("login");setError("");setSuccess("");}} style={{width:"100%",background:"transparent",border:"none",color:T.text2(dark),fontSize:12,cursor:"pointer",padding:"4px"}}>← Retour à la connexion</button>}
      </div>

      <p style={{textAlign:"center",fontSize:11,color:T.text3(dark),marginTop:16}}>☁️ Données synchronisées entre tous tes appareils</p>
    </div>
  </div>;
}

// ── TAB ANNONCE ───────────────────────────────────────────────────────────────
function TabAnnonce({dark,session,history,setHistory,resultToShow,setResultToShow}){
  const [step,setStep]=useState(1);
  const [images,setImages]=useState([]);
  const [prix,setPrix]=useState("");
  const [etat,setEtat]=useState(0);
  const [infos,setInfos]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const [toast,setToast]=useState(false);
  const fileRef=useRef();

  useEffect(()=>{if(resultToShow){setResult(resultToShow.result);setStep(3);setResultToShow(null);}},[resultToShow]);

  const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
  const addFiles=async files=>{const arr=Array.from(files).slice(0,10-images.length);const p=await Promise.all(arr.map(async f=>({base64:await toB64(f),type:f.type,url:URL.createObjectURL(f)})));setImages(prev=>[...prev,...p].slice(0,10));};

  const generate=async()=>{
    setLoading(true);setError(null);
    const prompt=`Tu es un expert vendeur Vinted streetwear avec 5 ans d'experience. Analyse ces ${images.length} photo(s). Prix souhaite: ${prix?prix+"EUR":"a estimer"}, etat: ${ETAT[etat]}${infos?", infos: "+infos:""}.

Reponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans emojis dans les cles ou valeurs simples.
Format strict:
{"titre":"max 60 chars","categorie":"categorie Vinted","sous_categorie":"sous-categorie","marque":"marque","taille":"taille EU","couleur":"couleur principale","matiere":"matiere","etat":"${ETAT[etat]}","prix_recommande":"120","prix_mini":"90","description":"description complete avec emojis et structure vendeuse sur plusieurs lignes","hashtags":"#Nike #AirMax #Streetwear #Sneakers #LimitedEdition #Hype","conseil":"un conseil pratique"}

Important: prix_recommande et prix_mini doivent etre des nombres SANS le symbole euro.`;
    try{
      const text=await callClaude(prompt,images);
      const parsed=pj(text);
      if(!parsed||!parsed.titre)throw new Error("JSON invalide");
      setResult(parsed);
      const entry={date:new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}),result:parsed};
      const saved=await db.addListing(session.user.id,entry,session.access_token);
      setHistory(prev=>[{...entry,id:saved?.id||Date.now().toString()},...prev].slice(0,50));
      setStep(3);
    }catch(e){
      console.error("Erreur génération:",e);
      setError("Génération échouée. Vérifie ta connexion et réessaie. Si le problème persiste, la clé API Mistral est peut-être expirée.");
    }
    finally{setLoading(false);}
  };

  const reset=()=>{setImages([]);setPrix("");setInfos("");setResult(null);setError(null);setEtat(0);setStep(1);};

  return <div>
    {/* Stepper */}
    {step<3&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:24}}>
      {["Photos","Infos","Résultat"].map((s,i)=><>
        <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,background:step>i+1?GOLD:step===i+1?GOLD:T.card2(dark),color:step>=i+1?"#1a1a2e":T.text3(dark),border:step===i+1?`2px solid ${GOLD}`:"none",transition:"all .2s"}}>{step>i+1?"✓":i+1}</div>
          <span style={{fontSize:12,color:step===i+1?GOLD:T.text2(dark),fontWeight:step===i+1?700:400}}>{s}</span>
        </div>
        {i<2&&<div style={{flex:1,height:2,background:step>i+1?GOLD:T.border(dark),borderRadius:1}}/>}
      </>)}
    </div>}

    {/* Step 1: Photos */}
    {step===1&&<div>
      <Title dark={dark} sub="Ajoute jusqu'à 10 photos de ton article">📸 Tes photos</Title>
      <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files);}}
        onClick={()=>images.length<10&&fileRef.current.click()}
        style={{border:`2px dashed ${dragOver?GOLD:T.border(dark)}`,borderRadius:16,padding:"40px 20px",textAlign:"center",cursor:images.length<10?"pointer":"default",background:dragOver?`${GOLD}08`:T.card(dark),transition:"all 0.2s",marginBottom:14}}>
        <div style={{fontSize:36,marginBottom:8}}>🖼️</div>
        <p style={{margin:"0 0 4px",fontWeight:700,color:T.text(dark),fontSize:15}}>{images.length===0?"Glisse tes photos ici":`${images.length}/10 photo(s) ajoutée(s)`}</p>
        <p style={{margin:0,fontSize:12,color:T.text2(dark)}}>{images.length<10?"ou clique pour sélectionner":"Maximum atteint"}</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>addFiles(e.target.files)}/>
      </div>

      {images.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
        {images.map((img,i)=><div key={i} style={{position:"relative",aspectRatio:"1",borderRadius:10,overflow:"hidden",border:`2px solid ${i===0?GOLD:T.border(dark)}`}}>
          <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          {i===0&&<div style={{position:"absolute",bottom:3,left:3,background:GOLD,color:"#1a1a2e",fontSize:7,fontWeight:900,padding:"2px 5px",borderRadius:3}}>COVER</div>}
          <button onClick={()=>setImages(p=>p.filter((_,j)=>j!==i))} style={{position:"absolute",top:3,right:3,width:20,height:20,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.6)",color:"white",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>)}
        {images.length<10&&<div onClick={()=>fileRef.current.click()} style={{aspectRatio:"1",borderRadius:10,border:`2px dashed ${T.border(dark)}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:T.card2(dark),fontSize:20,color:GOLD}}>+</div>}
      </div>}

      <Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`,marginBottom:16}}>
        <Label dark={dark}>💡 Conseils photos</Label>
        {["Fond blanc ou neutre uni","Lumière naturelle sans flash","4 angles minimum","Montrer les défauts honnêtement","Photo portée = +40% de vues"].map((t,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:i<4?6:0}}><span style={{color:GOLD,fontSize:10,marginTop:3}}>✦</span><span style={{fontSize:12,color:T.text2(dark),lineHeight:1.5}}>{t}</span></div>)}
      </Card>

      <Btn onClick={()=>setStep(2)} disabled={images.length===0} full>Continuer {images.length>0&&`(${images.length} photo${images.length>1?"s":""})`} →</Btn>
    </div>}

    {/* Step 2: Infos */}
    {step===2&&<div>
      <Title dark={dark} sub="Quelques infos pour optimiser l'annonce">⚙️ Paramètres</Title>
      <Card dark={dark}>
        <Label dark={dark}>État de l'article</Label>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {ETAT.map((o,i)=><div key={o} onClick={()=>setEtat(i)} style={{padding:"11px 14px",borderRadius:10,cursor:"pointer",border:`2px solid ${etat===i?ETAT_C[i]:T.border(dark)}`,background:etat===i?`${ETAT_C[i]}12`:T.card2(dark),display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}>
            <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${etat===i?ETAT_C[i]:T.border(dark)}`,background:etat===i?ETAT_C[i]:"transparent",flexShrink:0}}/>
            <span style={{fontSize:13,fontWeight:etat===i?700:400,color:etat===i?ETAT_C[i]:T.text(dark)}}>{o}</span>
          </div>)}
        </div>
      </Card>

      <Card dark={dark}>
        <Label dark={dark}>Prix souhaité (optionnel)</Label>
        <div style={{display:"flex",border:`1.5px solid ${T.border(dark)}`,borderRadius:10,overflow:"hidden"}}>
          <input type="number" value={prix} onChange={e=>setPrix(e.target.value)} placeholder="Ex: 25" style={{flex:1,padding:"11px 14px",border:"none",fontSize:15,fontWeight:600,background:"transparent",color:T.text(dark),outline:"none"}}/>
          <div style={{padding:"11px 14px",background:T.card2(dark),fontSize:14,fontWeight:700,color:GOLD,borderLeft:`1.5px solid ${T.border(dark)}`}}>€</div>
        </div>
      </Card>

      <Card dark={dark}>
        <Label dark={dark}>Notes (optionnel)</Label>
        <Txta value={infos} onChange={e=>setInfos(e.target.value)} placeholder="Ex: taille M mais fait plutôt S, légère usure sur la manche gauche..." dark={dark} rows={3}/>
      </Card>

      {error&&<div style={{background:"#fff2f2",border:"1px solid #ffd0d0",borderRadius:10,padding:12,marginBottom:12,color:"#ff3b30",fontSize:13}}>❌ {error}</div>}

      <div style={{display:"flex",gap:10}}>
        <Btn onClick={()=>setStep(1)} variant="ghost">← Retour</Btn>
        <Btn onClick={generate} disabled={loading} full>{loading?"✦ Analyse en cours...":"✦ Générer l'annonce"}</Btn>
      </div>

      {loading&&<Card dark={dark} style={{marginTop:12}}>
        {["🔍 Analyse des photos...","🏷️ Détection marque & taille...","✍️ Rédaction de l'annonce...","#️⃣ Génération des hashtags...","☁️ Sauvegarde cloud..."].map((tx,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<4?8:0}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:GOLD}}/>
            <span style={{fontSize:12,color:T.text2(dark)}}>{tx}</span>
          </div>
        ))}
      </Card>}
    </div>}

    {/* Step 3: Résultat */}
    {step===3&&result&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <Title dark={dark} sub="Copie et colle sur Vinted en 30 secondes">🎉 Annonce prête !</Title>
        <Btn onClick={reset} variant="ghost" small>Nouvelle</Btn>
      </div>

      {/* Prix card */}
      <div style={{background:`linear-gradient(135deg,${GOLD},#e8c584)`,borderRadius:16,padding:"16px 20px",marginBottom:12,display:"flex",justifyContent:"space-around",textAlign:"center"}}>
        {[["Prix recommandé",result.prix_recommande+"€"],["Prix minimum",result.prix_mini+"€"],["Taille",result.taille]].map(([l,v],i)=>(
          <div key={i}><div style={{fontSize:24,fontWeight:900,color:"#1a1a2e"}}>{v}</div><div style={{fontSize:10,color:"rgba(26,26,46,0.6)",marginTop:2,fontWeight:600}}>{l}</div></div>
        ))}
      </div>

      {/* Champs */}
      <Card dark={dark}>
        <Label dark={dark}>Champs Vinted</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Catégorie",result.categorie],["Sous-cat.",result.sous_categorie],["Marque",result.marque],["Couleur",result.couleur],["Matière",result.matiere],["État",result.etat]].map(([l,v])=><FieldPill key={l} label={l} value={v} dark={dark}/>)}
        </div>
      </Card>

      <CopyField icon="✏️" label="Titre" value={result.titre} dark={dark}/>
      <CopyField icon="📝" label="Description" value={result.description} dark={dark}/>
      <CopyField icon="#️⃣" label="Hashtags" value={result.hashtags} dark={dark}/>

      {result.conseil&&<Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`,marginBottom:12}}>
        <p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.7}}>💡 <strong style={{color:GOLD}}>Conseil :</strong> {result.conseil}</p>
      </Card>}

      <Btn onClick={()=>{navigator.clipboard.writeText(`${result.titre}\n\n${result.description}\n\n${result.hashtags}`);setToast(true);setTimeout(()=>setToast(false),2200);}} full>📋 Tout copier — Titre + Description + Hashtags</Btn>
      {toast&&<Toast msg="✓ Copié dans le presse-papier !" onDone={()=>setToast(false)}/>}
    </div>}
  </div>;
}

// ── TAB TENDANCES ─────────────────────────────────────────────────────────────
function TabTendances({dark}){
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const [subTab,setSubTab]=useState("tendance");
  const [scoreA,setScoreA]=useState({titre:"",desc:"",prix:"",loading:false,result:null});
  const [concuQ,setConcuQ]=useState("");
  const [concuL,setConcuL]=useState(false);
  const [concuR,setConcuR]=useState(null);

  const SUGG=["Veste en cuir","Nike Air Force","Sac Longchamp","Pull Ralph Lauren","Jean Levi's","Jordan 1","Blazer oversize"];
  const CAL=[{jour:"Lundi",score:6,heure:"18h-20h"},{jour:"Mardi",score:7,heure:"19h-21h"},{jour:"Mercredi",score:8,heure:"17h-20h"},{jour:"Jeudi",score:9,heure:"19h-22h"},{jour:"Vendredi",score:10,heure:"18h-22h"},{jour:"Samedi",score:8,heure:"10h-12h"},{jour:"Dimanche",score:7,heure:"20h-22h"}];

  // Parse robuste : gère markdown, backticks, JSON mal formaté
  const parseRobuste=(text)=>{
    if(!text)return null;
    // Étape 1 : nettoie markdown
    let t=text.replace(/```json/gi,"").replace(/```/g,"").trim();
    // Étape 2 : extrait entre { }
    const s=t.indexOf("{");const e=t.lastIndexOf("}");
    if(s!==-1&&e>s)t=t.slice(s,e+1);
    // Étape 3 : parse direct
    try{return JSON.parse(t);}catch{}
    // Étape 4 : corrige les retours à la ligne dans les strings
    try{
      const fixed=t.replace(/:\s*"([\s\S]*?)"/g,(_,v)=>{
        return `:"${v.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/\r/g,"").replace(/"/g,'\\"')}"`;
      });
      return JSON.parse(fixed);
    }catch{}
    // Étape 5 : extraction manuelle des champs clés
    try{
      const get=(key)=>{const m=t.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`))||t.match(new RegExp(`"${key}"\\s*:\\s*([^,}]+)`));return m?m[1].trim().replace(/^"|"$/g,""):null;};
      const getArr=(key)=>{const m=t.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*?)\\]`));if(!m)return[];return m[1].match(/"([^"]*)"/g)?.map(s=>s.replace(/"/g,""))||[];};
      return {score_tendance:get("score_tendance")||"7/10",momentum:get("momentum")||"Stable",fourchette_prix:get("fourchette_prix")||"?",prix_ideal:get("prix_ideal")||"?",vitesse_vente:get("vitesse_vente")||"?",marques_top:getArr("marques_top"),mots_cles:getArr("mots_cles"),conseil:get("conseil")||"",potentiel_revente:get("potentiel_revente")||"?",public_cible:get("public_cible")||"?",astuce_photo:get("astuce_photo")||""};
    }catch{}
    return null;
  };

  const analyse=async q=>{
    const s=q||query;
    if(!s.trim())return;
    setLoading(true);setResult(null);setError(null);
    const prompt=`Tu es expert revendeur Vinted. Analyse le marché pour "${s}" et réponds avec EXACTEMENT ce format:
SCORE_TENDANCE:[note]/10
MOMENTUM:[En hausse / Stable / En baisse]
FOURCHETTE_PRIX:[ex: 20-45€]
PRIX_IDEAL:[ex: 32€]
VITESSE_VENTE:[ex: 3-5 jours]
POTENTIEL_REVENTE:[Élevé / Moyen / Faible]
PUBLIC_CIBLE:[ex: Hommes 18-30]
ETAT_OPTIMAL:[ex: Très bon état]
MARQUE_TOP:[marque1]
MARQUE_TOP:[marque2]
MOT_CLE:[mot1]
MOT_CLE:[mot2]
MOT_CLE:[mot3]
CONSEIL:[un conseil pratique court]
ASTUCE_PHOTO:[un conseil photo court]`;
    try{
      const t=await callClaude(prompt);
      const get=(key)=>{const m=t.match(new RegExp(`${key}:(.+)`));return m?m[1].trim():null;};
      const getAll=(key)=>t.match(new RegExp(`${key}:(.+)`,"g"))?.map(l=>l.replace(`${key}:`,"").trim())||[];
      const r={
        score_tendance:get("SCORE_TENDANCE")||"7/10",
        momentum:get("MOMENTUM")||"Stable",
        fourchette_prix:get("FOURCHETTE_PRIX")||"?",
        prix_ideal:get("PRIX_IDEAL")||"?",
        vitesse_vente:get("VITESSE_VENTE")||"?",
        potentiel_revente:get("POTENTIEL_REVENTE")||"?",
        public_cible:get("PUBLIC_CIBLE")||"?",
        etat_optimal:get("ETAT_OPTIMAL")||"?",
        marques_top:getAll("MARQUE_TOP"),
        mots_cles:getAll("MOT_CLE"),
        conseil:get("CONSEIL")||"",
        astuce_photo:get("ASTUCE_PHOTO")||""
      };
      if(r.score_tendance){setResult(r);}
      else{setError("Réponse invalide. Réessaie !");}
    }catch(e){
      console.error(e);
      setError("Analyse échouée. Vérifie ta connexion.");
    }finally{setLoading(false);}
  };

  const analyseScore=async()=>{
    if(!scoreA.desc.trim())return;
    setScoreA(p=>({...p,loading:true,result:null}));
    const prompt=`Tu es expert Vinted. Évalue cette annonce et réponds avec EXACTEMENT ce format (remplace les valeurs entre crochets):
SCORE_GLOBAL:[note sur 10]/10
SCORE_TITRE:[note sur 10]/10
SCORE_DESC:[note sur 10]/10
SCORE_PRIX:[note sur 10]/10
POINT_FORT:premier point fort
POINT_FORT:deuxième point fort
POINT_FAIBLE:premier point faible
POINT_FAIBLE:deuxième point faible
TITRE_AMELIORE:[nouveau titre optimisé]

Annonce à évaluer:
Titre: "${scoreA.titre||"(sans titre)"}"
Description: "${scoreA.desc}"
Prix: ${scoreA.prix||"?"}€`;
    try{
      const t=await callClaude(prompt);
      const get=(key)=>{const m=t.match(new RegExp(`${key}:(.+)`));return m?m[1].trim():null;};
      const getAll=(key)=>t.match(new RegExp(`${key}:(.+)`,"g"))?.map(l=>l.replace(`${key}:`,"").trim())||[];
      const r={
        score_global:get("SCORE_GLOBAL")||"7/10",
        scores:{titre:get("SCORE_TITRE")||"?",description:get("SCORE_DESC")||"?",prix:get("SCORE_PRIX")||"?"},
        points_forts:getAll("POINT_FORT"),
        points_faibles:getAll("POINT_FAIBLE"),
        titre_ameliore:get("TITRE_AMELIORE")||""
      };
      setScoreA(p=>({...p,loading:false,result:r}));
    }catch{setScoreA(p=>({...p,loading:false}));}
  };

  const analyseConcurrence=async()=>{
    if(!concuQ.trim())return;
    setConcuL(true);setConcuR(null);
    const prompt=`Tu es expert Vinted. Analyse la concurrence pour "${concuQ}".
Reponds UNIQUEMENT avec cet objet JSON sans markdown:
{"nb_annonces_estim":"150-200","prix_moyen":"28€","prix_min":"8€","prix_max":"65€","etat_dominant":"Très bon état","points_differenciants":["avantage 1","avantage 2","avantage 3"],"conseil_positionnement":"un conseil concret","meilleur_moment":"Jeudi-vendredi 19h"}`;
    try{
      const t=await callClaude(prompt);
      const r=parseRobuste(t);
      if(r)setConcuR(r);
    }catch{}
    finally{setConcuL(false);}
  };

  const sC=s=>s>=9?"#34c759":s>=7?"#ff9500":"#6e6e73";

  return <div>
    <Title dark={dark} sub="Analyse marché, score et calendrier optimal">📈 Tendances & Marché</Title>

    <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
      {[["tendance","🔥 Tendances"],["score","⭐ Score"],["calendrier","📅 Calendrier"]].map(([k,l])=>(
        <button key={k} onClick={()=>setSubTab(k)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${subTab===k?GOLD:T.border(dark)}`,background:subTab===k?`${GOLD}15`:"transparent",color:subTab===k?GOLD:T.text2(dark),fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>{l}</button>
      ))}
    </div>

    {subTab==="tendance"&&<div>
      <Card dark={dark}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <Inp value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyse()} placeholder="Ex: Nike Air Max, Jean Levi's..." dark={dark}/>
          <Btn onClick={()=>analyse()} disabled={loading||!query.trim()} small>Go</Btn>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {SUGG.map(s=><button key={s} onClick={()=>{setQuery(s);analyse(s);}} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${GOLD}30`,background:`${GOLD}10`,color:GOLD,fontSize:11,fontWeight:600,cursor:"pointer"}}>{s}</button>)}
        </div>
      </Card>
      {error&&<Card dark={dark} style={{borderLeft:"3px solid #ff3b30"}}><p style={{margin:0,color:"#ff3b30",fontSize:13}}>❌ {error}</p></Card>}
      {loading&&<Spin/>}
      {result&&!loading&&<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[["Score",result.score_tendance,parseFloat(result.score_tendance)>=8?"#34c759":parseFloat(result.score_tendance)>=6?"#ff9500":"#ff3b30"],["Momentum",result.momentum,GOLD],["Potentiel",result.potentiel_revente,GOLD]].map(([l,v,c])=>(
            <Card key={l} dark={dark} style={{textAlign:"center",padding:12,marginBottom:0}}>
              <div style={{fontSize:9,fontWeight:700,color:T.text3(dark),textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>{l}</div>
              <div style={{fontSize:16,fontWeight:900,color:c}}>{v}</div>
            </Card>
          ))}
        </div>
        <Card dark={dark}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <FieldPill label="Fourchette" value={result.fourchette_prix} dark={dark}/>
            <FieldPill label="Prix idéal" value={result.prix_ideal} dark={dark}/>
            <FieldPill label="Vitesse" value={result.vitesse_vente} dark={dark}/>
            <FieldPill label="Public" value={result.public_cible} dark={dark}/>
          </div>
        </Card>
        <Card dark={dark}><Label dark={dark}>🏷️ Top marques</Label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{result.marques_top?.map(m=><span key={m} style={{padding:"4px 10px",borderRadius:20,background:`${GOLD}15`,color:GOLD,fontWeight:700,fontSize:12}}>{m}</span>)}</div></Card>
        <Card dark={dark}><Label dark={dark}>🔑 Mots-clés</Label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{result.mots_cles?.map(m=><span key={m} style={{padding:"4px 10px",borderRadius:20,background:T.card2(dark),color:T.text2(dark),fontSize:12}}>#{m}</span>)}</div></Card>
        <Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`}}><p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.6}}>📸 <strong style={{color:GOLD}}>Photo :</strong> {result.astuce_photo}</p></Card>
        <Card dark={dark} style={{borderLeft:`3px solid #34c759`}}><p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.6}}>💡 <strong style={{color:"#34c759"}}>Conseil :</strong> {result.conseil}</p></Card>
      </div>}
    </div>}

    {subTab==="score"&&<div>
      <Card dark={dark}><Label dark={dark}>Titre actuel</Label><Inp value={scoreA.titre} onChange={e=>setScoreA(p=>({...p,titre:e.target.value}))} placeholder="Ton titre..." dark={dark}/></Card>
      <Card dark={dark}><Label dark={dark}>Description *</Label><Txta value={scoreA.desc} onChange={e=>setScoreA(p=>({...p,desc:e.target.value}))} placeholder="Colle ta description..." dark={dark} rows={4}/></Card>
      <Card dark={dark}><Label dark={dark}>Prix (€)</Label><Inp type="number" value={scoreA.prix} onChange={e=>setScoreA(p=>({...p,prix:e.target.value}))} placeholder="25" dark={dark}/></Card>
      <Btn onClick={analyseScore} disabled={scoreA.loading||!scoreA.desc.trim()} full>{scoreA.loading?"Analyse...":"⭐ Évaluer mon annonce"}</Btn>
      {scoreA.loading&&<Spin/>}
      {scoreA.result&&!scoreA.loading&&<div style={{marginTop:12}}>
        <div style={{background:`linear-gradient(135deg,${GOLD},#e8c584)`,borderRadius:16,padding:20,textAlign:"center",marginBottom:10}}>
          <div style={{fontSize:48,fontWeight:900,color:"#1a1a2e"}}>{scoreA.result.score_global}</div>
          <div style={{fontSize:12,color:"rgba(26,26,46,0.6)",fontWeight:600}}>Score global</div>
        </div>
        <Card dark={dark}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{Object.entries(scoreA.result.scores||{}).map(([k,v])=><FieldPill key={k} label={k} value={v} dark={dark}/>)}</div></Card>
        <Card dark={dark} style={{borderLeft:"3px solid #34c759"}}><Label dark={dark} style={{color:"#34c759"}}>✅ Points forts</Label>{scoreA.result.points_forts?.map((p,i)=><div key={i} style={{fontSize:13,color:T.text(dark),marginBottom:4}}>• {p}</div>)}</Card>
        <Card dark={dark} style={{borderLeft:"3px solid #ff3b30"}}><Label dark={dark} style={{color:"#ff3b30"}}>❌ À améliorer</Label>{scoreA.result.points_faibles?.map((p,i)=><div key={i} style={{fontSize:13,color:T.text(dark),marginBottom:4}}>• {p}</div>)}</Card>
        {scoreA.result.titre_ameliore&&<CopyField icon="✏️" label="Titre optimisé" value={scoreA.result.titre_ameliore} dark={dark}/>}
      </div>}
    </div>}

    {subTab==="concurrence"&&<div>
      <Card dark={dark}>
        <Label dark={dark}>Article à analyser</Label>
        <div style={{display:"flex",gap:8}}>
          <Inp value={concuQ} onChange={e=>setConcuQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyseConcurrence()} placeholder="Ex: Veste en cuir noire S..." dark={dark}/>
          <Btn onClick={analyseConcurrence} disabled={concuL||!concuQ.trim()} small>🔍</Btn>
        </div>
      </Card>
      {concuL&&<Spin/>}
      {concuR&&!concuL&&<div>
        <Card dark={dark}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <FieldPill label="Annonces" value={concuR.nb_annonces_estim} dark={dark}/>
          <FieldPill label="Prix moyen" value={concuR.prix_moyen} dark={dark}/>
          <FieldPill label="Prix min" value={concuR.prix_min} dark={dark}/>
          <FieldPill label="Prix max" value={concuR.prix_max} dark={dark}/>
        </div></Card>
        <Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`}}><Label dark={dark}>🚀 Se démarquer</Label>{concuR.points_differenciants?.map((p,i)=><div key={i} style={{fontSize:13,color:T.text(dark),marginBottom:5}}>✦ {p}</div>)}</Card>
        <Card dark={dark} style={{borderLeft:"3px solid #34c759"}}><p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.6}}>💡 <strong style={{color:"#34c759"}}>Stratégie :</strong> {concuR.conseil_positionnement}</p></Card>
      </div>}
    </div>}

    {subTab==="calendrier"&&<div>
      <Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`,marginBottom:10}}><p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.6}}>💡 Publier aux heures de pointe = <strong style={{color:GOLD}}>3x plus de vues</strong> dans les premières heures.</p></Card>
      {CAL.map(j=>(
        <Card key={j.jour} dark={dark} style={{padding:"12px 14px",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${sC(j.score)}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:sC(j.score)}}>{j.score}</div>
              <div><div style={{fontSize:13,fontWeight:700,color:T.text(dark)}}>{j.jour}</div><div style={{fontSize:11,color:GOLD,fontWeight:600}}>⏰ {j.heure}</div></div>
            </div>
            <div style={{width:80,height:6,borderRadius:3,background:T.card2(dark),overflow:"hidden"}}>
              <div style={{width:`${j.score*10}%`,height:"100%",background:sC(j.score),borderRadius:3}}/>
            </div>
          </div>
        </Card>
      ))}
    </div>}
  </div>;
}

// ── TAB MARGE ─────────────────────────────────────────────────────────────────
function TabMarge({dark}){
  const [pa,setPa]=useState("");const [frais,setFrais]=useState("");const [pv,setPv]=useState("");
  const [ship,setShip]=useState(SHIP[1]);const [isPro,setIsPro]=useState(false);
  const [simS,setSimS]=useState(4);const [simB,setSimB]=useState(10);
  const paN=parseFloat(pa)||0;const fraisN=parseFloat(frais)||0;const pvN=parseFloat(pv)||0;
  const coutTotal=paN+fraisN;
  const marge=pvN-coutTotal-(isPro?pvN*0.128:0);
  const margePct=pvN>0?((marge/pvN)*100).toFixed(0):0;
  const margeC=marge>0?"#34c759":marge<0?"#ff3b30":"#6e6e73";
  const simSteps=Array.from({length:simS+1},(_,i)=>{const p=pvN*Math.pow(1-simB/100,i);const m=p-coutTotal-(isPro?p*0.128:0);return{s:i,p:p.toFixed(2),m:m.toFixed(2),ok:m>0};});

  return <div>
    <Title dark={dark} sub="Calcule ton bénéfice net sur Vinted">💰 Calculateur de marge</Title>

    <Card dark={dark}>
      <Label dark={dark}>👤 Statut vendeur</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[[false,"Particulier","0% de frais"],[true,"Pro / Micro","Charges 12.8%"]].map(([val,label,sub])=>(
          <div key={String(val)} onClick={()=>setIsPro(val)} style={{padding:"12px",borderRadius:10,cursor:"pointer",border:`2px solid ${isPro===val?GOLD:T.border(dark)}`,background:isPro===val?`${GOLD}12`:T.card2(dark),transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
              <div style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${isPro===val?GOLD:T.border(dark)}`,background:isPro===val?GOLD:"transparent"}}/>
              <span style={{fontSize:12,fontWeight:700,color:isPro===val?GOLD:T.text(dark)}}>{label}</span>
            </div>
            <p style={{margin:0,fontSize:10,color:T.text2(dark),paddingLeft:20}}>{sub}</p>
          </div>
        ))}
      </div>
    </Card>

    <Card dark={dark}>
      <Label dark={dark}>💳 Coûts d'achat</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Prix d'achat (€)</div><Inp type="number" value={pa} onChange={e=>setPa(e.target.value)} placeholder="0" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Frais annexes (€)</div><Inp type="number" value={frais} onChange={e=>setFrais(e.target.value)} placeholder="0" dark={dark}/></div>
      </div>
      {coutTotal>0&&<div style={{marginTop:10,background:`${GOLD}15`,borderRadius:10,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:12,color:T.text2(dark)}}>Coût total</span>
        <span style={{fontSize:16,fontWeight:800,color:GOLD}}>{coutTotal.toFixed(2)}€</span>
      </div>}
    </Card>

    <Card dark={dark}>
      <Label dark={dark}>📦 Livraison (payée par l'acheteur)</Label>
      <p style={{margin:"0 0 10px",fontSize:12,color:"#34c759",fontWeight:600}}>✓ Ne réduit pas ta marge sur Vinted</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {SHIP.map(s=><div key={s.l} onClick={()=>setShip(s)} style={{padding:"8px 10px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${ship.l===s.l?GOLD:T.border(dark)}`,background:ship.l===s.l?`${GOLD}12`:T.card2(dark),transition:"all .15s"}}>
          <div style={{fontSize:11,fontWeight:600,color:ship.l===s.l?GOLD:T.text(dark)}}>{s.l}</div>
          <div style={{fontSize:10,color:T.text2(dark)}}>{s.p}€</div>
        </div>)}
      </div>
    </Card>

    <Card dark={dark}>
      <Label dark={dark} style={{color:"#007aff"}}>🏷️ Prix de vente Vinted</Label>
      <p style={{margin:"0 0 10px",fontSize:12,color:"#34c759",fontWeight:600}}>✓ 0% de frais vendeur sur Vinted</p>
      <div style={{display:"flex",border:`1.5px solid ${T.border(dark)}`,borderRadius:10,overflow:"hidden"}}>
        <input type="number" value={pv} onChange={e=>setPv(e.target.value)} placeholder="Ex: 25" style={{flex:1,padding:"12px 14px",border:"none",fontSize:16,fontWeight:700,background:"transparent",color:T.text(dark),outline:"none"}}/>
        <div style={{padding:"12px 14px",background:T.card2(dark),fontSize:14,fontWeight:800,color:"#007aff",borderLeft:`1.5px solid ${T.border(dark)}`}}>€</div>
      </div>
    </Card>

    {pvN>0&&<Card dark={dark} style={{border:`2px solid ${margeC}`,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:15,fontWeight:700,color:T.text(dark)}}>Marge nette</span>
        <span style={{fontSize:32,fontWeight:900,color:margeC}}>{marge.toFixed(2)}€</span>
      </div>
      {[["Prix affiché",`${pvN.toFixed(2)}€`,T.text(dark)],["Frais vendeur","0.00€ ✓","#34c759"],["Livraison acheteur",`${ship.p}€ ✓`,"#34c759"],["— Coût article",`-${coutTotal.toFixed(2)}€`,"#ff3b30"],isPro&&["— Charges 12.8%",`-${(pvN*0.128).toFixed(2)}€`,"#ff9500"]].filter(Boolean).map(([l,v,c],i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
          <span style={{color:T.text2(dark)}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span>
        </div>
      ))}
      <div style={{marginTop:10,padding:"9px 14px",borderRadius:9,background:marge>0?"#f0fff4":"#fff2f2",textAlign:"center"}}>
        <span style={{fontSize:13,fontWeight:800,color:margeC}}>{marge>0?`✓ +${margePct}% de marge`:marge<0?`✗ Perte de ${Math.abs(marge).toFixed(2)}€`:"Équilibre"}</span>
      </div>
    </Card>}

    {pvN>0&&coutTotal>0&&<Card dark={dark}>
      <Label dark={dark}>📉 Simulateur de baisses de prix</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:5}}>Baisse : <span style={{color:GOLD,fontWeight:700}}>{simB}%</span></div><input type="range" min="1" max="30" value={simB} onChange={e=>setSimB(Number(e.target.value))} style={{width:"100%",accentColor:GOLD}}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:5}}>Semaines : <span style={{color:GOLD,fontWeight:700}}>{simS}</span></div><input type="range" min="1" max="8" value={simS} onChange={e=>setSimS(Number(e.target.value))} style={{width:"100%",accentColor:GOLD}}/></div>
      </div>
      {simSteps.map(s=><div key={s.s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:8,background:s.s===0?`${GOLD}15`:T.card2(dark),border:`1px solid ${s.s===0?GOLD:T.border(dark)}`,marginBottom:4}}>
        <span style={{fontSize:11,color:T.text2(dark)}}>{s.s===0?"Aujourd'hui":`Semaine ${s.s}`}</span>
        <div style={{display:"flex",gap:10}}><span style={{fontSize:12,fontWeight:700,color:T.text(dark)}}>{s.p}€</span><span style={{fontSize:12,fontWeight:800,color:s.ok?"#34c759":"#ff3b30"}}>{s.m}€</span></div>
      </div>)}
    </Card>}
  </div>;
}

// ── TAB AGENT ─────────────────────────────────────────────────────────────────
function TabAgent({dark,session,history,stock}){
  const [subTab,setSubTab]=useState("favoris");
  const [msgTemplate,setMsgTemplate]=useState("Bonjour ! 😊 Je vois que vous avez mis mon article en favori — je peux faire un geste sur le prix si vous êtes intéressé·e !");
  const [msgL,setMsgL]=useState(false);
  const [offerS,setOfferS]=useState({threshold:80,counter:90,autoAccept:true});
  const [pubAnnonce,setPubAnnonce]=useState(null);
  const [pubStep,setPubStep]=useState(0);

  const genMsg=async()=>{
    setMsgL(true);
    const p=`3 messages naturels pour contacter un favori Vinted. UNIQUEMENT JSON: {"messages":["message sympa","message court","message avec remise"]}`;
    try{const t=await callClaude(p);const r=pj(t);if(r?.messages)setMsgTemplate(r.messages[0]);}catch{}finally{setMsgL(false);}
  };

  return <div>
    <Title dark={dark} sub="Automatise tes interactions Vinted">🤖 Agent IA Vinted</Title>

    <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
      {[["favoris","📨 Favoris"],["offres","🤝 Offres"],["publier","📤 Publier"],["guide","📖 Guide"]].map(([k,l])=>(
        <button key={k} onClick={()=>setSubTab(k)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${subTab===k?GOLD:T.border(dark)}`,background:subTab===k?`${GOLD}15`:"transparent",color:subTab===k?GOLD:T.text2(dark),fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
      ))}
    </div>

    {subTab==="favoris"&&<div>
      <Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`}}>
        <Label dark={dark}>💡 Comment ça marche</Label>
        <p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.6}}>L'agent baisse le prix de 10% → Vinted notifie automatiquement tous tes favoris. La baisse déclenche une notification push chez tous les acheteurs intéressés.</p>
      </Card>
      <Card dark={dark}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Label dark={dark} style={{marginBottom:0}}>Message template</Label>
          <Btn onClick={genMsg} disabled={msgL} variant="outline" small>{msgL?"...":"✦ Générer"}</Btn>
        </div>
        <Txta value={msgTemplate} onChange={e=>setMsgTemplate(e.target.value)} dark={dark} rows={3}/>
      </Card>
      {stock.filter(s=>s.statut==="en_vente").length>0&&<Card dark={dark}>
        <Label dark={dark}>Articles en vente ☁️</Label>
        {stock.filter(s=>s.statut==="en_vente").slice(0,4).map(a=><div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border(dark)}`}}>
          <div><div style={{fontSize:12,fontWeight:600,color:T.text(dark)}}>{a.titre}</div><div style={{fontSize:10,color:T.text2(dark)}}>{a.prix}€</div></div>
          <span style={{padding:"3px 8px",borderRadius:20,background:"#34c75915",color:"#34c759",fontSize:10,fontWeight:700}}>Sync ✓</span>
        </div>)}
      </Card>}
      <Card dark={dark} style={{background:`${GOLD}10`,border:`1px solid ${GOLD}30`}}>
        <Label dark={dark} style={{color:GOLD}}>▶️ Pour lancer l'agent</Label>
        <p style={{margin:0,fontSize:12,color:T.text(dark),lineHeight:1.6}}>Ouvre l'extension Chrome ListAI Pro v2 → Dashboard → Synchroniser → Scanner les favoris</p>
      </Card>
    </div>}

    {subTab==="offres"&&<div>
      <Card dark={dark} style={{borderLeft:"3px solid #34c759"}}>
        <Label dark={dark}>💡 Gestion automatique</Label>
        <p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.6}}>L'extension détecte les offres reçues. Elle accepte si l'offre ≥ ton seuil, sinon contre-offre automatiquement.</p>
      </Card>
      <Card dark={dark}>
        <Label dark={dark}>⚙️ Paramètres</Label>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:T.text2(dark),marginBottom:7,display:"flex",justifyContent:"space-between"}}><span>Accepter si offre ≥</span><span style={{color:GOLD,fontWeight:700}}>{offerS.threshold}%</span></div>
          <input type="range" min="50" max="100" value={offerS.threshold} onChange={e=>setOfferS(p=>({...p,threshold:Number(e.target.value)}))} style={{width:"100%",accentColor:GOLD}}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:T.text2(dark),marginBottom:7,display:"flex",justifyContent:"space-between"}}><span>Contre-offrir à</span><span style={{color:GOLD,fontWeight:700}}>{offerS.counter}%</span></div>
          <input type="range" min="50" max="100" value={offerS.counter} onChange={e=>setOfferS(p=>({...p,counter:Number(e.target.value)}))} style={{width:"100%",accentColor:GOLD}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${T.border(dark)}`}}>
          <div><div style={{fontSize:13,fontWeight:600,color:T.text(dark)}}>Acceptation automatique</div><div style={{fontSize:11,color:T.text2(dark)}}>Si offre ≥ seuil, accepte sans confirmation</div></div>
          <Toggle checked={offerS.autoAccept} onChange={e=>setOfferS(p=>({...p,autoAccept:e.target.checked}))} dark={dark}/>
        </div>
      </Card>
    </div>}

    {subTab==="publier"&&<div>
      <Card dark={dark} style={{borderLeft:"3px solid #007aff"}}>
        <Label dark={dark}>💡 Publication automatique</Label>
        <p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.6}}>Sélectionne une annonce, copie le JSON, colle dans l'extension → Publier sur Vinted. Titre, description et prix remplis automatiquement !</p>
      </Card>
      {history.length>0?<div>
        <Label dark={dark}>Sélectionne une annonce :</Label>
        {history.slice(0,5).map(h=><div key={h.id} onClick={()=>{setPubAnnonce(h);setPubStep(0);}} style={{padding:"12px",borderRadius:10,cursor:"pointer",border:`2px solid ${pubAnnonce?.id===h.id?GOLD:T.border(dark)}`,background:pubAnnonce?.id===h.id?`${GOLD}10`:T.card(dark),marginBottom:8,transition:"all .15s"}}>
          <div style={{fontSize:13,fontWeight:600,color:T.text(dark)}}>{h.result?.titre}</div>
          <div style={{fontSize:10,color:T.text2(dark),marginTop:3}}>{h.date} · {h.result?.prix_recommande}€</div>
        </div>)}
        {pubAnnonce&&<div>
          <div style={{background:T.card2(dark),borderRadius:10,padding:12,fontFamily:"monospace",fontSize:10,color:T.text2(dark),lineHeight:1.6,marginBottom:10,maxHeight:100,overflow:"auto"}}>
            {JSON.stringify({titre:pubAnnonce.result?.titre,description:pubAnnonce.result?.description,prix_recommande:pubAnnonce.result?.prix_recommande,marque:pubAnnonce.result?.marque,taille:pubAnnonce.result?.taille},null,2)}
          </div>
          <Btn onClick={()=>{navigator.clipboard.writeText(JSON.stringify({titre:pubAnnonce.result?.titre,description:pubAnnonce.result?.description,prix_recommande:pubAnnonce.result?.prix_recommande,marque:pubAnnonce.result?.marque,taille:pubAnnonce.result?.taille}));setPubStep(1);}} full>📋 Copier le JSON</Btn>
          {pubStep>=1&&<div style={{marginTop:10,padding:"10px 14px",borderRadius:10,background:"#f0fff4",border:"1px solid #c3f0ca"}}><p style={{margin:0,fontSize:12,color:"#34c759",fontWeight:600}}>✓ Copié ! Colle dans l'extension → onglet Publier</p></div>}
        </div>}
      </div>:<Empty emoji="📝" title="Aucune annonce" sub="Génère d'abord une annonce dans l'onglet ✦"/>}
    </div>}

    {subTab==="guide"&&<div>
      {[{i:1,ico:"🔌",t:"Installe l'extension",d:"Télécharge ListAI Pro v2 depuis l'onglet Extension. Installe dans Chrome en mode développeur."},{i:2,ico:"🌐",t:"Ouvre Vinted",d:"Connecte-toi à ton compte Vinted dans Chrome."},{i:3,ico:"🔄",t:"Synchronise",d:"Clique ✦ → Dashboard → Synchroniser. Tes annonces ListAI apparaissent dans l'extension."},{i:4,ico:"▶️",t:"Lance l'agent",d:"Active les automatisations → Scanner les favoris. L'agent surveille tes articles."}].map(inst=>(
        <Card key={inst.i} dark={dark}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:40,height:40,borderRadius:12,background:`${GOLD}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{inst.ico}</div>
            <div><div style={{fontSize:13,fontWeight:700,color:T.text(dark),marginBottom:4}}>Étape {inst.i} — {inst.t}</div><div style={{fontSize:12,color:T.text2(dark),lineHeight:1.6}}>{inst.d}</div></div>
          </div>
        </Card>
      ))}
      <Card dark={dark} style={{borderLeft:"3px solid #ff9500"}}><p style={{margin:0,fontSize:12,color:T.text(dark),lineHeight:1.6}}>⚠️ <strong style={{color:"#ff9500"}}>Limite :</strong> 50 actions max/jour · délais 10-20s entre chaque action.</p></Card>
    </div>}
  </div>;
}

// ── TAB STOCK ─────────────────────────────────────────────────────────────────
function TabStock({dark,session,stock,setStock,history}){
  const [form,setForm]=useState({titre:"",marque:"",taille:"",prix:"",plateforme:"Vinted",etat:"Très bon état",notes:""});
  const [showForm,setShowForm]=useState(false);
  const [filter,setFilter]=useState("tous");
  const [saving,setSaving]=useState(false);
  const statuts=[{k:"en_vente",l:"En vente",c:"#007aff"},{k:"vendu",l:"Vendu",c:"#34c759"},{k:"reserve",l:"Réservé",c:"#ff9500"}];
  const filtered=filter==="tous"?stock:stock.filter(s=>s.statut===filter);
  const totalCA=stock.filter(s=>s.statut==="vendu").reduce((sum,s)=>sum+(parseFloat(s.prix)||0),0);

  const addArticle=async()=>{
    if(!form.titre.trim())return;setSaving(true);
    const a={...form,statut:"en_vente",dateAjout:new Date().toLocaleDateString("fr-FR")};
    const saved=await db.addStock(session.user.id,a,session.access_token);
    if(saved?.id)setStock(prev=>[{...a,id:saved.id},...prev]);
    setForm({titre:"",marque:"",taille:"",prix:"",plateforme:"Vinted",etat:"Très bon état",notes:""});setShowForm(false);setSaving(false);
  };
  const updateStatut=async(id,statut)=>{await db.updStock(session.user.id,id,{statut},session.access_token);setStock(prev=>prev.map(s=>s.id===id?{...s,statut}:s));};
  const deleteArticle=async(id)=>{await db.delStock(session.user.id,id,session.access_token);setStock(prev=>prev.filter(s=>s.id!==id));};
  const importFromHistory=async h=>{
    const a={titre:h.result.titre,marque:h.result.marque,taille:h.result.taille,prix:h.result.prix_recommande,plateforme:"Vinted",etat:h.result.etat,notes:"",statut:"en_vente",dateAjout:new Date().toLocaleDateString("fr-FR")};
    const saved=await db.addStock(session.user.id,a,session.access_token);
    if(saved?.id)setStock(prev=>[{...a,id:saved.id},...prev]);
  };

  return <div>
    <Title dark={dark} sub="Synchronisé sur tous tes appareils ☁️">📦 Gestion du stock</Title>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
      {[["En vente",stock.filter(s=>s.statut==="en_vente").length,"#007aff"],["Vendus",stock.filter(s=>s.statut==="vendu").length,"#34c759"],["CA total",`${totalCA.toFixed(0)}€`,GOLD]].map(([l,v,c])=>(
        <Card key={l} dark={dark} style={{textAlign:"center",padding:14,marginBottom:0}}>
          <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
          <div style={{fontSize:10,color:T.text2(dark),marginTop:3,fontWeight:600}}>{l}</div>
        </Card>
      ))}
    </div>

    <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
      {[["tous","Tous"],...statuts.map(s=>[s.k,s.l])].map(([k,l])=>(
        <button key={k} onClick={()=>setFilter(k)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${filter===k?GOLD:T.border(dark)}`,background:filter===k?`${GOLD}15`:"transparent",color:filter===k?GOLD:T.text2(dark),fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>
      ))}
      <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:20,border:"none",background:`linear-gradient(135deg,${GOLD},#e8c584)`,color:"#1a1a2e",fontSize:11,fontWeight:800,cursor:"pointer"}}>+ Ajouter</button>
    </div>

    {showForm&&<Card dark={dark}>
      <Label dark={dark}>Nouvel article</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Titre *</div><Inp value={form.titre} onChange={e=>setForm(p=>({...p,titre:e.target.value}))} placeholder="Ex: Veste Zara S" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Marque</div><Inp value={form.marque} onChange={e=>setForm(p=>({...p,marque:e.target.value}))} placeholder="Zara" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Taille</div><Inp value={form.taille} onChange={e=>setForm(p=>({...p,taille:e.target.value}))} placeholder="S / 36" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Prix (€)</div><Inp type="number" value={form.prix} onChange={e=>setForm(p=>({...p,prix:e.target.value}))} placeholder="25" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Plateforme</div><select value={form.plateforme} onChange={e=>setForm(p=>({...p,plateforme:e.target.value}))} style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border(dark)}`,borderRadius:10,fontSize:14,background:T.card(dark),color:T.text(dark),outline:"none"}}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={addArticle} disabled={saving} small>{saving?"☁️ Sauvegarde...":"Ajouter"}</Btn><Btn onClick={()=>setShowForm(false)} variant="ghost" small>Annuler</Btn></div>
    </Card>}

    {history.length>0&&<Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`}}>
      <Label dark={dark}>↩ Importer depuis l'historique</Label>
      {history.slice(0,3).map(h=><div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:12,color:T.text(dark)}}>{h.result.titre}</span>
        <Btn onClick={()=>importFromHistory(h)} variant="outline" small>Importer</Btn>
      </div>)}
    </Card>}

    {filtered.length===0?<Empty emoji="📦" title="Aucun article" sub="Ajoute ton premier article en stock !"/>:
    <div>{filtered.map(art=>{const s=statuts.find(x=>x.k===art.statut);return <Card key={art.id} dark={dark}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{flex:1}}><p style={{margin:"0 0 3px",fontSize:13,fontWeight:700,color:T.text(dark)}}>{art.titre}</p><p style={{margin:0,fontSize:10,color:T.text2(dark)}}>{art.marque} · {art.taille} · {art.plateforme}</p></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:15,fontWeight:900,color:GOLD}}>{art.prix}€</span>
          <span style={{padding:"3px 8px",borderRadius:20,background:`${s.c}15`,color:s.c,fontSize:10,fontWeight:700}}>{s.l}</span>
        </div>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {statuts.filter(x=>x.k!==art.statut).map(x=><button key={x.k} onClick={()=>updateStatut(art.id,x.k)} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${x.c}40`,background:`${x.c}10`,color:x.c,fontSize:11,fontWeight:700,cursor:"pointer"}}>→ {x.l}</button>)}
        <button onClick={()=>deleteArticle(art.id)} style={{marginLeft:"auto",padding:"4px 8px",borderRadius:7,border:"1px solid #ff3b3040",background:"#ff3b3010",color:"#ff3b30",fontSize:11,cursor:"pointer"}}>🗑</button>
      </div>
    </Card>;})}</div>}
  </div>;
}

// ── REPONSE CARD ──────────────────────────────────────────────────────────────
function ReponseCard({r,dark}){
  const [copied,setCopied]=useState(false);
  return <Card dark={dark}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <span style={{fontSize:11,fontWeight:700,color:GOLD,textTransform:"uppercase"}}>{r.label}</span>
      <button onClick={()=>{navigator.clipboard.writeText(r.texte);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${T.border(dark)}`,background:T.card2(dark),color:copied?"#34c759":GOLD,fontSize:11,fontWeight:700,cursor:"pointer"}}>{copied?"✓ Copié":"Copier"}</button>
    </div>
    <p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.7}}>{r.texte}</p>
  </Card>;
}

// ── TAB RÉPONSES ──────────────────────────────────────────────────────────────
function TabReponses({dark}){
  const QUESTIONS=["Toujours disponible ?","Dernière baisse de prix ?","Défauts / imperfections ?","Échange possible ?","Délai d'envoi ?","Taille dans le vrai ?","Autre question"];
  const [question,setQuestion]=useState(QUESTIONS[0]);
  const [customQ,setCustomQ]=useState("");
  const [article,setArticle]=useState("");
  const [ton,setTon]=useState("sympa");
  const [loading,setLoading]=useState(false);
  const [reponses,setReponses]=useState(null);

  const generate=async()=>{
    const q=question==="Autre question"?customQ:question;if(!q.trim())return;
    setLoading(true);setReponses(null);
    const p=`Vendeur Vinted. Article: "${article||"vêtement"}", question: "${q}". 3 réponses ${ton==="sympa"?"chaleureuses":ton==="pro"?"professionnelles":"courtes"}. UNIQUEMENT JSON: {"reponses":[{"label":"Option 1","texte":"réponse"},{"label":"Option 2","texte":"réponse"},{"label":"Option 3","texte":"réponse"}]}`;
    try{const t=await callClaude(p);const r=pj(t);if(r)setReponses(r);}catch{}finally{setLoading(false);}
  };

  return <div>
    <Title dark={dark} sub="Génère des réponses parfaites aux acheteurs">💬 Réponses acheteurs</Title>
    <Card dark={dark}><Label dark={dark}>Article concerné (optionnel)</Label><Inp value={article} onChange={e=>setArticle(e.target.value)} placeholder="Ex: veste en cuir Zara S..." dark={dark}/></Card>
    <Card dark={dark}>
      <Label dark={dark}>Question de l'acheteur</Label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:question==="Autre question"?10:0}}>
        {QUESTIONS.map(q=><button key={q} onClick={()=>setQuestion(q)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${question===q?GOLD:T.border(dark)}`,background:question===q?`${GOLD}15`:"transparent",color:question===q?GOLD:T.text2(dark),fontSize:11,fontWeight:700,cursor:"pointer"}}>{q}</button>)}
      </div>
      {question==="Autre question"&&<div style={{marginTop:10}}><Inp value={customQ} onChange={e=>setCustomQ(e.target.value)} placeholder="Tape la question..." dark={dark}/></div>}
    </Card>
    <Card dark={dark}><Label dark={dark}>Ton</Label><div style={{display:"flex",gap:8}}>{[["sympa","😊 Sympa"],["pro","💼 Pro"],["court","⚡ Court"]].map(([k,l])=><button key={k} onClick={()=>setTon(k)} style={{flex:1,padding:"9px",borderRadius:10,border:`1.5px solid ${ton===k?GOLD:T.border(dark)}`,background:ton===k?`${GOLD}15`:"transparent",color:ton===k?GOLD:T.text2(dark),fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>)}</div></Card>
    <Btn onClick={generate} disabled={loading||(question==="Autre question"&&!customQ.trim())} full>{loading?"Génération...":"✦ Générer 3 réponses"}</Btn>
    {loading&&<Spin/>}
    {reponses&&!loading&&<div style={{marginTop:12}}>
      {reponses.reponses?.map((r,i)=><ReponseCard key={i} r={r} dark={dark}/>)}
    </div>}
  </div>;
}

// ── TAB RÉ-OPT ───────────────────────────────────────────────────────────────
function TabReopt({dark}){
  const [ancienTitre,setAncienTitre]=useState("");
  const [ancienneDesc,setAncienneDesc]=useState("");
  const [raison,setRaison]=useState("ne_vend_pas");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const RAISONS=[["ne_vend_pas","❌ Ne se vend pas"],["peu_vues","👁️ Peu de vues"],["peu_favoris","❤️ Peu de favoris"],["nego_trop_basse","💸 Offres trop basses"],["relooking_complet","✨ Relooking complet"]];

  const optimise=async()=>{
    if(!ancienneDesc.trim())return;setLoading(true);setResult(null);
    const p=`Expert Vinted. Ré-optimise cette annonce qui "${RAISONS.find(r=>r[0]===raison)[1]}". Titre: "${ancienTitre}", Description: "${ancienneDesc}". UNIQUEMENT JSON: {"nouveau_titre":"max 60 chars","nouvelle_description":"6-8 lignes","nouveaux_hashtags":"15 #hashtags","changements":["c1","c2","c3"],"conseil_prix":"conseil"}`;
    try{const t=await callClaude(p);const r=pj(t);if(r)setResult(r);}catch(e){console.error(e);}finally{setLoading(false);}
  };

  return <div>
    <Title dark={dark} sub="Redonner vie à une annonce qui stagne">🔄 Ré-optimiseur</Title>
    <Card dark={dark}><Label dark={dark}>Pourquoi ré-optimiser ?</Label><div style={{display:"flex",flexDirection:"column",gap:7}}>{RAISONS.map(([k,l])=><div key={k} onClick={()=>setRaison(k)} style={{padding:"10px 12px",borderRadius:10,cursor:"pointer",border:`1.5px solid ${raison===k?GOLD:T.border(dark)}`,background:raison===k?`${GOLD}10`:T.card2(dark),display:"flex",alignItems:"center",gap:9,transition:"all .15s"}}>
      <div style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${raison===k?GOLD:T.border(dark)}`,background:raison===k?GOLD:"transparent"}}/>
      <span style={{fontSize:13,fontWeight:raison===k?700:400,color:raison===k?GOLD:T.text(dark)}}>{l}</span>
    </div>)}</div></Card>
    <Card dark={dark}><Label dark={dark}>Titre actuel (optionnel)</Label><Inp value={ancienTitre} onChange={e=>setAncienTitre(e.target.value)} placeholder="Ton titre..." dark={dark}/></Card>
    <Card dark={dark}><Label dark={dark}>Description actuelle *</Label><Txta value={ancienneDesc} onChange={e=>setAncienneDesc(e.target.value)} placeholder="Colle ta description..." dark={dark} rows={5}/></Card>
    <Btn onClick={optimise} disabled={loading||!ancienneDesc.trim()} full>{loading?"Ré-optimisation...":"✦ Ré-optimiser"}</Btn>
    {loading&&<Spin/>}
    {result&&!loading&&<div style={{marginTop:12}}>
      <Card dark={dark} style={{background:`${GOLD}10`,border:`1px solid ${GOLD}30`}}>
        <Label dark={dark} style={{color:GOLD}}>✨ Ce qui a changé</Label>
        {result.changements?.map((c,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:5}}><span style={{color:GOLD}}>✦</span><span style={{fontSize:12,color:T.text(dark)}}>{c}</span></div>)}
      </Card>
      <CopyField icon="✏️" label="Nouveau titre" value={result.nouveau_titre} dark={dark}/>
      <CopyField icon="📝" label="Nouvelle description" value={result.nouvelle_description} dark={dark}/>
      <CopyField icon="#️⃣" label="Nouveaux hashtags" value={result.nouveaux_hashtags} dark={dark}/>
      {result.conseil_prix&&<Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`}}><p style={{margin:0,fontSize:13,color:T.text(dark),lineHeight:1.7}}>💰 <strong style={{color:GOLD}}>Prix :</strong> {result.conseil_prix}</p></Card>}
    </div>}
  </div>;
}

// ── TAB VENTES ────────────────────────────────────────────────────────────────
function TabVentes({dark,session,ventes,setVentes}){
  const [form,setForm]=useState({article:"",prix_vente:"",prix_achat:"",plateforme:"Vinted",date:new Date().toISOString().split("T")[0]});
  const [showForm,setShowForm]=useState(false);
  const [periode,setPeriode]=useState("mois");
  const [saving,setSaving]=useState(false);
  const now=new Date();
  const filtered=ventes.filter(v=>{const d=new Date(v.date);if(periode==="semaine")return(now-d)/864e5<=7;if(periode==="mois")return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();if(periode==="annee")return d.getFullYear()===now.getFullYear();return true;});
  const CA=filtered.reduce((s,v)=>s+(parseFloat(v.prix_vente)||0),0);
  const couts=filtered.reduce((s,v)=>s+(parseFloat(v.prix_achat)||0),0);
  const marge=CA-couts;
  const margePct=CA>0?((marge/CA)*100).toFixed(0):0;
  const byPlatform=PLATFORMS.map(p=>({p,n:filtered.filter(v=>v.plateforme===p).length,ca:filtered.filter(v=>v.plateforme===p).reduce((s,v)=>s+(parseFloat(v.prix_vente)||0),0)})).filter(x=>x.n>0).sort((a,b)=>b.ca-a.ca);

  const addVente=async()=>{
    if(!form.article.trim()||!form.prix_vente)return;setSaving(true);
    const saved=await db.addVente(session.user.id,form,session.access_token);
    if(saved?.id)setVentes(prev=>[{...form,id:saved.id},...prev]);
    setForm({article:"",prix_vente:"",prix_achat:"",plateforme:"Vinted",date:new Date().toISOString().split("T")[0]});setShowForm(false);setSaving(false);
  };
  const delVente=async id=>{await db.delVente(session.user.id,id,session.access_token);setVentes(prev=>prev.filter(x=>x.id!==id));};

  return <div>
    <Title dark={dark} sub="Synchronisé sur tous tes appareils ☁️">📊 Suivi des ventes</Title>

    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {[["semaine","7 jours"],["mois","Ce mois"],["annee","Cette année"],["tout","Tout"]].map(([k,l])=>(
        <button key={k} onClick={()=>setPeriode(k)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${periode===k?GOLD:T.border(dark)}`,background:periode===k?`${GOLD}15`:"transparent",color:periode===k?GOLD:T.text2(dark),fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>
      ))}
      <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:20,border:"none",background:`linear-gradient(135deg,${GOLD},#e8c584)`,color:"#1a1a2e",fontSize:11,fontWeight:800,cursor:"pointer"}}>+ Ajouter</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {[["💰 CA",`${CA.toFixed(0)}€`,GOLD],["📈 Marge",`${marge.toFixed(0)}€`,marge>=0?"#34c759":"#ff3b30"],["🛍️ Ventes",filtered.length,"#007aff"],["📊 %",`${margePct}%`,marge>=0?"#34c759":"#ff3b30"]].map(([l,v,c])=>(
        <Card key={l} dark={dark} style={{padding:14,marginBottom:0}}>
          <div style={{fontSize:10,fontWeight:600,color:T.text2(dark),marginBottom:4}}>{l}</div>
          <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
        </Card>
      ))}
    </div>

    {byPlatform.length>0&&<Card dark={dark}>
      <Label dark={dark}>🏆 Par plateforme</Label>
      {byPlatform.map((x,i)=><div key={x.p} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:i<byPlatform.length-1?8:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:600,color:T.text(dark)}}>{x.p}</span><span style={{fontSize:10,color:T.text2(dark)}}>{x.n} vente{x.n>1?"s":""}</span></div>
        <span style={{fontWeight:800,color:GOLD}}>{x.ca.toFixed(0)}€</span>
      </div>)}
    </Card>}

    {showForm&&<Card dark={dark}>
      <Label dark={dark}>Nouvelle vente</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Article *</div><Inp value={form.article} onChange={e=>setForm(p=>({...p,article:e.target.value}))} placeholder="Ex: Veste Zara S" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Prix de vente (€) *</div><Inp type="number" value={form.prix_vente} onChange={e=>setForm(p=>({...p,prix_vente:e.target.value}))} placeholder="25" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Prix d'achat (€)</div><Inp type="number" value={form.prix_achat} onChange={e=>setForm(p=>({...p,prix_achat:e.target.value}))} placeholder="5" dark={dark}/></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Plateforme</div><select value={form.plateforme} onChange={e=>setForm(p=>({...p,plateforme:e.target.value}))} style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border(dark)}`,borderRadius:10,fontSize:14,background:T.card(dark),color:T.text(dark),outline:"none"}}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
        <div><div style={{fontSize:11,color:T.text2(dark),marginBottom:6}}>Date</div><Inp type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} dark={dark}/></div>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={addVente} disabled={saving} small>{saving?"☁️...":"Enregistrer"}</Btn><Btn onClick={()=>setShowForm(false)} variant="ghost" small>Annuler</Btn></div>
    </Card>}

    {ventes.length===0?<Empty emoji="📊" title="Aucune vente" sub="Ajoute ta première vente !"/>:
    <div>{filtered.map(v=>{const m=(parseFloat(v.prix_vente)||0)-(parseFloat(v.prix_achat)||0);return <Card key={v.id} dark={dark} style={{padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><p style={{margin:"0 0 3px",fontSize:13,fontWeight:600,color:T.text(dark)}}>{v.article}</p><p style={{margin:0,fontSize:10,color:T.text2(dark)}}>{v.plateforme} · {v.date}</p></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:800,color:GOLD}}>{parseFloat(v.prix_vente).toFixed(0)}€</div>{v.prix_achat&&<div style={{fontSize:10,color:m>=0?"#34c759":"#ff3b30",fontWeight:700}}>+{m.toFixed(0)}€</div>}</div>
          <button onClick={()=>delVente(v.id)} style={{padding:"3px 7px",borderRadius:6,border:"1px solid #ff3b3040",background:"#ff3b3010",color:"#ff3b30",fontSize:11,cursor:"pointer"}}>🗑</button>
        </div>
      </div>
    </Card>;})}
    </div>}
  </div>;
}

// ── TAB HISTORIQUE ────────────────────────────────────────────────────────────
function TabHistorique({dark,session,history,setHistory,setTab,setResultToShow}){
  const delListing=async id=>{await db.delListing(session.user.id,id,session.access_token);setHistory(p=>p.filter(x=>x.id!==id));};
  const clearAll=async()=>{await db.clearListings(session.user.id,session.access_token);setHistory([]);};

  if(!history.length)return <div><Title dark={dark}>🕓 Historique</Title><Empty emoji="📭" title="Aucune annonce générée" sub="Génère ta première annonce dans l'onglet ✦ !"/></div>;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <Title dark={dark} sub={`${history.length} annonce(s) · synchronisées ☁️`}>🕓 Historique</Title>
      <Btn onClick={()=>{if(confirm("Vider tout l'historique ?"))clearAll();}} variant="danger" small>🗑 Vider</Btn>
    </div>
    <div>{history.map(h=><Card key={h.id} dark={dark}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{flex:1,marginRight:10}}>
          <p style={{margin:"0 0 3px",fontSize:13,fontWeight:700,color:T.text(dark)}}>{h.result.titre}</p>
          <p style={{margin:0,fontSize:10,color:T.text2(dark)}}>{h.date} · {h.result.marque} · {h.result.taille}</p>
        </div>
        <div style={{display:"flex",gap:6}}>
          <Btn onClick={()=>{setResultToShow(h);setTab("annonce");}} variant="outline" small>↩</Btn>
          <Btn onClick={()=>delListing(h.id)} variant="danger" small>🗑</Btn>
        </div>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {[h.result.categorie,h.result.etat,`${h.result.prix_recommande}€`].filter(Boolean).map(tag=><span key={tag} style={{padding:"3px 8px",borderRadius:20,background:`${GOLD}15`,color:GOLD,fontSize:10,fontWeight:600}}>{tag}</span>)}
      </div>
    </Card>)}</div>
  </div>;
}

// ── TAB EXTENSION ─────────────────────────────────────────────────────────────
function TabExtension({dark}){
  const [tutoStep,setTutoStep]=useState(0);
  const INSTALL_STEPS=[
    {icon:"📥",title:"Télécharge l'extension",desc:"Clique sur le bouton ci-dessous pour télécharger le fichier ZIP de l'extension Chrome ListAI Pro v2.",action:true},
    {icon:"📁",title:"Dézippe le fichier",desc:"Ouvre le fichier ZIP téléchargé et extrais le dossier listai-ext-v2 sur ton bureau ou dans tes téléchargements."},
    {icon:"🔧",title:"Active le mode développeur",desc:'Dans Chrome, tape chrome://extensions dans la barre d\'adresse. Active le "Mode développeur" en haut à droite.'},
    {icon:"📂",title:"Charge l'extension",desc:'Clique sur "Charger l\'extension non empaquetée" et sélectionne le dossier listai-ext-v2 dézippé.'},
    {icon:"✅",title:"C'est installé !",desc:"L'icône ✦ ListAI Pro apparaît dans ta barre d'extensions Chrome. Clique dessus pour commencer !"},
  ];

  const USAGE_STEPS=[
    {icon:"☁️",title:"1. Synchronise",desc:"Ouvre listai-pro-virid.vercel.app, connecte-toi, puis dans l'extension clique Dashboard → Synchroniser."},
    {icon:"✦",title:"2. Génère une annonce",desc:"Dans l'app ListAI Pro, génère une annonce avec tes photos. Elle apparaît automatiquement dans l'extension."},
    {icon:"📤",title:"3. Publie sur Vinted",desc:"Dans l'extension → onglet Publier → sélectionne l'annonce → clique Publier sur Vinted. Titre, description et prix se remplissent automatiquement !"},
    {icon:"⚙️",title:"4. Active l'agent",desc:"Dans l'extension → Agent → active Baisse de prix auto, Gestion des offres. L'agent surveille tes articles 24h/24."},
  ];

  return <div>
    <Title dark={dark} sub="Installe et utilise l'extension Chrome">🧩 Extension Chrome</Title>

    {/* Download card */}
    <div style={{background:`linear-gradient(135deg,${GOLD},#e8c584)`,borderRadius:20,padding:20,marginBottom:16,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:8}}>✦</div>
      <h3 style={{fontSize:18,fontWeight:900,color:"#1a1a2e",margin:"0 0 4px"}}>ListAI Pro v2</h3>
      <p style={{fontSize:12,color:"rgba(26,26,46,0.7)",margin:"0 0 16px"}}>Extension Chrome pour publier sur Vinted automatiquement</p>
      <a href="/listai-extension-v2.zip" download style={{display:"inline-block",background:"#1a1a2e",color:GOLD,padding:"12px 24px",borderRadius:12,fontSize:14,fontWeight:800,textDecoration:"none"}}>
        📥 Télécharger l'extension
      </a>
    </div>

    {/* Installation */}
    <Card dark={dark}>
      <Label dark={dark}>📋 Guide d'installation</Label>
      {INSTALL_STEPS.map((step,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:i<INSTALL_STEPS.length-1?14:0}}>
        <div style={{width:36,height:36,borderRadius:10,background:`${GOLD}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{step.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text(dark),marginBottom:3}}>Étape {i+1} — {step.title}</div>
          <div style={{fontSize:12,color:T.text2(dark),lineHeight:1.6}}>{step.desc}</div>
          {step.action&&<a href="/listai-extension-v2.zip" download style={{display:"inline-block",marginTop:8,padding:"6px 14px",background:`${GOLD}20`,border:`1px solid ${GOLD}`,borderRadius:8,color:GOLD,fontSize:12,fontWeight:700,textDecoration:"none"}}>📥 Télécharger maintenant</a>}
        </div>
      </div>)}
    </Card>

    {/* Utilisation */}
    <Card dark={dark}>
      <Label dark={dark}>🚀 Comment utiliser l'extension</Label>
      {USAGE_STEPS.map((step,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:i<USAGE_STEPS.length-1?14:0}}>
        <div style={{width:36,height:36,borderRadius:10,background:`${GOLD}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{step.icon}</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:T.text(dark),marginBottom:3}}>{step.title}</div>
          <div style={{fontSize:12,color:T.text2(dark),lineHeight:1.6}}>{step.desc}</div>
        </div>
      </div>)}
    </Card>

    {/* FAQ */}
    <Card dark={dark} style={{borderLeft:`3px solid #007aff`}}>
      <Label dark={dark} style={{color:"#007aff"}}>❓ Questions fréquentes</Label>
      {[
        ["L'extension peut-elle publier mes photos ?","Non, les photos doivent être ajoutées manuellement sur Vinted. L'extension remplit titre, description et prix automatiquement."],
        ["Pourquoi Synchroniser ne fonctionne pas ?","Assure-toi que listai-pro-virid.vercel.app est ouvert dans Chrome et que tu es connecté(e)."],
        ["L'agent est-il sûr ?","Oui ! L'agent respecte les délais Vinted (10-20s entre chaque action) et limite à 50 actions/jour."],
      ].map(([q,a],i)=><div key={i} style={{marginBottom:i<2?12:0}}>
        <div style={{fontSize:12,fontWeight:700,color:T.text(dark),marginBottom:4}}>{q}</div>
        <div style={{fontSize:12,color:T.text2(dark),lineHeight:1.5}}>{a}</div>
      </div>)}
    </Card>

    <Card dark={dark} style={{borderLeft:"3px solid #ff9500"}}>
      <p style={{margin:0,fontSize:12,color:T.text(dark),lineHeight:1.6}}>⚠️ <strong style={{color:"#ff9500"}}>Limite journalière :</strong> 50 actions max/jour · délais 10-20s entre chaque action · Ne pas laisser tourner toute la nuit.</p>
    </Card>
  </div>;
}


// ── TAB PUBLICATIONS ────────────────────────────────────────────────────────
function TabPublications({dark,session,history}){
  const [pubQueue,setPubQueue]=useState([]);
  const [extLog,setExtLog]=useState([]);
  const [extStats,setExtStats]=useState(null);
  const [selectedListing,setSelectedListing]=useState(null);
  const [publishMode,setPublishMode]=useState("direct");
  const [copied,setCopied]=useState(false);
  const [toast2,setToast2]=useState(null);

  useEffect(()=>{
    const onMsg=(e)=>{
      if(e.data?.type==="LISTAI_EXT_STATE"){
        setPubQueue(e.data.publishQueue||[]);
        setExtLog((e.data.log||[]).filter(l=>["published","price_drop"].includes(l.action)));
        setExtStats(e.data.stats||null);
      }
    };
    window.addEventListener("message",onMsg);
    try{const q=localStorage.getItem("listai_pub_queue");if(q)setPubQueue(JSON.parse(q));}catch{}
    return()=>window.removeEventListener("message",onMsg);
  },[]);

  const MODES=[
    {k:"direct",icon:"⚡",label:"Direct",desc:"Remplit /items/new automatiquement"},
    {k:"auto",icon:"🤖",label:"Auto brouillon",desc:"L IA détecte tes brouillons avec photos"},
    {k:"manual",icon:"✍️",label:"Manuel",desc:"Tu choisis toi-même le brouillon"},
  ];

  const copyJSON=()=>{
    if(!selectedListing)return;
    const listing={titre:selectedListing.result?.titre,description:selectedListing.result?.description,prix_recommande:selectedListing.result?.prix_recommande,marque:selectedListing.result?.marque,taille:selectedListing.result?.taille,etat:selectedListing.result?.etat,categorie:selectedListing.result?.categorie,sous_categorie:selectedListing.result?.sous_categorie,couleur:selectedListing.result?.couleur};
    navigator.clipboard.writeText(JSON.stringify(listing,null,2));
    setCopied(true);setTimeout(()=>setCopied(false),2500);
    setToast2("✓ JSON copié ! Colle dans l extension → onglet Publier");
    setTimeout(()=>setToast2(null),2500);
  };

  const STATUS_C={published:"#34c759",price_drop:"#ff9500",message:"#007aff",offer:GOLD};
  const extOk=typeof chrome!=="undefined"&&!!chrome?.runtime;

  return <div>
    <Title dark={dark} sub="Gère la file de publication et suit les publications">📤 Publications</Title>

    {extStats&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
      {[["Publiés",extStats.msgSent??0,"#34c759"],["Offres",extStats.offersSent??0,GOLD],["Ventes",extStats.salesDetected??0,ORANGE]].map(([l,v,c])=>(
        <Card key={l} dark={dark} style={{textAlign:"center",padding:14,marginBottom:0}}>
          <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
          <div style={{fontSize:10,color:T.text2(dark),marginTop:3,fontWeight:600}}>{l}</div>
        </Card>
      ))}
    </div>}

    <Card dark={dark} style={{borderLeft:`3px solid ${extOk?"#34c759":"#ff3b30"}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:T.text(dark)}}>{extOk?"🟢 Extension connectée":"🔴 Extension non détectée"}</div>
          <div style={{fontSize:11,color:T.text2(dark),marginTop:2}}>{extOk?`${pubQueue.length} annonce(s) en file`:"Installe l'extension Chrome ListAI Pro v2"}</div>
        </div>
        {pubQueue.length>0&&<span style={{padding:"4px 10px",borderRadius:20,background:`${GOLD}20`,color:GOLD,fontSize:12,fontWeight:800}}>{pubQueue.length} en attente</span>}
      </div>
    </Card>

    <Card dark={dark}>
      <Label dark={dark}>⚙️ Mode de publication</Label>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {MODES.map(m=>(
          <div key={m.k} onClick={()=>setPublishMode(m.k)} style={{padding:"10px 14px",borderRadius:10,cursor:"pointer",border:`2px solid ${publishMode===m.k?"#7C3AED":T.border(dark)}`,background:publishMode===m.k?`${"#7C3AED"}12`:T.card2(dark),display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}>
            <span style={{fontSize:20}}>{m.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:publishMode===m.k?700:500,color:publishMode===m.k?GOLD:T.text(dark)}}>{m.label}</div>
              <div style={{fontSize:11,color:T.text2(dark)}}>{m.desc}</div>
            </div>
            <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${publishMode===m.k?"#7C3AED":T.border(dark)}`,background:publishMode===m.k?"#7C3AED":"transparent"}}/>
          </div>
        ))}
      </div>
    </Card>

    <Card dark={dark}>
      <Label dark={dark}>📝 Annonce à publier</Label>
      {history.length===0
        ?<Empty emoji="📝" title="Aucune annonce générée" sub="Génère d abord une annonce dans l onglet ✦"/>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {history.slice(0,8).map(h=>(
            <div key={h.id} onClick={()=>setSelectedListing(selectedListing?.id===h.id?null:h)} style={{padding:"12px 14px",borderRadius:12,cursor:"pointer",border:`2px solid ${selectedListing?.id===h.id?"#7C3AED":T.border(dark)}`,background:selectedListing?.id===h.id?`${"#7C3AED"}10`:T.card2(dark),transition:"all .15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1,marginRight:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text(dark)}}>{h.result?.titre}</div>
                  <div style={{fontSize:10,color:T.text2(dark),marginTop:2}}>{h.date} · {h.result?.marque} · {h.result?.prix_recommande}€</div>
                </div>
                {selectedListing?.id===h.id&&<span style={{fontSize:16,color:GOLD}}>✓</span>}
              </div>
              {selectedListing?.id===h.id&&<div style={{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}}>
                {[h.result?.categorie,h.result?.etat,h.result?.couleur].filter(Boolean).map(tag=><span key={tag} style={{padding:"2px 8px",borderRadius:20,background:`${GOLD}15`,color:GOLD,fontSize:10,fontWeight:600}}>{tag}</span>)}
              </div>}
            </div>
          ))}
        </div>}
    </Card>

    {selectedListing&&<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:10}}>
      <Btn onClick={copyJSON} full style={{background:copied?"linear-gradient(135deg,#34c759,#30d158)":GRAD}}>
        {copied?"✓ JSON Copié !":"📋 Copier le JSON pour l extension"}
      </Btn>
      <Card dark={dark} style={{borderLeft:`3px solid #007aff`,padding:12}}>
        <div style={{fontSize:12,color:T.text(dark),lineHeight:1.8}}>
          <strong style={{color:"#007aff"}}>Étapes :</strong>
          <div>1. Copie le JSON</div>
          <div>2. Ouvre <strong>ListAI Pro v2</strong> dans Chrome</div>
          <div>3. Onglet <strong>Publier</strong> → colle → lance</div>
        </div>
      </Card>
      <Card dark={dark}><Label dark={dark}>Aperçu JSON</Label>
        <pre style={{background:T.card2(dark),borderRadius:8,padding:10,fontSize:10,color:T.text2(dark),lineHeight:1.6,overflow:"auto",maxHeight:120,margin:0,whiteSpace:"pre-wrap"}}>
{JSON.stringify({titre:selectedListing.result?.titre,prix_recommande:selectedListing.result?.prix_recommande,marque:selectedListing.result?.marque,taille:selectedListing.result?.taille},null,2)}
        </pre>
      </Card>
    </div>}

    {pubQueue.length>0&&<Card dark={dark}>
      <Label dark={dark}>⏳ File de l extension ({pubQueue.length})</Label>
      {pubQueue.map((l,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<pubQueue.length-1?`1px solid ${T.border(dark)}`:"none"}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:T.text(dark)}}>{l.titre||`Article ${i+1}`}</div>
            <div style={{fontSize:10,color:T.text2(dark)}}>{l.prix_recommande}€ · {l.marque}</div>
          </div>
          <span style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:`${GOLD}15`,color:GOLD,fontWeight:700}}>#{i+1}</span>
        </div>
      ))}
    </Card>}

    {extLog.length>0&&<Card dark={dark}>
      <Label dark={dark}>📋 Journal récent</Label>
      {extLog.slice(0,8).map((item,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<Math.min(extLog.length,8)-1?`1px solid ${T.border(dark)}`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:STATUS_C[item.action]||T.text3(dark),display:"inline-block",flexShrink:0}}/>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:T.text(dark)}}>{item.target||item.action}</div>
              {item.price&&<div style={{fontSize:10,color:T.text2(dark)}}>{item.price}€</div>}
            </div>
          </div>
          <div style={{fontSize:10,color:T.text3(dark)}}>{new Date(item.ts).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
        </div>
      ))}
    </Card>}

    {!selectedListing&&extLog.length===0&&pubQueue.length===0&&<Card dark={dark} style={{borderLeft:`3px solid ${GOLD}`}}>
      <Label dark={dark} style={{color:GOLD}}>💡 Pour publier</Label>
      <div style={{fontSize:12,color:T.text(dark),lineHeight:1.8}}>
        <div>1. Sélectionne une annonce</div>
        <div>2. Copie le JSON</div>
        <div>3. Ouvre l extension Chrome ListAI Pro v2</div>
        <div>4. Onglet Publier → colle → lance !</div>
      </div>
    </Card>}

    {toast2&&<Toast msg={toast2} onDone={()=>setToast2(null)}/>}
  </div>;
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App(){
  const [dark,toggleDark]=useTheme();
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("annonce");
  const [history,setHistory]=useState([]);
  const [stock,setStock]=useState([]);
  const [ventes,setVentes]=useState([]);
  const [resultToShow,setResultToShow]=useState(null);
  const [toast,setToast]=useState(null);
  const [showTuto,setShowTuto]=useState(false);
  const [homeView,setHomeView]=useState(true);

  useEffect(()=>{
    const stored=loadSession();
    if(stored?.access_token&&stored?.user){
      try{
        const payload=JSON.parse(atob(stored.access_token.split(".")[1]));
        if(payload.exp*1000>Date.now()){loadUserData(stored);return;}
        if(stored.refresh_token){
          supa.refreshToken(stored.refresh_token).then(data=>{
            if(data.access_token){const ns={...stored,access_token:data.access_token,refresh_token:data.refresh_token};saveSession(ns);loadUserData(ns);}
            else{clearSession();setLoading(false);}
          }).catch(()=>{clearSession();setLoading(false);});
          return;
        }
      }catch{clearSession();}
    }
    setLoading(false);
  },[]);

  const loadUserData=async sess=>{
    setSession(sess);
    try{const prefs=await db.getPrefs(sess.user.id,sess.access_token);if(prefs&&prefs.dark!==undefined){/* theme handled by localStorage */}}catch{}
    const migKey=`listai_migrated_${sess.user.id}`;
    if(!localStorage.getItem(migKey)){
      const count=await db.migrate(sess.user.id,sess.access_token);
      if(count>0){setToast(`✓ ${count} données migrées vers le cloud !`);setTimeout(()=>setToast(null),3500);}
      localStorage.setItem(migKey,"1");
    }
    // Vérifie si premier lancement
    if(!localStorage.getItem("listai_tuto_seen")){
      setShowTuto(true);
      localStorage.setItem("listai_tuto_seen","1");
    }
    try{
      const [h,s,v]=await Promise.all([db.getListings(sess.user.id,sess.access_token),db.getStock(sess.user.id,sess.access_token),db.getVentes(sess.user.id,sess.access_token)]);
      setHistory(h.map(x=>({id:x.id,date:x.date,result:x.result})));
      setStock(s.map(x=>({...x,dateAjout:x.date_ajout})));
      setVentes(v);
    }catch{}
    setLoading(false);
  };

  const handleAuth=async sess=>{await loadUserData(sess);};
  const signOut=()=>{clearSession();setSession(null);setHistory([]);setStock([]);setVentes([]);};
  // Fix: table "preferences" n'existe pas → on ne persiste le thème que dans localStorage (géré par useTheme)
  const handleToggleDark = () => { toggleDark(); };

  const bg=T.bg(dark);

  if(loading)return(
    <div style={{minHeight:"100vh",background:dark?"#0a0a0f":"#f0f0ff",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"-apple-system,sans-serif"}}>
      <div style={{width:64,height:64,borderRadius:20,background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:"0 12px 40px rgba(124,58,237,0.5)"}}>⚡</div>
      <Spin/>
    </div>
  );

  if(!session)return <AuthScreen onAuth={handleAuth} dark={dark}/>;

  const COMPONENTS={
    annonce:<TabAnnonce dark={dark} session={session} history={history} setHistory={setHistory} resultToShow={resultToShow} setResultToShow={setResultToShow}/>,
    tendances:<TabTendances dark={dark}/>,
    marge:<TabMarge dark={dark}/>,
    agent:<TabAgent dark={dark} session={session} history={history} stock={stock}/>,
    stock:<TabStock dark={dark} session={session} stock={stock} setStock={setStock} history={history}/>,
    reponses:<TabReponses dark={dark}/>,
    reopt:<TabReopt dark={dark}/>,
    ventes:<TabVentes dark={dark} session={session} ventes={ventes} setVentes={setVentes}/>,
    historique:<TabHistorique dark={dark} session={session} history={history} setHistory={setHistory} setTab={setTab} setResultToShow={setResultToShow}/>,
    extension:<TabExtension dark={dark}/>,
    publications:<TabPublications dark={dark} session={session} history={history}/>,
  };

  const openTab=(t)=>{setTab(t);setHomeView(false);};

  const HOME_CARDS=[
    {id:"annonce",icon:"⚡",label:"Générer une annonce",sub:"Photos → Annonce IA en 10s",grad:"linear-gradient(135deg,#7C3AED,#2563EB)",shadow:"rgba(124,58,237,0.5)"},
    {id:"tendances",icon:"📈",label:"Tendances & Marché",sub:"Score, prix idéal, calendrier",grad:"linear-gradient(135deg,#2563EB,#06B6D4)",shadow:"rgba(37,99,235,0.4)"},
    {id:"marge",icon:"💰",label:"Calculateur de marge",sub:"Bénéfice net, simulateur",grad:"linear-gradient(135deg,#FF6B2B,#FF9500)",shadow:"rgba(255,107,43,0.4)"},
    {id:"agent",icon:"🤖",label:"Agent IA",sub:"Favoris, offres, automatisation",grad:"linear-gradient(135deg,#7C3AED,#EC4899)",shadow:"rgba(124,58,237,0.4)"},
    {id:"stock",icon:"📦",label:"Mon Stock",sub:`${stock.filter(s=>s.statut==="en_vente").length} article(s) en vente`,grad:"linear-gradient(135deg,#059669,#10B981)",shadow:"rgba(5,150,105,0.4)"},
    {id:"reponses",icon:"💬",label:"Réponses acheteurs",sub:"Messages générés par IA",grad:"linear-gradient(135deg,#0EA5E9,#2563EB)",shadow:"rgba(14,165,233,0.4)"},
    {id:"reopt",icon:"🔄",label:"Ré-optimiseur",sub:"Relance une annonce qui stagne",grad:"linear-gradient(135deg,#F59E0B,#FF6B2B)",shadow:"rgba(245,158,11,0.4)"},
    {id:"ventes",icon:"📊",label:"Suivi des ventes",sub:`CA: ${ventes.reduce((s,v)=>s+(parseFloat(v.prix_vente)||0),0).toFixed(0)}€`,grad:"linear-gradient(135deg,#10B981,#059669)",shadow:"rgba(16,185,129,0.4)"},
    {id:"historique",icon:"🕓",label:"Historique",sub:`${history.length} annonce(s) générée(s)`,grad:"linear-gradient(135deg,#6366F1,#7C3AED)",shadow:"rgba(99,102,241,0.4)"},
    {id:"extension",icon:"🧩",label:"Extension Chrome",sub:"Installe & configure l'extension",grad:"linear-gradient(135deg,#FF6B2B,#7C3AED)",shadow:"rgba(124,58,237,0.4)"},
    {id:"publications",icon:"📤",label:"Publications",sub:`${history.length} annonce(s) prêtes`,grad:"linear-gradient(135deg,#0EA5E9,#7C3AED)",shadow:"rgba(14,165,233,0.4)"},
  ];

  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",minHeight:"100vh",background:dark?"#0a0a0f":homeView?"#f0f0ff":"#f5f5f7"}}>
      {showTuto&&<TutoOverlay dark={dark} onDone={()=>setShowTuto(false)}/>}

      {/* TOP NAV */}
      <nav style={{background:homeView?( dark?"rgba(10,10,15,0.8)":"rgba(240,240,255,0.8)"):T.card(dark),borderBottom:homeView?"none":`1px solid ${T.border(dark)}`,padding:"0 16px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {!homeView&&<button onClick={()=>setHomeView(true)} style={{width:32,height:32,borderRadius:10,border:`1px solid ${T.border(dark)}`,background:"transparent",color:T.text2(dark),fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>}
          <div style={{width:34,height:34,borderRadius:10,background:GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 12px rgba(124,58,237,0.4)"}}>⚡</div>
          <span style={{fontWeight:900,fontSize:16,letterSpacing:"-0.3px"}}>
            <span style={{background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ListAI</span>
            <span style={{background:GRAD_O,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}> Pro</span>
          </span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {!homeView&&<span style={{fontSize:10,color:T.text2(dark),maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session.user.email}</span>}
          <button onClick={()=>setShowTuto(true)} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${T.border(dark)}`,background:"transparent",color:T.text2(dark),fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>❓</button>
          <button onClick={handleToggleDark} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${T.border(dark)}`,background:"transparent",color:T.text2(dark),fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{dark?"☀️":"🌙"}</button>
          {homeView&&<button onClick={signOut} style={{padding:"5px 10px",borderRadius:20,border:"1px solid rgba(255,59,48,0.3)",background:"transparent",color:"#ff3b30",fontSize:11,fontWeight:700,cursor:"pointer"}}>Déco.</button>}
        </div>
      </nav>

      {/* HOME DASHBOARD */}
      {homeView&&<div style={{maxWidth:640,margin:"0 auto",padding:"20px 14px 40px"}}>
        {/* Hero */}
        <div style={{background:GRAD,borderRadius:24,padding:"24px 20px",marginBottom:20,position:"relative",overflow:"hidden",boxShadow:"0 12px 40px rgba(124,58,237,0.4)"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
          <div style={{position:"absolute",bottom:-40,right:20,width:80,height:80,borderRadius:"50%",background:"rgba(255,107,43,0.3)"}}/>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Bonjour 👋</div>
          <div style={{fontSize:22,fontWeight:900,color:"white",marginBottom:4,letterSpacing:"-0.3px"}}>{session.user.email.split("@")[0]}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",marginBottom:16}}>{history.length} annonce(s) · {stock.filter(s=>s.statut==="en_vente").length} en vente · {ventes.length} vente(s)</div>
          <button onClick={()=>openTab("annonce")} style={{padding:"10px 20px",borderRadius:12,border:"none",background:GRAD_O,color:"white",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px rgba(255,107,43,0.5)"}}>⚡ Nouvelle annonce</button>
        </div>

        {/* Grid cartes */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {HOME_CARDS.map(c=>(
            <div key={c.id} onClick={()=>openTab(c.id)} style={{background:c.grad,borderRadius:20,padding:"18px 16px",cursor:"pointer",boxShadow:`0 8px 24px ${c.shadow}`,transition:"transform .15s, box-shadow .15s",position:"relative",overflow:"hidden",minHeight:100}}>
              <div style={{position:"absolute",top:-15,right:-15,width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,0.1)"}}/>
              <div style={{fontSize:26,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:13,fontWeight:800,color:"white",marginBottom:3,lineHeight:1.3}}>{c.label}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.75)",fontWeight:500}}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>}

      {/* CONTENU ONGLET */}
      {!homeView&&<div style={{maxWidth:640,margin:"0 auto",padding:"20px 14px 40px"}}>
        {COMPONENTS[tab]||COMPONENTS.annonce}
      </div>}

      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}
