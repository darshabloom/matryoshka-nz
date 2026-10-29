"use client";
import {useState,useEffect} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./dishes.module.css";
type Chef={id:string;display_name:string};
type Dish={id:string;vendor_id:string|null;price_cents:number;approval_status:string;review_note:string|null;menu_item_translations:{lang:string;name:string;description:string|null}[]};
type Event={id:string;title_en:string;title_ru:string|null;starts_at:string};
type Inclusion={event_id:string;menu_item_id:string};
export default function DishManager({isAdmin,vendors,dishes:initial,events,inclusions:initialInclusions,initialError,embedded=false}:{isAdmin:boolean;embedded?:boolean;vendors:Chef[];dishes:Dish[];events:Event[];inclusions:Inclusion[];initialError:string}){
 const {lang}=useLanguage(),ru=lang==="ru";const searchParams=useSearchParams();
 const t=(en:string,r:string)=>ru?r:en;
 const [dishes,setDishes]=useState(initial),[inclusions,setInclusions]=useState(initialInclusions);
 const [selection,setSelection]=useState(false),[selected,setSelected]=useState<string[]>([]);
 const [event,setEvent]=useState(searchParams.get("event")??""),[vendor,setVendor]=useState(isAdmin?"":vendors[0]?.id??"");
 const [name,setName]=useState(""),[description,setDescription]=useState(""),[language,setLanguage]=useState<"en"|"ru">(ru?"ru":"en"),[price,setPrice]=useState("");
 const [editing,setEditing]=useState<string|null>(null);const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(initialError),[notice,setNotice]=useState("");
 const displayName=(d:Dish)=>d.menu_item_translations.find(x=>x.lang===lang)?.name||d.menu_item_translations[0]?.name||t("Unnamed dish","Блюдо без названия");
 const included=(id:string)=>inclusions.some(x=>x.menu_item_id===id&&x.event_id===event);
 const visible=(isAdmin&&vendor?dishes.filter(d=>vendor==="unassigned"?!d.vendor_id:d.vendor_id===vendor):dishes).filter(d=>!event||inclusions.some(x=>x.event_id===event&&x.menu_item_id===d.id));
 const chefName=(id:string|null)=>id?(vendors.find(v=>v.id===id)?.display_name||"Chef"):"Unassigned · Matryoshka";
 const eventTags=(id:string)=>events.filter(e=>inclusions.some(x=>x.event_id===e.id&&x.menu_item_id===id));
 async function request(url:string,body:object){
  setBusy(true);setError("");setNotice("");
  try{const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await response.json();
   if(!response.ok||response.status===207)throw Error(result.error??"Could not save");
   return true;
  }catch(e){setError(e instanceof Error?e.message:"Could not save");return false}finally{setBusy(false)}
 }
 function edit(d:Dish){setEditing(d.id);const tr=d.menu_item_translations.find(x=>x.lang===lang)||d.menu_item_translations[0];setName(tr?.name||"");setDescription(tr?.description||"");setLanguage(tr?.lang==="ru"?"ru":"en");setPrice((d.price_cents/100).toFixed(2));setVendor(d.vendor_id??"");setOpen(true);}
 function beginNew(){setEditing(null);setName("");setDescription("");setPrice("");setOpen(true);}
 async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");
  try{
   const response=await fetch("/api/dishes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({vendor_id:isAdmin?null:vendor,name,description,language,price})});
   const result=await response.json();if(!response.ok||!result.id)throw Error(result.error||"Could not create dish");
   window.location.assign(`/dishes/${result.id}`);
  }catch(e){setError(e instanceof Error?e.message:"Could not create dish");setBusy(false)}
 }
 async function review(d:Dish,status:"approved"|"changes_requested"){
  const note=status==="changes_requested"?window.prompt(t("What should the chef change?","Что повару нужно изменить?")):"";
  if(status==="changes_requested"&&!note)return;
  setBusy(true);setError("");
  try{const r=await fetch("/api/dishes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:d.id,action:"review",status,note})});const x=await r.json();if(!r.ok)throw Error(x.error);setDishes(rows=>rows.map(a=>a.id===d.id?{...a,approval_status:status}:a));}
  catch(e){setError(e instanceof Error?e.message:"Review failed")}finally{setBusy(false)}
 }
 async function submit(d:Dish){
  setBusy(true);setError("");
  try{const r=await fetch("/api/dishes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:d.id,action:"submit"})});const x=await r.json();if(!r.ok)throw Error(x.error);setDishes(rows=>rows.map(a=>a.id===d.id?{...a,approval_status:"pending"}:a));}
  catch(e){setError(e instanceof Error?e.message:"Submission failed")}finally{setBusy(false)}
 }
 async function bulk(action:"include"|"remove"){
  if(!event||selected.length===0)return;
  const ok=await request("/api/dishes/events",{event_id:event,ids:selected,action});
  if(ok){setInclusions(rows=>action==="include"?[...rows.filter(x=>!(x.event_id===event&&selected.includes(x.menu_item_id))),...selected.map(id=>({event_id:event,menu_item_id:id}))]:rows.filter(x=>!(x.event_id===event&&selected.includes(x.menu_item_id))));setSelected([]);setSelection(false);setNotice(action==="include"?t("Dishes included in event.","Блюда добавлены к событию."):t("Dishes removed from event.","Блюда убраны из события."))}
 }
 return <main className={embedded?styles.embedded:styles.page}><div className={styles.wrap}>
 {!embedded&&<Link href={isAdmin?"/admin":"/chef-dashboard"} className={styles.back}>← {t("Back to dashboard","Назад в кабинет")}</Link>}
 <div className={styles.hero}><div>{!embedded&&<span className={styles.eyebrow}>MATRYOSHKA · {isAdmin?"ADMIN":"CHEF"}</span>}{!embedded&&<h1>{isAdmin?t("Food & Menus","Блюда и меню"):t("My Dishes","Мои блюда")}</h1>}<p>{t("Create dishes once, assign chefs when ready and include them in events.","Создавайте блюда один раз и выбирайте, на каких событиях их предлагать.")}</p></div><button className={styles.mainButton} onClick={()=>window.location.assign("/dishes/new"+(event||isAdmin&&vendor&&vendor!=="unassigned"?"?"+[event&&"event="+encodeURIComponent(event),isAdmin&&vendor&&vendor!=="unassigned"&&"chef="+encodeURIComponent(vendor)].filter(Boolean).join("&"):""))}>＋ {t("Add a dish","Добавить блюдо")}</button></div>
 <div className={styles.toolbar}>{isAdmin&&<label>{t("Chef","Повар")}<select value={vendor} onChange={e=>{setVendor(e.target.value);setSelected([])}}><option value="">{t("All chefs","Все повара")}</option><option value="unassigned">{t("Unassigned dishes","Блюда без повара")}</option>{vendors.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label>}
 <label>{t("Viewing event","Событие")}<select value={event} onChange={e=>{setEvent(e.target.value);setSelected([])}}><option value="">{t("All dishes","Все блюда")}</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ru?(ev.title_ru||ev.title_en):ev.title_en}</option>)}</select></label>
 <button className={selection?styles.cancelButton:styles.selectButton} onClick={()=>{setSelection(v=>!v);setSelected([])}}>{selection?t("Cancel selection","Отмена"):t("◯ Select dishes","◯ Выбрать блюда")}</button></div>
 {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
 {visible.length===0?<div className={styles.empty}><span>✿</span><h2>{t("Your menu starts here","Ваше меню начинается здесь")}</h2><p>{t("Add your first dish to build your reusable food catalogue.","Добавьте первое блюдо в каталог.")}</p><button className={styles.mainButton} onClick={()=>window.location.assign("/dishes/new")}>{t("Create a dish","Создать блюдо")}</button></div>:<div className={styles.cards}>{visible.map(d=><article key={d.id} className={styles.dish}>
 <div className={styles.dishTop}><span className={styles.flower}>✿</span>{selection&&<label className={styles.circle}><input aria-label={t("Select dish","Выбрать блюдо")+" "+displayName(d)} type="checkbox" checked={selected.includes(d.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,d.id]:old.filter(x=>x!==d.id))}/></label>}</div>
 <div className={styles.dishBody}><div className={styles.labels}>{eventTags(d.id).map(ev=><span key={ev.id} className={styles.included}>✿ {ru?(ev.title_ru||ev.title_en):ev.title_en}</span>)}{event&&<span className={included(d.id)?styles.included:styles.notIncluded}>{included(d.id)?t("✓ Included in event","✓ Включено в событие"):t("Not included","Не включено")}</span>}<span className={d.approval_status==="approved"?styles.approved:styles.pending}>{d.approval_status==="approved"?t("Approved for sale","Одобрено к продаже"):d.approval_status==="pending"?t("Awaiting approval","Ожидает одобрения"):d.approval_status==="changes_requested"?t("Changes requested","Нужны изменения"):t("Draft","Черновик")}</span></div>
 {isAdmin&&<p className={styles.chefLabel}><span className={styles.chefAvatar}>{chefName(d.vendor_id).slice(0,1).toUpperCase()}</span>{chefName(d.vendor_id)}</p>}<h3>{displayName(d)}</h3><p className={styles.price}>NZ$ {(d.price_cents/100).toFixed(2)}</p>
 <p className={styles.description}>{d.menu_item_translations.find(x=>x.lang===lang)?.description||d.menu_item_translations[0]?.description}</p>
 <div className={styles.actions}>{(isAdmin||["draft","changes_requested"].includes(d.approval_status))&&<button disabled={busy} onClick={()=>window.location.assign(`/dishes/${d.id}${event?"?event="+encodeURIComponent(event):""}`)}>{isAdmin?t("Edit & finish","Редактировать и завершить"):t("Edit dish","Редактировать")}</button>}</div>
 </div></article>)}</div>}
 {selection&&<div className={styles.bulk}><strong>{selected.length} {t("selected","выбрано")}</strong><button disabled={!selected.length} className={styles.cancelButton} onClick={()=>setSelected(visible.map(d=>d.id))}>{t("Select all","Выбрать всё")}</button><button disabled={!selected.length||!event||busy} className={styles.mainButton} onClick={()=>void bulk("include")}>{t("Include in event","Добавить к событию")}</button><button disabled={!selected.length||!event||busy} className={styles.cancelButton} onClick={()=>void bulk("remove")}>{t("Remove from event","Убрать из события")}</button></div>}
 {open&&<div className={styles.overlay}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="create-dish"><div className={styles.dialogHeader}><h2 id="create-dish">{editing?t("Edit dish","Редактировать блюдо"):t("Add a dish","Добавить блюдо")}</h2><button onClick={()=>setOpen(false)} aria-label="Close">×</button></div>
 <form onSubmit={create} className={styles.form}><label>{t("Dish name","Название блюда")}<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label><label>{t("Writing language","Язык описания")}<select value={language} onChange={e=>setLanguage(e.target.value as "en"|"ru")}><option value="en">English</option><option value="ru">Русский</option></select></label><label>{t("Description","Описание")}<textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>{t("Price (NZD)","Цена (NZD)")}<input required type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><p>{t("Chefs save drafts and submit them to Marina for approval. Marina can create dishes without a chef, then assign them after the chef joins. The chef must accept before the dish can be approved.","Повар сохраняет черновик и отправляет его Марине на одобрение.")}</p><button disabled={busy||(!isAdmin&&!vendor)} className={styles.mainButton}>{busy?t("Saving…","Сохранение…"):t(editing?"Save changes":"Save dish",editing?"Сохранить изменения":"Сохранить блюдо")}</button></form>
 </div></div>}
 </div></main>;
}