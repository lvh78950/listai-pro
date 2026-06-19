import { useState, useRef, useEffect } from "react";

const SUPA_URL = "https://csdbtnfachdxafczqnal.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZGJ0bmZhY2hkeGFmY3pxbmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDA0MDQsImV4cCI6MjA5NzM3NjQwNH0.qa7YXHxjnCji0MXHvb5_geSiqAd1MlBc9B2RhUd4wpE";

const supa = {
  async select(table, filters, tok) {
    const q = filters ? "?" + Object.entries(filters).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&") + "&order=created_at.desc&limit=100" : "?order=created_at.desc&limit=100";
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}${q}`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tok||SUPA_KEY}`, "Content-Type": "application/json" } });
    return res.json();
  },
  async insert(table, data, tok) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, { method:"POST", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tok||SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(data) });
    const d = await res.json(); return Array.isArray(d) ? d[0] : d;
  },
  async update(table, id, data, tok) {
    await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, { method:"PATCH", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tok||SUPA_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  },
  async delete(table, id, tok) {
    await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, { method:"DELETE", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tok||SUPA_KEY}`, "Content-Type": "application/json" } });
  },
  async deleteWhere(table, field, value, tok) {
    await fetch(`${SUPA_URL}/rest/v1/${table}?${field}=eq.${encodeURIComponent(value)}`, { method:"DELETE", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tok||SUPA_KEY}`, "Content-Type": "application/json" } });
  },
  async upsert(table, data, conflict, tok) {
    await fetch(`${SUPA_URL}/rest/v1/${table}?on_conflict=${conflict}`, { method:"POST", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tok||SUPA_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(data) });
  },
  async signUp(email, password) {
    const res = await fetch(`${SUPA_URL}/auth/v1/signup`, { method:"POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    return res.json();
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, { method:"POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    return res.json();
  },
  async resetPassword(email) {
    await fetch(`${SUPA_URL}/auth/v1/recover`, { method:"POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  },
  async refreshToken(refresh_token) {
    const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, { method:"POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token }) });
    return res.json();
  }
};

const db = {
  async getListings(uid,tok){ const d=await supa.select("listings",{user_id:uid},tok); return Array.isArray(d)?d:[]; },
  async addListing(uid,e,tok){ return supa.insert("listings",{user_id:uid,date:e.date,result:e.result},tok); },
  async delListing(uid,id,tok){ return supa.delete("listings",id,tok); },
  async clearListings(uid,tok){ return supa.deleteWhere("listings","user_id",uid,tok); },
  async getStock(uid,tok){ const d=await supa.select("stock",{user_id:uid},tok); return Array.isArray(d)?d:[]; },
  async addStock(uid,a,tok){ return supa.insert("stock",{user_id:uid,titre:a.titre,marque:a.marque||"",taille:a.taille||"",prix:a.prix||"",plateforme:a.plateforme||"Vinted",etat:a.etat||"",notes:a.notes||"",statut:a.statut||"en_vente",date_ajout:a.dateAjout||""},tok); },
  async updStock(uid,id,fields,tok){ return supa.update("stock",id,{...fields,updated_at:new Date().toISOString()},tok); },
  async delStock(uid,id,tok){ return supa.delete("stock",id,tok); },
  async getVentes(uid,tok){ const d=await supa.select("ventes",{user_id:uid},tok); return Array.isArray(d)?d:[]; },
  async addVente(uid,v,tok){ return supa.insert("ventes",{user_id:uid,article:v.article,prix_vente:v.prix_vente||"",prix_achat:v.prix_achat||"",plateforme:v.plateforme||"Vinted",date:v.date||""},tok); },
  async delVente(uid,id,tok){ return supa.delete("ventes",id,tok); },
  async getPrefs(uid,tok){ const d=await supa.select("preferences",{user_id:uid},tok); return Array.isArray(d)&&d.length>0?d[0]:null; },
  async savePrefs(uid,p,tok){ return supa.upsert("preferences",{user_id:uid,...p,updated_at:new Date().toISOString()},"user_id",tok); },
  async migrate(uid,tok){
    try{
      let count=0;
      const lsL=JSON.parse(localStorage.getItem("vh2")||"[]");
      const lsS=JSON.parse(localStorage.getItem("listai_stock")||"[]");
      const lsV=JSON.parse(localStorage.getItem("listai_ventes")||"[]");
      for(const e of lsL.slice(0,50)){ await supa.insert("listings",{user_id:uid,date:e.date,result:e.result},tok); count++; }
      for(const s of lsS){ await supa.insert("stock",{user_id:uid,titre:s.titre,marque:s.marque||"",taille:s.taille||"",prix:s.prix||"",plateforme:s.plateforme||"Vinted",etat:s.etat||"",notes:s.notes||"",statut:s.statut||"en_vente",date_ajout:s.dateAjout||""},tok); count++; }
      for(const v of lsV){ await supa.insert("ventes",{user_id:uid,article:v.article,prix_vente:v.prix_vente||"",prix_achat:v.prix_achat||"",plateforme:v.plateforme||"Vinted",date:v.date||""},tok); count++; }
      if(lsL.length) localStorage.removeItem("vh2");
      if(lsS.length) localStorage.removeItem("listai_stock");
      if(lsV.length) localStorage.removeItem("listai_ventes");
      return count;
    }catch{ return 0; }
  }
};

function loadSession(){ try{ return JSON.parse(localStorage.getItem("listai_session")||"null"); }catch{ return null; } }
function saveSession(s){ try{ localStorage.setItem("listai_session",JSON.stringify(s)); }catch{} }
function clearSession(){ try{ localStorage.removeItem("listai_session"); }catch{} }

const APP = { c1:"#1a1a2e", c2:"#C9A96E" };
const SHIP = [{l:"Lettre suivie",p:2.99},{l:"Colissimo S",p:3.99},{l:"Colissimo M",p:4.99},{l:"Mondial Relay S",p:3.49},{l:"Mondial Relay M",p:4.99},{l:"Colissimo L",p:6.99},{l:"Colissimo XL",p:8.99}];
const ETAT = ["Neuf avec étiquette","Neuf sans étiquette","Très bon état","Bon état","Satisfaisant"];
const ETAT_C = ["#22c55e","#84cc16","#3b82f6","#f59e0b","#ef4444"];
const PLATFORMS = ["Vinted","Leboncoin","eBay","Depop","Vestiaire"];
const TABS = ["✦ Annonce","📈 Tendances","💰 Marge","🤖 Agent","📦 Stock","💬 Réponses","🔄 Ré-opt.","📊 Ventes","🕓 Historique"];

async function callClaude(prompt,images=[],useSearch=false){
  const content=[...images.map(i=>({type:"image",source:{type:"base64",media_type:i.type,data:i.base64}})),{type:"text",text:prompt}];
  const body={model:"claude-sonnet-4-6",max_tokens:1200,messages:[{role:"user",content}]};
  if(useSearch) body.tools=[{type:"web_search_20250305",name:"web_search"}];
  const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  const text=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  const match=text.match(/\{[\s\S]*\}/); return match?match[0]:text;
}
function pj(t){ try{ return JSON.parse(t.replace(/```json|```/g,"").trim()); }catch{ return null; } }

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────
function Toast({msg,onDone}){ useEffect(()=>{const t=setTimeout(onDone,2400);return()=>clearTimeout(t);},[]);return <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:APP.c1,color:"white",padding:"12px 28px",borderRadius:50,fontSize:14,fontWeight:600,zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",whiteSpace:"nowrap",border:`1px solid ${APP.c2}`}}>✦ {msg}</div>; }

function Btn({onClick,disabled,children,outline,small,full,danger}){
  const bg=disabled?"#2a2a3e":danger?"transparent":outline?"transparent":`linear-gradient(135deg,${APP.c2},#e8c584)`;
  const col=disabled?"#555":danger?"#ef4444":outline?APP.c2:"#1a1a2e";
  const border=outline?`1.5px solid ${APP.c2}`:danger?"1.5px solid #ef4444":"none";
  return <button onClick={onClick} disabled={disabled} style={{padding:small?"8px 16px":"13px 22px",borderRadius:small?8:12,border,background:bg,color:col,fontSize:small?12:14,fontWeight:800,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,width:full?"100%":"auto",transition:"all 0.2s"}}>{children}</button>;
}

function Card({children,dark,style={}}){ return <div style={{background:dark?"#16213e":"white",borderRadius:16,border:dark?"1px solid #2a2a4e":"1.5px solid #f0f0f0",padding:18,...style}}>{children}</div>; }

function FieldRow({label,value,dark}){ return(<div style={{background:dark?"#1a1a2e":"#f9fafb",borderRadius:10,padding:"9px 12px"}}><div style={{fontSize:9,fontWeight:700,color:dark?"#555":"#9ca3af",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>{label}</div><div style={{fontSize:13,fontWeight:600,color:dark?"#e5e7eb":"#111"}}>{value}</div></div>); }

function BigField({icon,label,value,dark}){
  const [c,setC]=useState(false);
  return(<div style={{background:dark?"#16213e":"white",borderRadius:14,border:dark?"1px solid #2a2a4e":"1.5px solid #f0f0f0",padding:"14px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}><span>{icon}</span><span style={{fontSize:10,fontWeight:700,color:dark?"#666":"#9ca3af",textTransform:"uppercase",letterSpacing:"0.8px"}}>{label}</span></div>
      <button onClick={()=>{navigator.clipboard.writeText(value);setC(true);setTimeout(()=>setC(false),2000);}} style={{padding:"4px 12px",borderRadius:8,border:`1px solid ${dark?"#333":"#e5e7eb"}`,background:dark?"#2a2a3e":"white",color:APP.c2,fontSize:11,fontWeight:700,cursor:"pointer"}}>{c?"✓":"Copier"}</button>
    </div>
    <p style={{margin:0,fontSize:13,color:dark?"#e5e7eb":"#111",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{value}</p>
  </div>);
}

function SectionTitle({children,sub,dark}){ return(<div style={{marginBottom:18}}><h2 style={{fontSize:21,fontWeight:900,color:dark?"#e5e7eb":"#111",margin:"0 0 3px"}}>{children}</h2>{sub&&<p style={{color:dark?"#666":"#6b7280",fontSize:13,margin:0}}>{sub}</p>}</div>); }
function Inp({value,onChange,placeholder,dark,type="text",onKeyDown}){ return <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,borderRadius:10,fontSize:14,background:dark?"#1a1a2e":"white",color:dark?"#e5e7eb":"#111",outline:"none",boxSizing:"border-box"}}/>; }
function Txta({value,onChange,placeholder,dark,rows=4}){ return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,borderRadius:10,fontSize:14,background:dark?"#1a1a2e":"white",color:dark?"#e5e7eb":"#111",outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}/>; }
function Lbl({children,dark,sub}){ return <div style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:dark?"#666":"#6b7280"}}>{children}</div>{sub&&<div style={{fontSize:11,color:dark?"#444":"#9ca3af",marginTop:2}}>{sub}</div>}</div>; }
function Spin(){ return <p style={{textAlign:"center",color:APP.c2,fontWeight:600,margin:0,padding:"8px 0"}}>⟳ Analyse en cours...</p>; }
function Empty({emoji,title,sub}){ return(<div style={{textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:44,marginBottom:14}}>{emoji}</div><p style={{fontSize:15,fontWeight:700,color:"#374151",margin:"0 0 4px"}}>{title}</p><p style={{fontSize:13,color:"#9ca3af",margin:0}}>{sub}</p></div>); }
function Toggle({checked,onChange}){ return(<label style={{position:"relative",width:44,height:24,display:"inline-block",flexShrink:0}}><input type="checkbox" checked={checked} onChange={onChange} style={{opacity:0,width:0,height:0}}/><span style={{position:"absolute",inset:0,background:checked?`linear-gradient(135deg,${APP.c2},#e8c584)`:"#2a2a4e",borderRadius:24,cursor:"pointer",transition:".3s"}}><span style={{position:"absolute",height:18,width:18,left:checked?23:3,bottom:3,background:checked?"#1a1a2e":"#555",borderRadius:"50%",transition:".3s"}}/></span></label>); }
function PhotoTips({dark}){ const tips=["Fond blanc ou neutre uni","Lumière naturelle sans flash","4 angles minimum","Montrer les défauts honnêtement","Photo portée = +40% de vues"]; return(<Card dark={dark} style={{marginTop:12,borderLeft:`3px solid ${APP.c2}`}}><p style={{margin:"0 0 10px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase",letterSpacing:"0.6px"}}>📷 Conseils photos</p>{tips.map((t,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:i<tips.length-1?7:0}}><span style={{color:APP.c2,fontSize:11,marginTop:2}}>✦</span><span style={{fontSize:12,color:dark?"#aaa":"#555",lineHeight:1.5}}>{t}</span></div>)}</Card>); }

// ══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function AuthScreen({onAuth,dark}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState("");

  const handle=async()=>{
    if(mode!=="forgot"&&(!email||!password)){setError("Remplis tous les champs.");return;}
    if(mode!=="forgot"&&password.length<6){setError("Mot de passe min. 6 caractères.");return;}
    setLoading(true);setError("");setSuccess("");
    try{
      if(mode==="login"){
        const data=await supa.signIn(email,password);
        if(data.error||!data.access_token) throw new Error(data.error?.message||data.msg||"Email ou mot de passe incorrect");
        const session={access_token:data.access_token,refresh_token:data.refresh_token,user:data.user};
        saveSession(session); onAuth(session);
      } else if(mode==="register"){
        const data=await supa.signUp(email,password);
        if(data.error) throw new Error(data.error?.message||"Erreur lors de l'inscription");
        if(data.access_token){ const session={access_token:data.access_token,refresh_token:data.refresh_token,user:data.user}; saveSession(session); onAuth(session); }
        else{ setSuccess("Compte créé ! Vérifie ton email puis connecte-toi."); setMode("login"); }
      } else {
        await supa.resetPassword(email); setSuccess("Email envoyé ! Vérifie ta boîte mail.");
      }
    }catch(e){ setError(e.message||"Une erreur est survenue."); }
    finally{ setLoading(false); }
  };

  return(
    <div style={{minHeight:"100vh",background:dark?"#0f0f1a":"#f4f4f6",display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:64,height:64,borderRadius:18,background:`linear-gradient(135deg,${APP.c2},#e8c584)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,color:"#1a1a2e",fontWeight:900,margin:"0 auto 14px"}}>✦</div>
          <h1 style={{fontSize:28,fontWeight:900,color:dark?"#e5e7eb":"#111",margin:"0 0 4px"}}>ListAI <span style={{color:APP.c2}}>Pro</span></h1>
          <p style={{fontSize:13,color:dark?"#555":"#9ca3af",margin:0}}>Transforme tes photos en annonces parfaites</p>
        </div>
        <div style={{background:dark?"#16213e":"white",borderRadius:20,border:dark?"1px solid #2a2a4e":"1.5px solid #f0f0f0",padding:28,boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
          {mode!=="forgot"&&(<div style={{display:"flex",background:dark?"#1a1a2e":"#f9fafb",borderRadius:12,padding:4,marginBottom:24,gap:4}}>
            {[["login","Connexion"],["register","Inscription"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setMode(k);setError("");setSuccess("");}} style={{flex:1,padding:"9px",borderRadius:9,border:"none",background:mode===k?`linear-gradient(135deg,${APP.c2},#e8c584)`:"transparent",color:mode===k?"#1a1a2e":dark?"#555":"#9ca3af",fontSize:13,fontWeight:800,cursor:"pointer"}}>{l}</button>
            ))}
          </div>)}
          {mode==="forgot"&&<h3 style={{fontSize:16,fontWeight:800,color:dark?"#e5e7eb":"#111",margin:"0 0 18px"}}>🔑 Mot de passe oublié</h3>}
          <div style={{marginBottom:14}}><Lbl dark={dark}>Email</Lbl><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.com" dark={dark} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
          {mode!=="forgot"&&<div style={{marginBottom:20}}><Lbl dark={dark}>Mot de passe</Lbl><Inp type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" dark={dark} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>}
          {error&&<div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#dc2626",fontSize:13}}>❌ {error}</div>}
          {success&&<div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#15803d",fontSize:13}}>✅ {success}</div>}
          <button onClick={handle} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?"#2a2a3e":`linear-gradient(135deg,${APP.c2},#e8c584)`,color:loading?"#555":"#1a1a2e",fontSize:15,fontWeight:800,cursor:loading?"not-allowed":"pointer",marginBottom:14}}>
            {loading?"⟳ Chargement...":{login:"🚀 Se connecter",register:"✨ Créer mon compte",forgot:"📧 Envoyer le lien"}[mode]}
          </button>
          {mode==="login"&&<button onClick={()=>{setMode("forgot");setError("");setSuccess("");}} style={{width:"100%",background:"transparent",border:"none",color:dark?"#555":"#9ca3af",fontSize:12,cursor:"pointer",padding:"4px"}}>Mot de passe oublié ?</button>}
          {mode==="forgot"&&<button onClick={()=>{setMode("login");setError("");setSuccess("");}} style={{width:"100%",background:"transparent",border:"none",color:dark?"#555":"#9ca3af",fontSize:12,cursor:"pointer",padding:"4px"}}>← Retour à la connexion</button>}
        </div>
        <p style={{textAlign:"center",fontSize:11,color:dark?"#333":"#ccc",marginTop:16}}>☁️ Données synchronisées sur tous tes appareils</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB ANNONCE
// ══════════════════════════════════════════════════════════════════════════════
function TabAnnonce({dark,session,history,setHistory,resultToShow,setResultToShow}){
  const [step,setStep]=useState(resultToShow?3:1);
  const [images,setImages]=useState([]); const [prix,setPrix]=useState(""); const [etat,setEtat]=useState(0); const [infos,setInfos]=useState("");
  const [loading,setLoading]=useState(false); const [result,setResult]=useState(resultToShow?.result||null);
  const [error,setError]=useState(null); const [dragOver,setDragOver]=useState(false); const [toast,setToast]=useState(false);
  const fileRef=useRef();

  useEffect(()=>{if(resultToShow){setResult(resultToShow.result);setStep(3);setResultToShow(null);}},[resultToShow]);

  const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
  const addFiles=async(files)=>{const arr=Array.from(files).slice(0,10-images.length);const p=await Promise.all(arr.map(async f=>({base64:await toB64(f),type:f.type,url:URL.createObjectURL(f)})));setImages(prev=>[...prev,...p].slice(0,10));};

  const generate=async()=>{
    setLoading(true);setError(null);
    const etatStr=ETAT[etat];
    const prompt=`Expert Vinted 5 ans. Analyse ${images.length} photo(s). Prix: ${prix?prix+"€":"à estimer"}, état: ${etatStr}${infos?", notes: "+infos:""}. Réponds UNIQUEMENT JSON valide sans texte avant ni après: {"titre":"max 60 chars accrocheur","categorie":"catégorie Vinted","sous_categorie":"sous-catégorie","marque":"marque ou Sans marque","taille":"taille","couleur":"couleur","matiere":"matière","etat":"${etatStr}","prix_recommande":"chiffre seul","prix_mini":"chiffre seul","description":"6-8 lignes vendeuses naturelles","hashtags":"15 #hashtags","conseil":"1 conseil utile"}`;
    try{
      const text=await callClaude(prompt,images);
      const parsed=pj(text);if(!parsed)throw new Error("parse");
      setResult(parsed);
      const entry={date:new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}),result:parsed};
      const saved=await db.addListing(session.user.id,entry,session.access_token);
      setHistory(prev=>[{...entry,id:saved?.id||Date.now().toString()},...prev].slice(0,50));
      setStep(3);
    }catch{setError("Analyse échouée. Vérifie que tes photos sont nettes.");}
    finally{setLoading(false);}
  };

  const reset=()=>{setImages([]);setPrix("");setInfos("");setResult(null);setError(null);setEtat(0);setStep(1);};
  const fullText=result?`${result.titre}\n\n${result.description}\n\n${result.hashtags}`:"";

  return(<div>
    {step<3&&(<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:22}}>
      {["Photos","Infos","Résultat"].map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,background:step>i+1?APP.c2:step===i+1?APP.c2:dark?"#1a1a2e":"#e5e7eb",color:step>=i+1?"#1a1a2e":dark?"#444":"#9ca3af"}}>{step>i+1?"✓":i+1}</div>
        <span style={{fontSize:12,color:step===i+1?APP.c2:dark?"#444":"#9ca3af",fontWeight:step===i+1?700:400}}>{s}</span>
        {i<2&&<div style={{width:24,height:2,borderRadius:2,background:step>i+1?APP.c2:dark?"#1a1a2e":"#e5e7eb"}}/>}
      </div>))}
    </div>)}

    {step===1&&(<div>
      <SectionTitle dark={dark}>Ajoute tes photos</SectionTitle>
      <div onClick={()=>images.length<10&&fileRef.current.click()} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files);}}
        style={{border:`2px dashed ${dragOver?APP.c2:dark?"#2a2a4e":"#d1d5db"}`,borderRadius:20,padding:"40px 20px",textAlign:"center",cursor:images.length<10?"pointer":"default",background:dragOver?`${APP.c2}10`:dark?"#0d0d1a":"white",transition:"all 0.2s",marginBottom:14}}>
        <div style={{fontSize:38,marginBottom:8}}>🖼️</div>
        <p style={{margin:"0 0 4px",fontWeight:700,color:dark?"#e5e7eb":"#374151",fontSize:15}}>{images.length===0?"Glisse tes photos ici":`${images.length}/10 photo(s)`}</p>
        <p style={{margin:0,fontSize:12,color:dark?"#444":"#9ca3af"}}>{images.length<10?"ou clique pour sélectionner":"Maximum atteint"}</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>addFiles(e.target.files)}/>
      </div>
      {images.length>0&&(<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
        {images.map((img,i)=>(<div key={i} style={{position:"relative",aspectRatio:"1",borderRadius:10,overflow:"hidden",border:`2px solid ${dark?"#2a2a4e":"#e5e7eb"}`}}>
          <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          {i===0&&<div style={{position:"absolute",bottom:3,left:3,background:APP.c2,color:"#1a1a2e",fontSize:7,fontWeight:900,padding:"2px 5px",borderRadius:3}}>COVER</div>}
          <button onClick={()=>setImages(p=>p.filter((_,j)=>j!==i))} style={{position:"absolute",top:3,right:3,width:20,height:20,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.7)",color:"white",fontSize:13,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>))}
        {images.length<10&&<div onClick={()=>fileRef.current.click()} style={{aspectRatio:"1",borderRadius:10,border:`2px dashed ${dark?"#2a2a4e":"#d1d5db"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:dark?"#0d0d1a":"#fafafa",fontSize:22,color:APP.c2}}>+</div>}
      </div>)}
      <PhotoTips dark={dark}/>
      <div style={{marginTop:14}}><Btn onClick={()=>setStep(2)} disabled={images.length===0}>Continuer {images.length>0&&`(${images.length})`} →</Btn></div>
    </div>)}

    {step===2&&(<div>
      <SectionTitle dark={dark}>Quelques infos</SectionTitle>
      <Card dark={dark} style={{marginBottom:12}}>
        <Lbl dark={dark}>État de l'article</Lbl>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {ETAT.map((o,i)=>(<div key={o} onClick={()=>setEtat(i)} style={{padding:"11px 14px",borderRadius:11,cursor:"pointer",border:`2px solid ${etat===i?ETAT_C[i]:dark?"#2a2a4e":"#e5e7eb"}`,background:etat===i?`${ETAT_C[i]}15`:dark?"#0d0d1a":"white",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${etat===i?ETAT_C[i]:dark?"#333":"#d1d5db"}`,background:etat===i?ETAT_C[i]:"transparent",flexShrink:0}}/>
            <span style={{fontSize:13,fontWeight:etat===i?700:400,color:etat===i?ETAT_C[i]:dark?"#aaa":"#374151"}}>{o}</span>
          </div>))}
        </div>
      </Card>
      <Card dark={dark} style={{marginBottom:12}}>
        <Lbl dark={dark}>Prix souhaité (optionnel)</Lbl>
        <div style={{display:"flex",border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,borderRadius:10,overflow:"hidden"}}>
          <input type="number" value={prix} onChange={e=>setPrix(e.target.value)} placeholder="Ex: 25" style={{flex:1,padding:"11px 14px",border:"none",fontSize:15,fontWeight:600,background:"transparent",color:dark?"#e5e7eb":"#111",outline:"none"}}/>
          <div style={{padding:"11px 14px",background:dark?"#1a1a2e":"#f9fafb",fontSize:14,fontWeight:800,color:APP.c2,borderLeft:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`}}>€</div>
        </div>
      </Card>
      <Card dark={dark} style={{marginBottom:18}}><Lbl dark={dark}>Notes (optionnel)</Lbl><Txta value={infos} onChange={e=>setInfos(e.target.value)} placeholder="Ex: taille M mais fait plutôt S..." dark={dark} rows={3}/></Card>
      {error&&<div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:10,padding:12,marginBottom:14,color:"#dc2626",fontSize:13}}>✕ {error}</div>}
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(1)} style={{padding:"13px 18px",borderRadius:12,border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,background:"transparent",color:dark?"#aaa":"#374151",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Retour</button>
        <Btn onClick={generate} disabled={loading}>{loading?"Génération...":"✦ Générer l'annonce"}</Btn>
      </div>
      {loading&&<Card dark={dark} style={{marginTop:14}}>
        {["🔍 Analyse des photos...","🏷️ Détection marque & taille...","✍️ Rédaction...","#️⃣ Hashtags...","☁️ Sauvegarde cloud..."].map((tx,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<4?9:0}}><div style={{width:5,height:5,borderRadius:"50%",background:APP.c2}}/><span style={{fontSize:12,color:dark?"#666":"#6b7280"}}>{tx}</span></div>
        ))}
      </Card>}
    </div>)}

    {step===3&&result&&(<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <SectionTitle dark={dark} sub="Copie et colle sur Vinted en 30 sec">Annonce prête !</SectionTitle>
        <Btn onClick={reset} small outline>Recommencer</Btn>
      </div>
      <div style={{background:`linear-gradient(135deg,${APP.c1},#16213e)`,border:`1px solid ${APP.c2}44`,borderRadius:18,padding:"20px 22px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-around",textAlign:"center"}}>
          {[["Prix recommandé",result.prix_recommande+"€"],["Prix minimum",result.prix_mini+"€"],["Taille",result.taille]].map(([l,v],i)=>(
            <div key={i} style={{flex:1}}><div style={{fontSize:26,fontWeight:900,color:APP.c2}}>{v}</div><div style={{fontSize:10,color:"#666",marginTop:3}}>{l}</div></div>
          ))}
        </div>
      </div>
      <Card dark={dark} style={{marginBottom:12}}>
        <p style={{margin:"0 0 10px",fontSize:10,fontWeight:700,color:dark?"#444":"#9ca3af",textTransform:"uppercase",letterSpacing:"0.8px"}}>📋 Champs Vinted</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["categorie","Catégorie"],["sous_categorie","Sous-cat."],["marque","Marque"],["couleur","Couleur"],["matiere","Matière"],["etat","État"]].map(([k,l])=><FieldRow key={k} label={l} value={result[k]} dark={dark}/>)}
        </div>
      </Card>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
        <BigField icon="✏️" label="Titre" value={result.titre} dark={dark}/>
        <BigField icon="📝" label="Description" value={result.description} dark={dark}/>
        <BigField icon="#️⃣" label="Hashtags" value={result.hashtags} dark={dark}/>
      </div>
      {result.conseil&&<Card dark={dark} style={{borderLeft:`3px solid ${APP.c2}`,marginBottom:14}}><p style={{margin:0,fontSize:13,color:dark?"#aaa":"#555",lineHeight:1.7}}>💡 <strong style={{color:APP.c2}}>Conseil :</strong> {result.conseil}</p></Card>}
      <Btn onClick={()=>{navigator.clipboard.writeText(fullText);setToast(true);setTimeout(()=>setToast(false),2200);}} full>📋 Tout copier — Titre + Description + Hashtags</Btn>
      {toast&&<Toast msg="Copié ! 🚀" onDone={()=>setToast(false)}/>}
    </div>)}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB TENDANCES
// ══════════════════════════════════════════════════════════════════════════════
function TabTendances({dark}){
  const [query,setQuery]=useState(""); const [loading,setLoading]=useState(false); const [result,setResult]=useState(null); const [error,setError]=useState(null); const [subTab,setSubTab]=useState("tendance");
  const [scoreA,setScoreA]=useState({titre:"",desc:"",prix:"",loading:false,result:null});
  const [concuQ,setConcuQ]=useState(""); const [concuL,setConcuL]=useState(false); const [concuR,setConcuR]=useState(null);
  const SUGG=["Veste en cuir","Nike Air Force","Sac Longchamp","Pull Ralph Lauren","Jean Levi's","Tee Bape","Jordan 1","Blazer oversize"];
  const CAL=[{jour:"Lundi",score:6,heure:"18h-20h"},{jour:"Mardi",score:7,heure:"19h-21h"},{jour:"Mercredi",score:8,heure:"17h-20h"},{jour:"Jeudi",score:9,heure:"19h-22h"},{jour:"Vendredi",score:10,heure:"18h-22h"},{jour:"Samedi",score:8,heure:"10h-12h"},{jour:"Dimanche",score:7,heure:"20h-22h"}];
  const sC=s=>s>=9?"#22c55e":s>=7?"#f59e0b":"#6b7280";

  const analyse=async(q)=>{
    const s=q||query;if(!s.trim())return;setLoading(true);setResult(null);setError(null);
    const p=`Expert revendeur Vinted 5 ans. Analyse "${s}". UNIQUEMENT JSON valide: {"score_tendance":"8/10","momentum":"En hausse","fourchette_prix":"20-45€","prix_ideal":"32€","disponibilite_stock":"Assez disponible","vitesse_vente":"3-5 jours","marge_nego":"Bonne marge","marques_top":["Nike","Adidas","Puma"],"mots_cles":["vintage","retro","90s","streetwear","rare"],"conseil":"Conseil en 1 phrase","potentiel_revente":"Élevé","temps_vente_moyen":"5-7 jours","public_cible":"Hommes 18-30 ans streetwear","etat_optimal":"Très bon état","astuce_photo":"Conseil photo spécifique"}`;
    try{const t=await callClaude(p,[],true);const r=pj(t);if(!r)throw new Error();setResult(r);}catch{setError("Analyse échouée. Réessaie.");}finally{setLoading(false);}
  };

  const analyseScore=async()=>{
    if(!scoreA.desc.trim())return;setScoreA(p=>({...p,loading:true,result:null}));
    const p=`Expert Vinted. Note cette annonce. Titre: "${scoreA.titre}", Desc: "${scoreA.desc}", Prix: ${scoreA.prix||"?"}€. UNIQUEMENT JSON: {"score_global":"7/10","scores":{"titre":"6/10","description":"8/10","prix":"7/10","hashtags":"5/10"},"points_forts":["point 1","point 2"],"points_faibles":["problème 1","problème 2"],"titre_ameliore":"Nouveau titre","conseil_prix":"Conseil prix","hashtags_manquants":["#tag1","#tag2","#tag3"]}`;
    try{const t=await callClaude(p);const r=pj(t);if(r)setScoreA(p=>({...p,loading:false,result:r}));}catch{setScoreA(p=>({...p,loading:false}));}
  };

  const analyseConcurrence=async()=>{
    if(!concuQ.trim())return;setConcuL(true);setConcuR(null);
    const p=`Expert Vinted. Analyse concurrence pour "${concuQ}". UNIQUEMENT JSON: {"nb_annonces_estim":"150-200","prix_moyen":"28€","prix_min":"8€","prix_max":"65€","etat_dominant":"Très bon état","points_differenciants":["avantage 1","avantage 2","avantage 3"],"conseil_positionnement":"Comment se démarquer","meilleur_moment":"Jeudi-vendredi 19h-21h"}`;
    try{const t=await callClaude(p,[],true);const r=pj(t);if(r)setConcuR(r);}catch{}finally{setConcuL(false);}
  };

  return(<div>
    <SectionTitle dark={dark} sub="Analyse, concurrence & calendrier">📈 Tendances & Marché</SectionTitle>
    <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
      {[["tendance","🔥 Tendances"],["score","⭐ Score"],["concurrence","🔍 Concurrence"],["calendrier","📅 Calendrier"]].map(([k,l])=>(
        <button key={k} onClick={()=>setSubTab(k)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${subTab===k?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:subTab===k?`${APP.c2}20`:"transparent",color:subTab===k?APP.c2:dark?"#666":"#9ca3af",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
      ))}
    </div>

    {subTab==="tendance"&&(<div>
      <Card dark={dark} style={{marginBottom:14}}>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <Inp value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyse()} placeholder="Ex: Veste Levi's, Jordan 1..." dark={dark}/>
          <Btn onClick={()=>analyse()} disabled={loading||!query.trim()} small>{loading?"...":"✦ Go"}</Btn>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{SUGG.map(s=><button key={s} onClick={()=>{setQuery(s);analyse(s);}} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${APP.c2}33`,background:dark?"#16213e":"#fdf9f3",color:APP.c2,fontSize:11,fontWeight:600,cursor:"pointer"}}>{s}</button>)}</div>
      </Card>
      {error&&<Card dark={dark} style={{borderLeft:"3px solid #ef4444",marginBottom:12}}><p style={{margin:0,color:"#ef4444",fontSize:13}}>❌ {error}</p></Card>}
      {loading&&<Card dark={dark}><Spin/></Card>}
      {result&&!loading&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[["Score",<span style={{fontSize:26,fontWeight:900,color:parseFloat(result.score_tendance)>=8?"#22c55e":parseFloat(result.score_tendance)>=6?"#f59e0b":"#ef4444"}}>{result.score_tendance}</span>],
            ["Momentum",<span style={{fontSize:14,fontWeight:800,color:dark?"#e5e7eb":"#111"}}>{result.momentum?.includes("hausse")?"📈":result.momentum?.includes("Stable")?"➡️":"📉"} {result.momentum}</span>],
            ["Potentiel",<span style={{fontSize:13,fontWeight:800,color:APP.c2}}>{result.potentiel_revente}</span>]
          ].map(([l,v],i)=>(<Card key={i} dark={dark} style={{textAlign:"center",padding:"14px 10px"}}><div style={{fontSize:9,fontWeight:700,color:dark?"#555":"#9ca3af",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>{l}</div>{v}</Card>))}
        </div>
        <Card dark={dark}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <FieldRow label="Fourchette" value={result.fourchette_prix} dark={dark}/>
          <FieldRow label="Prix idéal" value={result.prix_ideal} dark={dark}/>
          <FieldRow label="Vitesse" value={result.vitesse_vente} dark={dark}/>
          <FieldRow label="Temps moyen" value={result.temps_vente_moyen} dark={dark}/>
        </div></Card>
        <Card dark={dark} style={{borderLeft:"3px solid #3b82f6"}}><div style={{fontSize:10,fontWeight:700,color:dark?"#555":"#9ca3af",textTransform:"uppercase",marginBottom:7}}>🎯 Public cible</div><p style={{margin:0,fontSize:13,color:dark?"#e5e7eb":"#111",lineHeight:1.6}}>{result.public_cible}</p></Card>
        <Card dark={dark} style={{borderLeft:"3px solid #22c55e"}}><div style={{fontSize:10,fontWeight:700,color:dark?"#555":"#9ca3af",textTransform:"uppercase",marginBottom:7}}>✅ État optimal</div><p style={{margin:0,fontSize:13,color:dark?"#e5e7eb":"#111",lineHeight:1.6}}>{result.etat_optimal}</p></Card>
        <Card dark={dark}><div style={{fontSize:10,fontWeight:700,color:dark?"#555":"#9ca3af",textTransform:"uppercase",marginBottom:9}}>🏷️ Top marques</div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{result.marques_top?.map(m=><span key={m} style={{padding:"5px 12px",borderRadius:20,background:`${APP.c2}20`,color:APP.c2,fontWeight:700,fontSize:12}}>{m}</span>)}</div></Card>
        <Card dark={dark}><div style={{fontSize:10,fontWeight:700,color:dark?"#555":"#9ca3af",textTransform:"uppercase",marginBottom:9}}>🔑 Mots-clés</div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{result.mots_cles?.map(m=><span key={m} style={{padding:"5px 12px",borderRadius:20,background:dark?"#1a1a2e":"#f4f4f6",color:dark?"#aaa":"#374151",fontWeight:600,fontSize:12}}>#{m}</span>)}</div></Card>
        <Card dark={dark} style={{borderLeft:`3px solid #f59e0b`}}><p style={{margin:0,fontSize:13,color:dark?"#e5e7eb":"#111",lineHeight:1.6}}>📸 <strong style={{color:"#f59e0b"}}>Astuce photo :</strong> {result.astuce_photo}</p></Card>
        <Card dark={dark} style={{borderLeft:`3px solid ${APP.c2}`}}><p style={{margin:0,fontSize:13,color:dark?"#e5e7eb":"#111",lineHeight:1.6}}>💡 <strong style={{color:APP.c2}}>Conseil :</strong> {result.conseil}</p></Card>
      </div>)}
    </div>)}

    {subTab==="score"&&(<div>
      <Card dark={dark} style={{marginBottom:12}}><Lbl dark={dark}>Titre actuel</Lbl><Inp value={scoreA.titre} onChange={e=>setScoreA(p=>({...p,titre:e.target.value}))} placeholder="Titre actuel..." dark={dark}/></Card>
      <Card dark={dark} style={{marginBottom:12}}><Lbl dark={dark}>Description *</Lbl><Txta value={scoreA.desc} onChange={e=>setScoreA(p=>({...p,desc:e.target.value}))} placeholder="Colle ta description..." dark={dark} rows={4}/></Card>
      <Card dark={dark} style={{marginBottom:14}}><Lbl dark={dark}>Prix (€)</Lbl><Inp type="number" value={scoreA.prix} onChange={e=>setScoreA(p=>({...p,prix:e.target.value}))} placeholder="25" dark={dark}/></Card>
      <Btn onClick={analyseScore} disabled={scoreA.loading||!scoreA.desc.trim()} full>{scoreA.loading?"Analyse...":"⭐ Noter mon annonce"}</Btn>
      {scoreA.loading&&<Card dark={dark} style={{marginTop:12}}><Spin/></Card>}
      {scoreA.result&&!scoreA.loading&&(<div style={{marginTop:14,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{background:`linear-gradient(135deg,${APP.c1},#16213e)`,borderRadius:16,padding:20,border:`1px solid ${APP.c2}44`,textAlign:"center"}}><div style={{fontSize:48,fontWeight:900,color:APP.c2}}>{scoreA.result.score_global}</div><div style={{fontSize:12,color:"#666",marginTop:4}}>Score global</div></div>
        <Card dark={dark}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{Object.entries(scoreA.result.scores||{}).map(([k,v])=><FieldRow key={k} label={k} value={v} dark={dark}/>)}</div></Card>
        <Card dark={dark} style={{borderLeft:"3px solid #22c55e"}}><div style={{fontSize:10,fontWeight:700,color:"#22c55e",textTransform:"uppercase",marginBottom:8}}>✅ Points forts</div>{scoreA.result.points_forts?.map((p,i)=><div key={i} style={{fontSize:13,color:dark?"#aaa":"#555",marginBottom:4}}>• {p}</div>)}</Card>
        <Card dark={dark} style={{borderLeft:"3px solid #ef4444"}}><div style={{fontSize:10,fontWeight:700,color:"#ef4444",textTransform:"uppercase",marginBottom:8}}>❌ À améliorer</div>{scoreA.result.points_faibles?.map((p,i)=><div key={i} style={{fontSize:13,color:dark?"#aaa":"#555",marginBottom:4}}>• {p}</div>)}</Card>
        {scoreA.result.titre_ameliore&&<BigField icon="✏️" label="Titre optimisé" value={scoreA.result.titre_ameliore} dark={dark}/>}
        {scoreA.result.hashtags_manquants?.length>0&&<Card dark={dark}><div style={{fontSize:10,fontWeight:700,color:dark?"#555":"#9ca3af",textTransform:"uppercase",marginBottom:8}}>🔑 Hashtags manquants</div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{scoreA.result.hashtags_manquants.map(h=><span key={h} style={{padding:"5px 12px",borderRadius:20,background:`${APP.c2}20`,color:APP.c2,fontSize:12,fontWeight:600}}>{h}</span>)}</div></Card>}
      </div>)}
    </div>)}

    {subTab==="concurrence"&&(<div>
      <Card dark={dark} style={{marginBottom:14}}><Lbl dark={dark} sub="L'IA analyse les annonces similaires">Article à analyser</Lbl>
        <div style={{display:"flex",gap:10}}><Inp value={concuQ} onChange={e=>setConcuQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyseConcurrence()} placeholder="Ex: Veste en cuir noire S..." dark={dark}/><Btn onClick={analyseConcurrence} disabled={concuL||!concuQ.trim()} small>{concuL?"...":"🔍"}</Btn></div>
      </Card>
      {concuL&&<Card dark={dark}><Spin/></Card>}
      {concuR&&!concuL&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Card dark={dark}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <FieldRow label="Annonces estimées" value={concuR.nb_annonces_estim} dark={dark}/>
          <FieldRow label="Prix moyen" value={concuR.prix_moyen} dark={dark}/>
          <FieldRow label="Prix min" value={concuR.prix_min} dark={dark}/>
          <FieldRow label="Prix max" value={concuR.prix_max} dark={dark}/>
          <FieldRow label="État dominant" value={concuR.etat_dominant} dark={dark}/>
          <FieldRow label="Meilleur moment" value={concuR.meilleur_moment} dark={dark}/>
        </div></Card>
        <Card dark={dark} style={{borderLeft:`3px solid ${APP.c2}`}}><div style={{fontSize:10,fontWeight:700,color:APP.c2,textTransform:"uppercase",marginBottom:8}}>🚀 Se démarquer</div>{concuR.points_differenciants?.map((p,i)=><div key={i} style={{fontSize:13,color:dark?"#aaa":"#555",marginBottom:5}}>✦ {p}</div>)}</Card>
        <Card dark={dark} style={{borderLeft:"3px solid #22c55e"}}><p style={{margin:0,fontSize:13,color:dark?"#aaa":"#555",lineHeight:1.6}}>💡 <strong style={{color:"#22c55e"}}>Positionnement :</strong> {concuR.conseil_positionnement}</p></Card>
      </div>)}
    </div>)}

    {subTab==="calendrier"&&(<div>
      <Card dark={dark} style={{marginBottom:14,borderLeft:`3px solid ${APP.c2}`}}><p style={{margin:0,fontSize:13,color:dark?"#aaa":"#555",lineHeight:1.6}}>💡 Les annonces aux heures de pointe reçoivent <strong style={{color:APP.c2}}>3x plus de vues</strong>.</p></Card>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {CAL.map(j=>(<Card key={j.jour} dark={dark} style={{padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:9,background:`${sC(j.score)}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:sC(j.score)}}>{j.score}</div>
              <div><div style={{fontSize:13,fontWeight:800,color:dark?"#e5e7eb":"#111"}}>{j.jour}</div><div style={{fontSize:11,color:APP.c2,fontWeight:700}}>⏰ {j.heure}</div></div>
            </div>
            <div style={{width:70,height:5,borderRadius:3,background:dark?"#1a1a2e":"#f0f0f0",overflow:"hidden"}}><div style={{width:`${j.score*10}%`,height:"100%",background:sC(j.score),borderRadius:3}}/></div>
          </div>
        </Card>))}
      </div>
    </div>)}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB MARGE
// ══════════════════════════════════════════════════════════════════════════════
function TabMarge({dark}){
  const [pa,setPa]=useState(""); const [frais,setFrais]=useState(""); const [pv,setPv]=useState(""); const [ship,setShip]=useState(SHIP[1]); const [isPro,setIsPro]=useState(false); const [simS,setSimS]=useState(4); const [simB,setSimB]=useState(10);
  const paN=parseFloat(pa)||0; const fraisN=parseFloat(frais)||0; const pvN=parseFloat(pv)||0; const coutTotal=paN+fraisN;
  const marge=pvN-coutTotal-(isPro?pvN*0.128:0); const margePct=pvN>0?((marge/pvN)*100).toFixed(0):0; const margeC=marge>0?"#22c55e":marge<0?"#ef4444":"#9ca3af";
  const simSteps=Array.from({length:simS+1},(_,i)=>{const p=pvN*Math.pow(1-simB/100,i);const m=p-coutTotal-(isPro?p*0.128:0);return{s:i,p:p.toFixed(2),m:m.toFixed(2),ok:m>0};});

  return(<div>
    <SectionTitle dark={dark} sub="Calcule ton bénéfice sur Vinted">💰 Calculateur de marge</SectionTitle>
    <Card dark={dark} style={{marginBottom:12}}>
      <p style={{margin:"0 0 10px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase",letterSpacing:"0.6px"}}>👤 Statut vendeur</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[[false,"Particulier","Aucune taxe"],[true,"Pro / Micro","Charges 12.8%"]].map(([val,label,sub])=>(
          <div key={String(val)} onClick={()=>setIsPro(val)} style={{padding:"11px 13px",borderRadius:11,cursor:"pointer",border:`2px solid ${isPro===val?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:isPro===val?`${APP.c2}15`:dark?"#0d0d1a":"white"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><div style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${isPro===val?APP.c2:dark?"#444":"#d1d5db"}`,background:isPro===val?APP.c2:"transparent"}}/><span style={{fontSize:12,fontWeight:700,color:isPro===val?APP.c2:dark?"#e5e7eb":"#111"}}>{label}</span></div>
            <p style={{margin:0,fontSize:10,color:dark?"#555":"#9ca3af",paddingLeft:20}}>{sub}</p>
          </div>
        ))}
      </div>
      {isPro&&<div style={{marginTop:10,background:"#fef9ec",border:"1px solid #f59e0b44",borderRadius:9,padding:"9px 12px"}}><p style={{margin:0,fontSize:11,color:"#92400e",lineHeight:1.5}}>⚠️ 12.8% cotisations incluses. Impôt non inclus.</p></div>}
    </Card>
    <Card dark={dark} style={{marginBottom:12}}>
      <p style={{margin:"0 0 12px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase",letterSpacing:"0.6px"}}>💳 Coût d'achat</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><Lbl dark={dark} sub="Vide-grenier, lot...">Prix d'achat (€)</Lbl><Inp type="number" value={pa} onChange={e=>setPa(e.target.value)} placeholder="0" dark={dark}/></div>
        <div><Lbl dark={dark} sub="Nettoyage, réparation...">Frais annexes (€)</Lbl><Inp type="number" value={frais} onChange={e=>setFrais(e.target.value)} placeholder="0" dark={dark}/></div>
      </div>
      {coutTotal>0&&<div style={{marginTop:10,background:`${APP.c2}15`,borderRadius:9,padding:"9px 13px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,color:dark?"#aaa":"#555"}}>Coût total</span><span style={{fontSize:17,fontWeight:900,color:APP.c2}}>{coutTotal.toFixed(2)}€</span></div>}
    </Card>
    <Card dark={dark} style={{marginBottom:12}}>
      <p style={{margin:"0 0 10px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase",letterSpacing:"0.6px"}}>📦 Livraison</p>
      <p style={{margin:"0 0 10px",fontSize:11,color:dark?"#444":"#9ca3af"}}>Sur Vinted, <strong style={{color:"#22c55e"}}>payée par l'acheteur</strong> — ne réduit pas ta marge.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {SHIP.map(s=><div key={s.l} onClick={()=>setShip(s)} style={{padding:"9px 11px",borderRadius:9,cursor:"pointer",border:`2px solid ${ship.l===s.l?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:ship.l===s.l?`${APP.c2}15`:dark?"#0d0d1a":"white"}}>
          <div style={{fontSize:11,fontWeight:700,color:ship.l===s.l?APP.c2:dark?"#e5e7eb":"#111"}}>{s.l}</div>
          <div style={{fontSize:10,color:dark?"#555":"#9ca3af",marginTop:1}}>{s.p}€</div>
        </div>)}
      </div>
    </Card>
    <Card dark={dark} style={{marginBottom:14}}>
      <p style={{margin:"0 0 8px",fontSize:11,fontWeight:800,color:"#09b1ba",textTransform:"uppercase",letterSpacing:"0.6px"}}>🏷️ Prix de vente Vinted</p>
      <p style={{margin:"0 0 10px",fontSize:11,color:dark?"#444":"#9ca3af"}}>Vinted ne prélève <strong style={{color:"#22c55e"}}>aucun frais</strong> au vendeur.</p>
      <div style={{display:"flex",border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,borderRadius:10,overflow:"hidden"}}>
        <input type="number" value={pv} onChange={e=>setPv(e.target.value)} placeholder="Ex: 25" style={{flex:1,padding:"12px 14px",border:"none",fontSize:16,fontWeight:700,background:"transparent",color:dark?"#e5e7eb":"#111",outline:"none"}}/>
        <div style={{padding:"12px 14px",background:dark?"#1a1a2e":"#f0f0f0",fontSize:14,fontWeight:800,color:"#09b1ba",borderLeft:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`}}>€</div>
      </div>
    </Card>
    {pvN>0&&(<Card dark={dark} style={{marginBottom:14,border:`2px solid ${margeC}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontSize:15,fontWeight:800,color:dark?"#e5e7eb":"#111"}}>Marge nette</span><span style={{fontSize:30,fontWeight:900,color:margeC}}>{marge.toFixed(2)}€</span></div>
      {[["Prix affiché",`${pvN.toFixed(2)}€`,dark?"#e5e7eb":"#111"],["Frais vendeur","0.00€ ✓","#22c55e"],["Livraison acheteur",`${ship.p}€ ✓`,"#22c55e"],["— Coût article",`-${coutTotal.toFixed(2)}€`,"#ef4444"],isPro&&["— Charges (12.8%)",`-${(pvN*0.128).toFixed(2)}€`,"#f59e0b"]].filter(Boolean).map(([l,v,c],i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span style={{color:dark?"#666":"#9ca3af"}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span></div>
      ))}
      <div style={{marginTop:10,padding:"9px 14px",borderRadius:9,background:marge>0?"#f0fdf4":"#fef2f2",textAlign:"center"}}><span style={{fontSize:13,fontWeight:800,color:margeC}}>{marge>0?`✓ +${margePct}% de marge`:marge<0?`✗ Perte de ${Math.abs(marge).toFixed(2)}€`:"Équilibre"}</span></div>
    </Card>)}
    {pvN>0&&coutTotal>0&&(<Card dark={dark}>
      <p style={{margin:"0 0 12px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase",letterSpacing:"0.6px"}}>📉 Simulateur de baisses</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><div style={{fontSize:11,fontWeight:700,color:dark?"#666":"#6b7280",marginBottom:5}}>Baisse : <span style={{color:APP.c2}}>{simB}%</span></div><input type="range" min="1" max="30" value={simB} onChange={e=>setSimB(Number(e.target.value))} style={{width:"100%",accentColor:APP.c2}}/></div>
        <div><div style={{fontSize:11,fontWeight:700,color:dark?"#666":"#6b7280",marginBottom:5}}>Semaines : <span style={{color:APP.c2}}>{simS}</span></div><input type="range" min="1" max="8" value={simS} onChange={e=>setSimS(Number(e.target.value))} style={{width:"100%",accentColor:APP.c2}}/></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {simSteps.map(s=>(<div key={s.s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",borderRadius:8,background:s.s===0?`${APP.c2}20`:dark?"#1a1a2e":"#f9fafb",border:`1px solid ${s.s===0?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`}}>
          <span style={{fontSize:11,color:dark?"#aaa":"#555"}}>{s.s===0?"Aujourd'hui":`Semaine ${s.s}`}</span>
          <div style={{display:"flex",gap:10}}><span style={{fontSize:12,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>{s.p}€</span><span style={{fontSize:12,fontWeight:800,color:s.ok?"#22c55e":"#ef4444"}}>{s.m}€</span></div>
        </div>))}
      </div>
    </Card>)}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB AGENT
// ══════════════════════════════════════════════════════════════════════════════
function TabAgent({dark,session,history,stock}){
  const [subTab,setSubTab]=useState("favoris");
  const [msgTemplate,setMsgTemplate]=useState("Bonjour ! 😊 Je vois que vous avez mis mon article en favori — je peux faire un geste sur le prix si vous êtes intéressé·e. N'hésitez pas !");
  const [msgL,setMsgL]=useState(false);
  const [offerS,setOfferS]=useState({threshold:80,counter:90,autoAccept:true});
  const [pubAnnonce,setPubAnnonce]=useState(null); const [pubStep,setPubStep]=useState(0);

  const genMsg=async()=>{
    setMsgL(true);
    const p=`Génère 3 messages naturels pour contacter quelqu'un qui a mis un article en favori sur Vinted. UNIQUEMENT JSON: {"messages":["message sympa","message court","message avec remise"]}`;
    try{const t=await callClaude(p);const r=pj(t);if(r?.messages)setMsgTemplate(r.messages[0]);}catch{}finally{setMsgL(false);}
  };

  return(<div>
    <SectionTitle dark={dark} sub="Gère tes automatisations Vinted">🤖 Agent IA Vinted</SectionTitle>
    <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
      {[["favoris","📨 Favoris"],["offres","🤝 Offres"],["publier","📝 Publier"],["guide","📖 Guide"]].map(([k,l])=>(
        <button key={k} onClick={()=>setSubTab(k)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${subTab===k?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:subTab===k?`${APP.c2}20`:"transparent",color:subTab===k?APP.c2:dark?"#666":"#9ca3af",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
      ))}
    </div>
    {subTab==="favoris"&&(<div>
      <Card dark={dark} style={{marginBottom:12,borderLeft:`3px solid ${APP.c2}`}}><p style={{margin:"0 0 6px",fontSize:12,fontWeight:800,color:APP.c2}}>💡 Comment ça marche</p><p style={{margin:0,fontSize:12,color:dark?"#aaa":"#555",lineHeight:1.6}}>L'agent baisse le prix de 10% → Vinted notifie automatiquement tous tes favoris.</p></Card>
      <Card dark={dark} style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><Lbl dark={dark}>Message template</Lbl><Btn onClick={genMsg} disabled={msgL} small outline>{msgL?"...":"✦ Générer"}</Btn></div>
        <Txta value={msgTemplate} onChange={e=>setMsgTemplate(e.target.value)} dark={dark} rows={3}/>
      </Card>
      {stock.filter(s=>s.statut==="en_vente").length>0&&(<Card dark={dark} style={{marginBottom:12}}>
        <p style={{margin:"0 0 10px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase"}}>Articles en vente ☁️</p>
        {stock.filter(s=>s.statut==="en_vente").slice(0,4).map(a=>(<div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${dark?"#1a1a2e":"#f0f0f0"}`}}>
          <div><div style={{fontSize:12,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>{a.titre}</div><div style={{fontSize:10,color:dark?"#555":"#9ca3af"}}>{a.prix}€</div></div>
          <span style={{padding:"3px 9px",borderRadius:20,background:"#22c55e20",color:"#22c55e",fontSize:10,fontWeight:700}}>Sync ✓</span>
        </div>))}
      </Card>)}
      <div style={{background:`${APP.c2}15`,borderRadius:12,padding:14,borderLeft:`3px solid ${APP.c2}`}}><p style={{margin:"0 0 6px",fontSize:12,fontWeight:800,color:APP.c2}}>▶️ Pour lancer l'agent</p><p style={{margin:0,fontSize:12,color:dark?"#aaa":"#555"}}>Ouvre l'extension Chrome ListAI Pro v2 → Dashboard → Synchroniser → Scanner les favoris</p></div>
    </div>)}
    {subTab==="offres"&&(<div>
      <Card dark={dark} style={{marginBottom:12,borderLeft:"3px solid #22c55e"}}><p style={{margin:"0 0 6px",fontSize:12,fontWeight:800,color:"#22c55e"}}>💡 Comment ça marche</p><p style={{margin:0,fontSize:12,color:dark?"#aaa":"#555",lineHeight:1.6}}>L'extension Chrome détecte les offres et répond automatiquement selon tes seuils.</p></Card>
      <Card dark={dark} style={{marginBottom:12}}>
        <p style={{margin:"0 0 14px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase"}}>⚙️ Paramètres</p>
        <div style={{marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:dark?"#666":"#6b7280",marginBottom:7,display:"flex",justifyContent:"space-between"}}><span>Accepter si offre ≥</span><span style={{color:APP.c2}}>{offerS.threshold}%</span></div><input type="range" min="50" max="100" value={offerS.threshold} onChange={e=>setOfferS(p=>({...p,threshold:Number(e.target.value)}))} style={{width:"100%",accentColor:APP.c2}}/></div>
        <div style={{marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:dark?"#666":"#6b7280",marginBottom:7,display:"flex",justifyContent:"space-between"}}><span>Contre-offrir à</span><span style={{color:APP.c2}}>{offerS.counter}%</span></div><input type="range" min="50" max="100" value={offerS.counter} onChange={e=>setOfferS(p=>({...p,counter:Number(e.target.value)}))} style={{width:"100%",accentColor:APP.c2}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,background:dark?"#0d0d1a":"#f9fafb"}}>
          <div><div style={{fontSize:12,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>Acceptation auto</div><div style={{fontSize:10,color:dark?"#555":"#9ca3af"}}>Accepte automatiquement si ≥ seuil</div></div>
          <Toggle checked={offerS.autoAccept} onChange={e=>setOfferS(p=>({...p,autoAccept:e.target.checked}))}/>
        </div>
      </Card>
    </div>)}
    {subTab==="publier"&&(<div>
      <Card dark={dark} style={{marginBottom:12,borderLeft:"3px solid #3b82f6"}}><p style={{margin:"0 0 6px",fontSize:12,fontWeight:800,color:"#3b82f6"}}>💡 Publication automatique</p><p style={{margin:0,fontSize:12,color:dark?"#aaa":"#555",lineHeight:1.6}}>Sélectionne une annonce, copie le JSON, colle dans l'extension → Publier sur Vinted.</p></Card>
      {history.length>0?(<div>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:dark?"#aaa":"#555"}}>Sélectionne une annonce :</p>
        {history.slice(0,5).map(h=>(<div key={h.id} onClick={()=>{setPubAnnonce(h);setPubStep(0);}} style={{padding:"12px 14px",borderRadius:11,cursor:"pointer",border:`2px solid ${pubAnnonce?.id===h.id?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:pubAnnonce?.id===h.id?`${APP.c2}15`:dark?"#16213e":"white",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>{h.result?.titre}</div>
          <div style={{fontSize:10,color:dark?"#555":"#9ca3af",marginTop:3}}>{h.date} · {h.result?.prix_recommande}€</div>
        </div>))}
        {pubAnnonce&&(<div style={{marginTop:10}}>
          <div style={{background:dark?"#0a0a15":"#f9fafb",borderRadius:10,padding:12,fontFamily:"monospace",fontSize:10,color:dark?"#aaa":"#555",lineHeight:1.6,wordBreak:"break-all",marginBottom:10,maxHeight:120,overflow:"auto"}}>
            {JSON.stringify({titre:pubAnnonce.result?.titre,description:pubAnnonce.result?.description,prix_recommande:pubAnnonce.result?.prix_recommande,marque:pubAnnonce.result?.marque,taille:pubAnnonce.result?.taille},null,2)}
          </div>
          <Btn onClick={()=>{navigator.clipboard.writeText(JSON.stringify({titre:pubAnnonce.result?.titre,description:pubAnnonce.result?.description,prix_recommande:pubAnnonce.result?.prix_recommande,marque:pubAnnonce.result?.marque,taille:pubAnnonce.result?.taille}));setPubStep(1);}} full>📋 Copier le JSON</Btn>
          {pubStep>=1&&<div style={{marginTop:10,padding:"11px 14px",borderRadius:10,background:"#f0fdf4",border:"1px solid #22c55e44"}}><p style={{margin:0,fontSize:12,color:"#15803d",fontWeight:600}}>✓ Copié ! Colle dans l'extension → onglet Publier</p></div>}
        </div>)}
      </div>):<Empty emoji="📝" title="Aucune annonce" sub="Génère d'abord une annonce dans l'onglet ✦"/>}
    </div>)}
    {subTab==="guide"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {[{i:1,ico:"🔌",t:"Installe l'extension Chrome v2",d:"Télécharge listai-extension-v2.zip et installe dans Chrome (mode développeur)."},{i:2,ico:"🌐",t:"Ouvre Vinted",d:"Connecte-toi à ton compte Vinted dans Chrome."},{i:3,ico:"🔄",t:"Synchronise",d:"Clique ✦ → Dashboard → Synchroniser. Tes données cloud arrivent dans l'extension."},{i:4,ico:"▶️",t:"Lance l'agent",d:"Active les automatisations → Scanner les favoris. L'agent tourne en arrière-plan."}].map(inst=>(<Card key={inst.i} dark={dark}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{width:38,height:38,borderRadius:11,background:`${APP.c2}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{inst.ico}</div>
          <div><div style={{fontSize:13,fontWeight:800,color:dark?"#e5e7eb":"#111",marginBottom:4}}>Étape {inst.i} — {inst.t}</div><div style={{fontSize:12,color:dark?"#aaa":"#555",lineHeight:1.6}}>{inst.d}</div></div>
        </div>
      </Card>))}
      <Card dark={dark} style={{borderLeft:"3px solid #f59e0b"}}><p style={{margin:0,fontSize:12,color:dark?"#aaa":"#555",lineHeight:1.6}}>⚠️ <strong style={{color:"#f59e0b"}}>Limite :</strong> 50 actions max/jour · délais 10-20s · ne pas laisser tourner la nuit.</p></Card>
    </div>)}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB STOCK
// ══════════════════════════════════════════════════════════════════════════════
function TabStock({dark,session,stock,setStock,history}){
  const [form,setForm]=useState({titre:"",marque:"",taille:"",prix:"",plateforme:"Vinted",etat:"Très bon état",notes:""});
  const [showForm,setShowForm]=useState(false); const [filter,setFilter]=useState("tous"); const [saving,setSaving]=useState(false);
  const statuts=[{k:"en_vente",l:"En vente",c:"#3b82f6"},{k:"vendu",l:"Vendu",c:"#22c55e"},{k:"reserve",l:"Réservé",c:"#f59e0b"}];
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
  const importFromHistory=async(h)=>{
    const a={titre:h.result.titre,marque:h.result.marque,taille:h.result.taille,prix:h.result.prix_recommande,plateforme:"Vinted",etat:h.result.etat,notes:"",statut:"en_vente",dateAjout:new Date().toLocaleDateString("fr-FR")};
    const saved=await db.addStock(session.user.id,a,session.access_token);
    if(saved?.id)setStock(prev=>[{...a,id:saved.id},...prev]);
  };

  return(<div>
    <SectionTitle dark={dark} sub="Synchronisé sur tous tes appareils ☁️">📦 Gestion du stock</SectionTitle>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
      {[["En vente",stock.filter(s=>s.statut==="en_vente").length,"#3b82f6"],["Vendus",stock.filter(s=>s.statut==="vendu").length,"#22c55e"],["CA total",`${totalCA.toFixed(0)}€`,APP.c2]].map(([l,v,c])=>(<Card key={l} dark={dark} style={{textAlign:"center",padding:14}}><div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:10,color:dark?"#555":"#9ca3af",marginTop:3,fontWeight:600}}>{l}</div></Card>))}
    </div>
    <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
      {[["tous","Tous"],...statuts.map(s=>[s.k,s.l])].map(([k,l])=>(<button key={k} onClick={()=>setFilter(k)} style={{padding:"6px 13px",borderRadius:20,border:`1.5px solid ${filter===k?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:filter===k?`${APP.c2}20`:"transparent",color:filter===k?APP.c2:dark?"#666":"#9ca3af",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>))}
      <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:20,border:"none",background:`linear-gradient(135deg,${APP.c2},#e8c584)`,color:"#1a1a2e",fontSize:11,fontWeight:800,cursor:"pointer"}}>+ Ajouter</button>
    </div>
    {showForm&&(<Card dark={dark} style={{marginBottom:14}}>
      <p style={{margin:"0 0 12px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase"}}>Nouvel article</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
        <div style={{gridColumn:"1/-1"}}><Lbl dark={dark}>Titre *</Lbl><Inp value={form.titre} onChange={e=>setForm(p=>({...p,titre:e.target.value}))} placeholder="Ex: Veste Zara S" dark={dark}/></div>
        <div><Lbl dark={dark}>Marque</Lbl><Inp value={form.marque} onChange={e=>setForm(p=>({...p,marque:e.target.value}))} placeholder="Zara" dark={dark}/></div>
        <div><Lbl dark={dark}>Taille</Lbl><Inp value={form.taille} onChange={e=>setForm(p=>({...p,taille:e.target.value}))} placeholder="S / 36" dark={dark}/></div>
        <div><Lbl dark={dark}>Prix (€)</Lbl><Inp type="number" value={form.prix} onChange={e=>setForm(p=>({...p,prix:e.target.value}))} placeholder="25" dark={dark}/></div>
        <div><Lbl dark={dark}>Plateforme</Lbl><select value={form.plateforme} onChange={e=>setForm(p=>({...p,plateforme:e.target.value}))} style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,borderRadius:10,fontSize:14,background:dark?"#1a1a2e":"white",color:dark?"#e5e7eb":"#111",outline:"none"}}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={addArticle} disabled={saving} small>{saving?"☁️ Sauvegarde...":"Ajouter"}</Btn><Btn onClick={()=>setShowForm(false)} small outline>Annuler</Btn></div>
    </Card>)}
    {history.length>0&&(<Card dark={dark} style={{marginBottom:14,borderLeft:`3px solid ${APP.c2}`}}>
      <p style={{margin:"0 0 9px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase"}}>↩ Importer depuis l'historique</p>
      {history.slice(0,3).map(h=>(<div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,color:dark?"#aaa":"#555"}}>{h.result.titre}</span><Btn onClick={()=>importFromHistory(h)} small outline>Importer</Btn></div>))}
    </Card>)}
    {filtered.length===0?<Empty emoji="📦" title="Aucun article" sub="Ajoute ton premier article en stock !"/>:(
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {filtered.map(art=>{const s=statuts.find(x=>x.k===art.statut);return(<Card key={art.id} dark={dark}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
            <div style={{flex:1}}><p style={{margin:"0 0 3px",fontSize:13,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>{art.titre}</p><p style={{margin:0,fontSize:10,color:dark?"#555":"#9ca3af"}}>{art.marque} · {art.taille} · {art.plateforme}</p></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:15,fontWeight:900,color:APP.c2}}>{art.prix}€</span><span style={{padding:"3px 9px",borderRadius:20,background:`${s.c}20`,color:s.c,fontSize:10,fontWeight:700}}>{s.l}</span></div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {statuts.filter(x=>x.k!==art.statut).map(x=><button key={x.k} onClick={()=>updateStatut(art.id,x.k)} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${x.c}44`,background:`${x.c}10`,color:x.c,fontSize:11,fontWeight:700,cursor:"pointer"}}>→ {x.l}</button>)}
            <button onClick={()=>deleteArticle(art.id)} style={{marginLeft:"auto",padding:"4px 8px",borderRadius:7,border:"1px solid #ef444444",background:"#ef444410",color:"#ef4444",fontSize:11,cursor:"pointer"}}>🗑</button>
          </div>
        </Card>);})}
      </div>
    )}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB RÉPONSES
// ══════════════════════════════════════════════════════════════════════════════
function TabReponses({dark}){
  const QUESTIONS=["Toujours disponible ?","Dernière baisse de prix ?","Défauts / imperfections ?","Échange possible ?","Délai d'envoi ?","Taille dans le vrai ?","Autre question"];
  const [question,setQuestion]=useState(QUESTIONS[0]); const [customQ,setCustomQ]=useState(""); const [article,setArticle]=useState(""); const [ton,setTon]=useState("sympa"); const [loading,setLoading]=useState(false); const [reponses,setReponses]=useState(null);
  const generate=async()=>{
    const q=question==="Autre question"?customQ:question;if(!q.trim())return;setLoading(true);setReponses(null);
    const p=`Vendeur Vinted. Article: "${article||"vêtement"}", question: "${q}". 3 réponses ${ton==="sympa"?"chaleureuses":ton==="pro"?"professionnelles":"courtes"}. UNIQUEMENT JSON: {"reponses":[{"label":"Option 1","texte":"réponse"},{"label":"Option 2","texte":"réponse"},{"label":"Option 3","texte":"réponse"}]}`;
    try{const t=await callClaude(p);const r=pj(t);if(r)setReponses(r);}catch{}finally{setLoading(false);}
  };
  return(<div>
    <SectionTitle dark={dark} sub="Génère des réponses parfaites aux acheteurs">💬 Réponses acheteurs</SectionTitle>
    <Card dark={dark} style={{marginBottom:12}}><Lbl dark={dark} sub="Optionnel">Article concerné</Lbl><Inp value={article} onChange={e=>setArticle(e.target.value)} placeholder="Ex: veste en cuir Zara S..." dark={dark}/></Card>
    <Card dark={dark} style={{marginBottom:12}}>
      <Lbl dark={dark}>Question de l'acheteur</Lbl>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:question==="Autre question"?10:0}}>{QUESTIONS.map(q=><button key={q} onClick={()=>setQuestion(q)} style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${question===q?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:question===q?`${APP.c2}20`:"transparent",color:question===q?APP.c2:dark?"#666":"#9ca3af",fontSize:11,fontWeight:700,cursor:"pointer"}}>{q}</button>)}</div>
      {question==="Autre question"&&<div style={{marginTop:10}}><Inp value={customQ} onChange={e=>setCustomQ(e.target.value)} placeholder="Tape la question..." dark={dark}/></div>}
    </Card>
    <Card dark={dark} style={{marginBottom:14}}><Lbl dark={dark}>Ton</Lbl><div style={{display:"flex",gap:8}}>{[["sympa","😊 Sympa"],["pro","💼 Pro"],["court","⚡ Court"]].map(([k,l])=><button key={k} onClick={()=>setTon(k)} style={{flex:1,padding:"9px",borderRadius:9,border:`1.5px solid ${ton===k?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:ton===k?`${APP.c2}20`:"transparent",color:ton===k?APP.c2:dark?"#666":"#9ca3af",fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>)}</div></Card>
    <Btn onClick={generate} disabled={loading||(question==="Autre question"&&!customQ.trim())} full>{loading?"Génération...":"✦ Générer 3 réponses"}</Btn>
    {loading&&<Card dark={dark} style={{marginTop:12}}><Spin/></Card>}
    {reponses&&!loading&&(<div style={{marginTop:14,display:"flex",flexDirection:"column",gap:10}}>
      {reponses.reponses?.map((r,i)=>{const [c,setC]=useState(false);return(<Card key={i} dark={dark}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}><span style={{fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase"}}>{r.label}</span><button onClick={()=>{navigator.clipboard.writeText(r.texte);setC(true);setTimeout(()=>setC(false),2000);}} style={{padding:"4px 11px",borderRadius:7,border:`1px solid ${dark?"#333":"#e5e7eb"}`,background:dark?"#2a2a3e":"white",color:APP.c2,fontSize:11,fontWeight:700,cursor:"pointer"}}>{c?"✓ Copié":"Copier"}</button></div><p style={{margin:0,fontSize:13,color:dark?"#e5e7eb":"#111",lineHeight:1.7}}>{r.texte}</p></Card>);})}
    </div>)}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB RÉ-OPTIMISER
// ══════════════════════════════════════════════════════════════════════════════
function TabReopt({dark}){
  const [ancienTitre,setAncienTitre]=useState(""); const [ancienneDesc,setAncienneDesc]=useState(""); const [raison,setRaison]=useState("ne_vend_pas"); const [loading,setLoading]=useState(false); const [result,setResult]=useState(null);
  const RAISONS=[["ne_vend_pas","❌ Ne se vend pas"],["peu_vues","👁️ Peu de vues"],["peu_favoris","❤️ Peu de favoris"],["nego_trop_basse","💸 Offres trop basses"],["relooking_complet","✨ Relooking complet"]];
  const optimise=async()=>{
    if(!ancienneDesc.trim())return;setLoading(true);setResult(null);
    const p=`Expert Vinted. Ré-optimise cette annonce qui "${RAISONS.find(r=>r[0]===raison)[1]}". Titre: "${ancienTitre}", Description: "${ancienneDesc}". UNIQUEMENT JSON: {"nouveau_titre":"max 60 chars","nouvelle_description":"6-8 lignes","nouveaux_hashtags":"15 #hashtags","changements":["c1","c2","c3"],"conseil_prix":"conseil"}`;
    try{const t=await callClaude(p);const r=pj(t);if(r)setResult(r);}catch{}finally{setLoading(false);}
  };
  return(<div>
    <SectionTitle dark={dark} sub="Redonner vie à une annonce qui stagne">🔄 Ré-optimiseur</SectionTitle>
    <Card dark={dark} style={{marginBottom:12}}><Lbl dark={dark}>Pourquoi ré-optimiser ?</Lbl><div style={{display:"flex",flexDirection:"column",gap:7}}>{RAISONS.map(([k,l])=>(<div key={k} onClick={()=>setRaison(k)} style={{padding:"10px 13px",borderRadius:10,cursor:"pointer",border:`1.5px solid ${raison===k?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:raison===k?`${APP.c2}15`:dark?"#0d0d1a":"white",display:"flex",alignItems:"center",gap:9}}><div style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${raison===k?APP.c2:dark?"#444":"#d1d5db"}`,background:raison===k?APP.c2:"transparent"}}/><span style={{fontSize:13,fontWeight:raison===k?700:400,color:raison===k?APP.c2:dark?"#aaa":"#374151"}}>{l}</span></div>))}</div></Card>
    <Card dark={dark} style={{marginBottom:12}}><Lbl dark={dark}>Titre actuel (optionnel)</Lbl><Inp value={ancienTitre} onChange={e=>setAncienTitre(e.target.value)} placeholder="Ton titre..." dark={dark}/></Card>
    <Card dark={dark} style={{marginBottom:14}}><Lbl dark={dark}>Description actuelle *</Lbl><Txta value={ancienneDesc} onChange={e=>setAncienneDesc(e.target.value)} placeholder="Colle ta description..." dark={dark} rows={5}/></Card>
    <Btn onClick={optimise} disabled={loading||!ancienneDesc.trim()} full>{loading?"Ré-optimisation...":"✦ Ré-optimiser"}</Btn>
    {loading&&<Card dark={dark} style={{marginTop:12}}><Spin/></Card>}
    {result&&!loading&&(<div style={{marginTop:14,display:"flex",flexDirection:"column",gap:10}}>
      <Card dark={dark} style={{background:`linear-gradient(135deg,${APP.c1},#16213e)`,border:`1px solid ${APP.c2}44`}}><p style={{margin:"0 0 9px",fontSize:11,fontWeight:700,color:APP.c2,textTransform:"uppercase"}}>✨ Ce qui a changé</p>{result.changements?.map((c,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:5}}><span style={{color:APP.c2}}>✦</span><span style={{fontSize:12,color:"#aaa"}}>{c}</span></div>)}</Card>
      <BigField icon="✏️" label="Nouveau titre" value={result.nouveau_titre} dark={dark}/>
      <BigField icon="📝" label="Nouvelle description" value={result.nouvelle_description} dark={dark}/>
      <BigField icon="#️⃣" label="Nouveaux hashtags" value={result.nouveaux_hashtags} dark={dark}/>
      {result.conseil_prix&&<Card dark={dark} style={{borderLeft:`3px solid ${APP.c2}`}}><p style={{margin:0,fontSize:13,color:dark?"#aaa":"#555",lineHeight:1.7}}>💰 <strong style={{color:APP.c2}}>Prix :</strong> {result.conseil_prix}</p></Card>}
    </div>)}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB VENTES
// ══════════════════════════════════════════════════════════════════════════════
function TabVentes({dark,session,ventes,setVentes}){
  const [form,setForm]=useState({article:"",prix_vente:"",prix_achat:"",plateforme:"Vinted",date:new Date().toISOString().split("T")[0]});
  const [showForm,setShowForm]=useState(false); const [periode,setPeriode]=useState("mois"); const [saving,setSaving]=useState(false);
  const now=new Date();
  const filtered=ventes.filter(v=>{const d=new Date(v.date);if(periode==="semaine")return(now-d)/864e5<=7;if(periode==="mois")return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();if(periode==="annee")return d.getFullYear()===now.getFullYear();return true;});
  const CA=filtered.reduce((s,v)=>s+(parseFloat(v.prix_vente)||0),0); const couts=filtered.reduce((s,v)=>s+(parseFloat(v.prix_achat)||0),0); const marge=CA-couts; const margePct=CA>0?((marge/CA)*100).toFixed(0):0;
  const byPlatform=PLATFORMS.map(p=>({p,n:filtered.filter(v=>v.plateforme===p).length,ca:filtered.filter(v=>v.plateforme===p).reduce((s,v)=>s+(parseFloat(v.prix_vente)||0),0)})).filter(x=>x.n>0).sort((a,b)=>b.ca-a.ca);
  const addVente=async()=>{
    if(!form.article.trim()||!form.prix_vente)return;setSaving(true);
    const saved=await db.addVente(session.user.id,form,session.access_token);
    if(saved?.id)setVentes(prev=>[{...form,id:saved.id},...prev]);
    setForm({article:"",prix_vente:"",prix_achat:"",plateforme:"Vinted",date:new Date().toISOString().split("T")[0]});setShowForm(false);setSaving(false);
  };
  const delVente=async(id)=>{await db.delVente(session.user.id,id,session.access_token);setVentes(prev=>prev.filter(x=>x.id!==id));};

  return(<div>
    <SectionTitle dark={dark} sub="Synchronisé sur tous tes appareils ☁️">📊 Suivi des ventes</SectionTitle>
    <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
      {[["semaine","7 jours"],["mois","Ce mois"],["annee","Cette année"],["tout","Tout"]].map(([k,l])=><button key={k} onClick={()=>setPeriode(k)} style={{padding:"6px 13px",borderRadius:20,border:`1.5px solid ${periode===k?APP.c2:dark?"#2a2a4e":"#e5e7eb"}`,background:periode===k?`${APP.c2}20`:"transparent",color:periode===k?APP.c2:dark?"#666":"#9ca3af",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
      <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:20,border:"none",background:`linear-gradient(135deg,${APP.c2},#e8c584)`,color:"#1a1a2e",fontSize:11,fontWeight:800,cursor:"pointer"}}>+ Ajouter</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
      {[["💰 CA",`${CA.toFixed(0)}€`,APP.c2],["📈 Marge",`${marge.toFixed(0)}€`,marge>=0?"#22c55e":"#ef4444"],["🛍️ Ventes",filtered.length,"#3b82f6"],["📊 %",`${margePct}%`,marge>=0?"#22c55e":"#ef4444"]].map(([l,v,c])=>(<Card key={l} dark={dark} style={{padding:14}}><div style={{fontSize:10,fontWeight:700,color:dark?"#555":"#9ca3af",marginBottom:5}}>{l}</div><div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div></Card>))}
    </div>
    {byPlatform.length>0&&<Card dark={dark} style={{marginBottom:14}}><p style={{margin:"0 0 10px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase"}}>🏆 Par plateforme</p>{byPlatform.map((x,i)=>(<div key={x.p} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:i<byPlatform.length-1?9:0}}><span style={{fontSize:13,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>{x.p}</span><span style={{fontWeight:800,color:APP.c2}}>{x.ca.toFixed(0)}€</span></div>))}</Card>}
    {showForm&&(<Card dark={dark} style={{marginBottom:14}}>
      <p style={{margin:"0 0 12px",fontSize:11,fontWeight:800,color:APP.c2,textTransform:"uppercase"}}>Nouvelle vente</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
        <div style={{gridColumn:"1/-1"}}><Lbl dark={dark}>Article *</Lbl><Inp value={form.article} onChange={e=>setForm(p=>({...p,article:e.target.value}))} placeholder="Ex: Veste Zara S" dark={dark}/></div>
        <div><Lbl dark={dark}>Prix de vente (€) *</Lbl><Inp type="number" value={form.prix_vente} onChange={e=>setForm(p=>({...p,prix_vente:e.target.value}))} placeholder="25" dark={dark}/></div>
        <div><Lbl dark={dark}>Prix d'achat (€)</Lbl><Inp type="number" value={form.prix_achat} onChange={e=>setForm(p=>({...p,prix_achat:e.target.value}))} placeholder="5" dark={dark}/></div>
        <div><Lbl dark={dark}>Plateforme</Lbl><select value={form.plateforme} onChange={e=>setForm(p=>({...p,plateforme:e.target.value}))} style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${dark?"#2a2a4e":"#e5e7eb"}`,borderRadius:10,fontSize:14,background:dark?"#1a1a2e":"white",color:dark?"#e5e7eb":"#111",outline:"none"}}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
        <div><Lbl dark={dark}>Date</Lbl><Inp type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} dark={dark}/></div>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={addVente} disabled={saving} small>{saving?"☁️ Sauvegarde...":"Enregistrer"}</Btn><Btn onClick={()=>setShowForm(false)} small outline>Annuler</Btn></div>
    </Card>)}
    {ventes.length===0?<Empty emoji="📊" title="Aucune vente" sub="Ajoute ta première vente !"/>:(
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {filtered.map(v=>{const m=(parseFloat(v.prix_vente)||0)-(parseFloat(v.prix_achat)||0);return(<Card key={v.id} dark={dark} style={{padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><p style={{margin:"0 0 3px",fontSize:13,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>{v.article}</p><p style={{margin:0,fontSize:10,color:dark?"#555":"#9ca3af"}}>{v.plateforme} · {v.date}</p></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:900,color:APP.c2}}>{parseFloat(v.prix_vente).toFixed(0)}€</div>{v.prix_achat&&<div style={{fontSize:10,color:m>=0?"#22c55e":"#ef4444",fontWeight:700}}>+{m.toFixed(0)}€</div>}</div>
              <button onClick={()=>delVente(v.id)} style={{padding:"3px 7px",borderRadius:6,border:"1px solid #ef444444",background:"#ef444410",color:"#ef4444",fontSize:11,cursor:"pointer"}}>🗑</button>
            </div>
          </div>
        </Card>);})}
      </div>
    )}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB HISTORIQUE
// ══════════════════════════════════════════════════════════════════════════════
function TabHistorique({dark,session,history,setHistory,setTab,setResultToShow}){
  const delListing=async(id)=>{await db.delListing(session.user.id,id,session.access_token);setHistory(p=>p.filter(x=>x.id!==id));};
  const clearAll=async()=>{await db.clearListings(session.user.id,session.access_token);setHistory([]);};
  if(!history.length)return <Empty emoji="📭" title="Aucune annonce générée" sub="Génère ta première annonce dans l'onglet ✦ !"/>;
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <SectionTitle dark={dark} sub={`${history.length} annonce(s) · ☁️ synchronisées`}>🕓 Historique</SectionTitle>
      <Btn onClick={()=>{if(confirm("Vider l'historique ?"))clearAll();}} small danger>🗑 Vider</Btn>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      {history.map(h=>(<Card key={h.id} dark={dark}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
          <div style={{flex:1,marginRight:10}}><p style={{margin:"0 0 3px",fontSize:13,fontWeight:700,color:dark?"#e5e7eb":"#111"}}>{h.result.titre}</p><p style={{margin:0,fontSize:10,color:dark?"#555":"#9ca3af"}}>{h.date} · {h.result.marque} · {h.result.taille}</p></div>
          <div style={{display:"flex",gap:6}}>
            <Btn onClick={()=>{setResultToShow(h);setTab(0);}} small outline>↩</Btn>
            <Btn onClick={()=>delListing(h.id)} small danger>🗑</Btn>
          </div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[h.result.categorie,h.result.etat,`${h.result.prix_recommande}€`].map(tag=><span key={tag} style={{padding:"3px 9px",borderRadius:20,background:`${APP.c2}20`,color:APP.c2,fontSize:10,fontWeight:600}}>{tag}</span>)}
        </div>
      </Card>))}
    </div>
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [dark,setDark]=useState(true);
  const [tab,setTab]=useState(0);
  const [history,setHistory]=useState([]);
  const [stock,setStock]=useState([]);
  const [ventes,setVentes]=useState([]);
  const [resultToShow,setResultToShow]=useState(null);
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    const stored=loadSession();
    if(stored?.access_token&&stored?.user){
      try{
        const payload=JSON.parse(atob(stored.access_token.split(".")[1]));
        if(payload.exp*1000>Date.now()){ loadUserData(stored); return; }
        if(stored.refresh_token){
          supa.refreshToken(stored.refresh_token).then(data=>{
            if(data.access_token){ const ns={...stored,access_token:data.access_token,refresh_token:data.refresh_token}; saveSession(ns); loadUserData(ns); }
            else{ clearSession(); setLoading(false); }
          }).catch(()=>{ clearSession(); setLoading(false); });
          return;
        }
      }catch{ clearSession(); }
    }
    setLoading(false);
  },[]);

  const loadUserData=async(sess)=>{
    setSession(sess);
    try{ const prefs=await db.getPrefs(sess.user.id,sess.access_token); if(prefs)setDark(prefs.dark??true); }catch{}
    const migKey=`listai_migrated_${sess.user.id}`;
    if(!localStorage.getItem(migKey)){
      const count=await db.migrate(sess.user.id,sess.access_token);
      if(count>0){ setToast(`✓ ${count} données migrées vers le cloud !`); setTimeout(()=>setToast(null),3500); }
      localStorage.setItem(migKey,"1");
    }
    try{
      const [h,s,v]=await Promise.all([db.getListings(sess.user.id,sess.access_token),db.getStock(sess.user.id,sess.access_token),db.getVentes(sess.user.id,sess.access_token)]);
      setHistory(h.map(x=>({id:x.id,date:x.date,result:x.result})));
      setStock(s.map(x=>({...x,dateAjout:x.date_ajout,dateVente:x.date_vente})));
      setVentes(v);
    }catch{}
    setLoading(false);
  };

  const handleAuth=async(sess)=>{ await loadUserData(sess); };
  const signOut=()=>{ clearSession(); setSession(null); setHistory([]); setStock([]); setVentes([]); };
  const toggleDark=async()=>{ const nd=!dark; setDark(nd); if(session){ try{ await db.savePrefs(session.user.id,{dark:nd},session.access_token); }catch{} } };

  const bg=dark?"#0f0f1a":"#f4f4f6";

  if(loading)return(
    <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${APP.c2},#e8c584)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#1a1a2e",fontWeight:900}}>✦</div>
      <p style={{color:dark?"#555":"#9ca3af",fontSize:13}}>Chargement de ListAI Pro...</p>
    </div>
  );

  if(!session)return <AuthScreen onAuth={handleAuth} dark={dark}/>;

  const COMPONENTS=[
    <TabAnnonce dark={dark} session={session} history={history} setHistory={setHistory} resultToShow={resultToShow} setResultToShow={setResultToShow}/>,
    <TabTendances dark={dark}/>,
    <TabMarge dark={dark}/>,
    <TabAgent dark={dark} session={session} history={history} stock={stock}/>,
    <TabStock dark={dark} session={session} stock={stock} setStock={setStock} history={history}/>,
    <TabReponses dark={dark}/>,
    <TabReopt dark={dark}/>,
    <TabVentes dark={dark} session={session} ventes={ventes} setVentes={setVentes}/>,
    <TabHistorique dark={dark} session={session} history={history} setHistory={setHistory} setTab={setTab} setResultToShow={setResultToShow}/>,
  ];

  return(<div style={{fontFamily:"'Inter',-apple-system,sans-serif",minHeight:"100vh",background:bg,paddingBottom:80}}>
    <nav style={{background:dark?"#0a0a15":"white",borderBottom:`1px solid ${dark?"#1a1a2e":"#ebebeb"}`,padding:"0 16px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${APP.c2},#e8c584)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#1a1a2e",fontWeight:900}}>✦</div>
        <div><span style={{fontWeight:900,fontSize:15,color:dark?"#e5e7eb":"#111"}}>ListAI <span style={{color:APP.c2}}>Pro</span></span><span style={{fontSize:10,color:"#22c55e",fontWeight:700,marginLeft:6}}>☁️</span></div>
      </div>
      <div style={{display:"flex",gap:7,alignItems:"center"}}>
        <span style={{fontSize:10,color:dark?"#444":"#9ca3af",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session.user.email}</span>
        <button onClick={toggleDark} style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${dark?"#2a2a4e":"#e5e7eb"}`,background:"transparent",color:dark?"#aaa":"#555",fontSize:11,fontWeight:600,cursor:"pointer"}}>{dark?"☀️":"🌙"}</button>
        <button onClick={signOut} style={{padding:"5px 10px",borderRadius:20,border:"1px solid #ef444444",background:"transparent",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer"}}>Déco.</button>
      </div>
    </nav>

    <div style={{maxWidth:640,margin:"0 auto",padding:"20px 14px 100px"}}>
      {COMPONENTS[tab]}
    </div>

    <nav style={{position:"fixed",bottom:0,left:0,right:0,background:dark?"#0a0a15":"white",borderTop:`1px solid ${dark?"#1a1a2e":"#ebebeb"}`,display:"flex",overflowX:"auto",zIndex:100,scrollbarWidth:"none"}}>
      {TABS.map((t,i)=>(<button key={i} onClick={()=>setTab(i)} style={{flex:"0 0 auto",padding:"10px 14px",border:"none",borderTop:`2px solid ${tab===i?APP.c2:"transparent"}`,background:"transparent",color:tab===i?APP.c2:dark?"#555":"#9ca3af",fontSize:11,fontWeight:tab===i?800:500,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.2s"}}>{t}</button>))}
    </nav>

    {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
  </div>);
}
