"use client";
import {optimiseDishPhoto} from "@/lib/optimise-dish-photo";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {customerPriceCents} from "@/lib/customer-pricing";
import styles from "./editor.module.css";
type Translation={lang:string;name:string;description:string|null};
type Image={id:string;image_url:string;sort_order:number;position_x:number;position_y:number;zoom_percent:number;crop_mode:string};
type Vendor={id:string;display_name:string;slug:string;hero_image_url:string|null};
type Event={id:string;title_en:string;title_ru:string|null};
type Option={id:string;label_en:string;menu_item_option_values:{id:string;label_en:string;price_delta_cents:number;sort_order:number}[]};
type Dish={id:string;vendor_id:string|null;price_cents:number;approval_status:string;ingredients_text:string|null;ingredients_en:string|null;ingredients_ru:string|null;allergen_statement:string|null;cross_contact_statement:string|null;portion_label:string|null;allergen_review_complete:boolean;menu_item_translations:Translation[];menu_item_images:Image[]};
type Size={size:string;price:string};
export default function CustomerDishEditor({dish,isAdmin,options,vendors,events,initialEventId}:{dish:Dish;isAdmin:boolean;options:Option[];vendors:Vendor[];events:Event[];initialEventId:string}){
 const {lang}=useLanguage(),ru=lang==="ru",t=(en:string,russian:string)=>ru?russian:en;
 const router=useRouter();
 const en=dish.menu_item_translations.find(x=>x.lang==="en"),rus=dish.menu_item_translations.find(x=>x.lang==="ru");
 const [nameEn,setNameEn]=useState(en?.name??rus?.name??"");
 const [nameRu,setNameRu]=useState(rus?.name??en?.name??"");
 const [descriptionEn,setDescriptionEn]=useState(en?.description??"");
 const [descriptionRu,setDescriptionRu]=useState(rus?.description??"");
 const [chefId,setChefId]=useState(dish.vendor_id??"");
 const [eventId,setEventId]=useState(initialEventId);
 const initialGroup=options.find(g=>g.label_en==="Size"||g.label_en==="Weight");
 const [sizes,setSizes]=useState<Size[]>(()=>{
  const options=(initialGroup?.menu_item_option_values??[]).slice().sort((a,b)=>a.sort_order-b.sort_order);
  return options.length?options.map(x=>({size:x.label_en,price:((dish.price_cents+x.price_delta_cents)/100).toFixed(2)})):[{size:"",price:(dish.price_cents/100).toFixed(2)}];
 });
 const [ingredientsEn,setIngredientsEn]=useState(dish.ingredients_en??dish.ingredients_text??"");
 const [ingredientsRu,setIngredientsRu]=useState(dish.ingredients_ru??"");
 const [allergens,setAllergens]=useState(dish.allergen_statement??"");
 const [crossContact,setCrossContact]=useState(dish.cross_contact_statement??"");
 const [confirmed,setConfirmed]=useState(dish.allergen_review_complete??false);
 const [photos,setPhotos]=useState([...dish.menu_item_images].sort((a,b)=>a.sort_order-b.sort_order));
 const [active,setActive]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const canEdit=isAdmin||["draft","changes_requested"].includes(dish.approval_status);
 const chef=vendors.find(c=>c.id===chefId);
 function message(data:any){return String(data?.error??"Unable to save");}
 async function api(url:string,body:unknown){
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const result=await r.json();if(!r.ok)throw Error(message(result));return result;
 }
 async function done(draftOnly=false){
  if(!canEdit)return;
  setBusy(true);setError("");setNotice("");
  try{
   if(!nameEn.trim()||!nameRu.trim())throw Error(t("Enter both dish names.","Укажите название блюда на двух языках."));
   if(sizes.some(s=>!s.size.trim()||s.price.trim()===""||!Number.isFinite(Number(s.price))||Number(s.price)<0)||
     new Set(sizes.map(s=>s.size.trim().toLowerCase())).size!==sizes.length)
    throw Error(t("Enter a different size and valid price on each row.","Укажите разные размеры и правильные цены."));
   if(isAdmin&&chefId!==(dish.vendor_id??"")){
    await api("/api/admin/dishes/quick-finish",{dishId:dish.id,vendorId:chefId||null,action:"assign"});
   }
   const lowest=Math.min(...sizes.map(s=>Number(s.price)));
   const response=await fetch("/api/dishes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    id:dish.id,action:"edit",name:nameEn,description:descriptionEn,language:"en",
    nameEn,nameRu,descriptionEn,descriptionRu,price:String(lowest),
    ingredientsEn,ingredientsRu,ingredients:ingredientsEn,allergens,crossContact,portion:"",allergenConfirmed:confirmed
   })});
   const result=await response.json();if(!response.ok)throw Error(message(result));
   await api("/api/dishes/size-prices",{dishId:dish.id,sizes});
   if(isAdmin&&!draftOnly){
    await api("/api/admin/dishes/quick-finish",{dishId:dish.id,vendorId:chefId||null,eventId:eventId||null,action:"finish"});
   }
   router.push(isAdmin&&eventId?`/admin/events/${eventId}?tab=menu`:isAdmin?"/admin?tab=food":"/chef-dashboard?tab=dishes");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save");setNotice(t("Your editor is still open so you can correct the issue.","Редактор открыт, чтобы вы могли исправить проблему."))}
  finally{setBusy(false)}
 }
 async function upload(files:FileList|null){
  if(!files?.length)return;
  if(photos.length+files.length>3){setError(t("Maximum 3 photos.","Не более трёх фото."));return}
  setBusy(true);setError("");
  const db=createSupabaseBrowserClient();
  for(const file of Array.from(files)){
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
    setError(t("Use JPG, PNG or WebP under 5 MB.","Используйте JPG, PNG или WebP до 5 МБ."));break;
   }
   const optimised=await optimiseDishPhoto(file);
   const ext="webp";
   const key=`${dish.id}/${crypto.randomUUID()}.${ext}`;
   const {error:up}=await db.storage.from("dish-photos").upload(key,optimised,{contentType:optimised.type,upsert:false});
   if(up){setError(up.message);break}
   const url=db.storage.from("dish-photos").getPublicUrl(key).data.publicUrl;
   const {data:photo,error:save}=await db.from("menu_item_images").insert({menu_item_id:dish.id,image_url:url,sort_order:photos.length}).select("id,image_url,sort_order,position_x,position_y,zoom_percent,crop_mode").single();
   if(save){setError(save.message);await db.storage.from("dish-photos").remove([key]);break}
   setPhotos(old=>[...old,photo]);
  }
  setBusy(false);
 }
 async function savePosition(axis:"position_x"|"position_y"|"zoom_percent"|"crop_mode",value:number|string){
  const current=photos[active];if(!current||!canEdit)return;
  setPhotos(old=>old.map(p=>p.id===current.id?{...p,[axis]:value}:p));
  const db=createSupabaseBrowserClient();
  const {error}=await db.from("menu_item_images").update({[axis]:value}).eq("id",current.id);
  if(error)setError(error.message);
 }
 async function removePhoto(id:string){
  const photo=photos.find(p=>p.id===id);if(!photo)return;
  setBusy(true);setError("");
  const db=createSupabaseBrowserClient();const {error}=await db.from("menu_item_images").delete().eq("id",id);
  if(error)setError(error.message);
  else{
   const path=decodeURIComponent(new URL(photo.image_url).pathname.split("/dish-photos/")[1]??"");
   if(path)await db.storage.from("dish-photos").remove([path]);
   setPhotos(prev=>prev.filter(p=>p.id!==id));setActive(0);
  }
  setBusy(false);
 }
 return <main className={styles.page}><div className={styles.wrap}>
  <div className={styles.top}><Link href={isAdmin?eventId?`/admin/events/${eventId}?tab=menu`:"/admin?tab=food":"/chef-dashboard?tab=dishes"}>← {t("Dishes","Блюда")}</Link>
   <span>{t("Edit dish","Редактирование блюда")}</span>
   <button className={styles.doneButton} type="button" disabled={busy||!canEdit} onClick={()=>void done(false)}>{busy?t("Saving…","Сохраняем…"):t("✓ Done","✓ Готово")}</button>
  </div>
  <div className={styles.product}>
   <section className={styles.gallery}><div className={styles.heroPhoto}>{photos.length?<img src={photos[Math.min(active,photos.length-1)].image_url} style={{objectFit:photos[Math.min(active,photos.length-1)].crop_mode==="contain"?"contain":"cover",objectPosition:`${photos[Math.min(active,photos.length-1)].position_x??50}% ${photos[Math.min(active,photos.length-1)].position_y??50}%`,transform:`translate(${(50-(photos[Math.min(active,photos.length-1)].position_x??50))*0.5}%, ${(50-(photos[Math.min(active,photos.length-1)].position_y??50))*0.5}%) scale(${(photos[Math.min(active,photos.length-1)].zoom_percent??100)/100})`,transformOrigin:"center center"}} alt={ru?nameRu:nameEn}/>:<div className={styles.placeholder}>✿<small>{t("Add a dish photo","Добавьте фото блюда")}</small></div>}</div>
    <div className={styles.thumbs}>{photos.map((p,i)=><div key={p.id} className={styles.thumb}><button type="button" className={styles.thumbPhoto} onClick={()=>setActive(i)}><img src={p.image_url} alt={`Photo ${i+1}`}/></button>{canEdit&&<button type="button" className={styles.remove} disabled={busy} onClick={()=>void removePhoto(p.id)}>×</button>}</div>)}{canEdit&&photos.length<3&&<label className={styles.addPhoto}>＋<small>{t("Photo","Фото")}</small><input hidden multiple type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files);e.target.value=""}}/></label>}</div>
    {canEdit&&photos[active]&&<div style={{padding:13,background:"#fff",border:"1px solid #ddc6b8",borderRadius:10,marginTop:12}}>
    <strong>{t("Photo framing","Кадрирование фото")}</strong>
    <p className={styles.hint}>{t("Move the visible centre of this image. Changes save automatically.","Переместите центр фотографии. Изменения сохраняются автоматически.")}</p>
    {(["position_x","position_y"] as const).map(axis=><label key={axis} style={{display:"grid",gap:5,marginTop:10}}>
    {axis==="position_x"?t("Horizontal position","По горизонтали"):t("Vertical position","По вертикали")} · {photos[active][axis]??50}%
    <input type="range" min="0" max="100" step="1" value={photos[active][axis]??50} onChange={e=>void savePosition(axis,Number(e.target.value))}/>
    </label>)}
    <label style={{display:"grid",gap:6,marginTop:12}}>{t("Zoom","Масштаб")} · {photos[active].zoom_percent??100}%
     <input type="range" min="100" max="300" step="5" value={photos[active].zoom_percent??100} onChange={e=>void savePosition("zoom_percent",Number(e.target.value))}/>
    </label>
    <label style={{display:"grid",gap:6,marginTop:12}}>{t("Crop mode","Режим кадрирования")}
      <select value={photos[active].crop_mode??"cover"} onChange={e=>void savePosition("crop_mode",e.target.value)}>
      <option value="cover">{t("Fill frame (crop edges)","Заполнить кадр (обрезать края)")}</option>
      <option value="contain">{t("Show whole photo","Показать всё фото")}</option></select>
    </label>
    <button type="button" onClick={()=>{void savePosition("position_x",50);void savePosition("position_y",50);void savePosition("zoom_percent",100);void savePosition("crop_mode","cover")}}>{t("Reset to centre","По центру")}</button>
   </div>}
    <p className={styles.hint}>{t("Up to 3 photos, automatically optimised.","До 3 фотографий с автоматической оптимизацией.")}</p>
   </section>
   <section className={styles.details}>
    <div className={styles.chef}>
      {chef?.hero_image_url?<img className={styles.avatar} src={chef.hero_image_url} alt={chef.display_name}/>:<span className={styles.avatar}>{(chef?.display_name??"M")[0]}</span>}
      {isAdmin?<label className={styles.chefSelect}>{t("Chef","Повар")}<select value={chefId} onChange={e=>setChefId(e.target.value)} disabled={busy}><option value="">{t("Assign chef","Назначить повара")}</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.display_name}</option>)}</select></label>:<strong>{chef?.display_name??t("Chef","Повар")}</strong>}
      <span className={styles.status}>{dish.approval_status==="approved"?t("Approved","Одобрено"):t("Draft","Черновик")}</span>
    </div>
    {isAdmin&&<label className={styles.compactLabel}>{t("Add to event when done","Добавить к событию")}<select value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">{t("No event selected","Событие не выбрано")}</option>{events.map(e=><option key={e.id} value={e.id}>{ru?e.title_ru||e.title_en:e.title_en}</option>)}</select></label>}
    <div className={styles.languageGrid}>
     <label className={styles.compactLabel}>{t("English name","Название на английском")}<input disabled={!canEdit} maxLength={160} value={nameEn} onChange={e=>setNameEn(e.target.value)}/></label>
     <label className={styles.compactLabel}>{t("Russian name","Название на русском")}<input disabled={!canEdit} maxLength={160} value={nameRu} onChange={e=>setNameRu(e.target.value)}/></label>
     <label className={styles.compactLabel}>{t("English Description","Описание на английском")}<textarea disabled={!canEdit} rows={3} value={descriptionEn} onChange={e=>setDescriptionEn(e.target.value)}/></label>
     <label className={styles.compactLabel}>{t("Russian Description","Описание на русском")}<textarea disabled={!canEdit} rows={3} value={descriptionRu} onChange={e=>setDescriptionRu(e.target.value)}/></label>
    </div>
    <section className={styles.sizes}><h2>{t("Size and price","Размер и цена")}</h2><div className={styles.sizesHeader}><span>{t("Size (e.g. 300g, 1kg)","Размер (300 г, 1 кг)")}</span><span>{t("Price (NZD)","Цена (NZD)")}</span></div>
      {sizes.map((s,i)=><div key={i} className={styles.sizeRow}><input aria-label={t("Size","Размер")} disabled={!canEdit} placeholder="300g / 1kg" maxLength={45} value={s.size} onChange={e=>setSizes(old=>old.map((p,j)=>j===i?{...p,size:e.target.value}:p))}/><input aria-label={t("Price NZD","Цена NZD")} disabled={!canEdit} type="number" min="0" step=".01" placeholder="0.00" value={s.price} onChange={e=>setSizes(old=>old.map((p,j)=>j===i?{...p,price:e.target.value}:p))}/><button type="button" disabled={!canEdit||sizes.length===1} onClick={()=>setSizes(old=>old.filter((_,j)=>j!==i))} aria-label={t("Remove","Удалить")}>×</button><small style={{gridColumn:"1 / -1",fontSize:12,color:"#2d6840",fontWeight:750,marginBottom:5}}>{t("Customer sees","Покупатель видит")} {s.price!==""&&Number.isFinite(Number(s.price))?new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD"}).format(customerPriceCents(Math.round(Number(s.price)*100))/100):"—"} (+10%)</small></div>)}
      {canEdit&&<button type="button" className={styles.addSize} disabled={sizes.length>=12} onClick={()=>setSizes(old=>[...old,{size:"",price:""}])}>＋ {t("Add size","Добавить размер")}</button>}
    </section>
    <section className={styles.safetyEditor}><h2>{t("Ingredients","Состав")}</h2>
     <div className={styles.safetyGrid}>
      <label>Ingredients English<textarea rows={3} disabled={!canEdit} value={ingredientsEn} onChange={e=>{setIngredientsEn(e.target.value);setConfirmed(false)}}/></label>
      <label>Ингредиенты на русском<textarea rows={3} disabled={!canEdit} value={ingredientsRu} onChange={e=>{setIngredientsRu(e.target.value);setConfirmed(false)}}/></label>
     </div>
     <p className={styles.hint}>{t("List all ingredients and clearly identify ingredients that may cause allergies.","Укажите все ингредиенты, включая те, которые могут вызвать аллергию.")}</p>
     <label className={styles.safetyCheck}><input type="checkbox" disabled={!canEdit} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t("I have checked that both ingredient lists are complete and accurate.","Я проверил(а), что оба списка ингредиентов полные и точные.")}</label>
    </section>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.success}>{notice}</p>}
    <div className={styles.editActions}>
      {canEdit&&<button type="button" className={styles.saveDraft} disabled={busy} onClick={()=>void done(true)}>{t("Save draft","Сохранить черновик")}</button>}
      {canEdit&&<button type="button" className={styles.submitApproval} disabled={busy} onClick={()=>void done(false)}>{busy?t("Saving…","Сохраняем…"):isAdmin?t("✓ Done · Approve","✓ Готово · Одобрить"):t("✓ Done","✓ Готово")}</button>}
    </div>
   </section>
  </div>
 </div></main>;
}
