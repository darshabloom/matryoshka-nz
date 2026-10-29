"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {customerPriceCents} from "@/lib/customer-pricing";
import styles from "../[id]/editor.module.css";
type Vendor={id:string;display_name:string;hero_image_url:string|null};
type Event={id:string;title_en:string;title_ru:string|null};
type Size={size:string;price:string};
export default function NewDishEditor({vendors,events,initialChefId,initialEventId}:{vendors:Vendor[];events:Event[];initialChefId:string;initialEventId:string}){
 const {lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a;
 const [chefId,setChefId]=useState(initialChefId),[eventId,setEventId]=useState(initialEventId);
 const [nameEn,setNameEn]=useState(""),[nameRu,setNameRu]=useState("");
 const [descriptionEn,setDescriptionEn]=useState(""),[descriptionRu,setDescriptionRu]=useState("");
 const [sizes,setSizes]=useState<Size[]>([{size:"",price:""}]);
 const [ingredients,setIngredients]=useState(""),[allergens,setAllergens]=useState(""),[crossContact,setCrossContact]=useState(""),[confirmed,setConfirmed]=useState(false);
 const [photos,setPhotos]=useState<File[]>([]),[createdId,setCreatedId]=useState("");
 const [preview,setPreview]=useState("");
 useEffect(()=>{if(!photos[0]){setPreview("");return};const url=URL.createObjectURL(photos[0]);setPreview(url);return()=>URL.revokeObjectURL(url)},[photos]);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const chef=vendors.find(v=>v.id===chefId);
 async function api(url:string,method:"POST"|"PATCH",body:object){
  const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to save");return d;
 }
 async function save(draftOnly=false){
  setError("");setBusy(true);
  try{
   if(!nameEn.trim()||!nameRu.trim())throw Error(t("Enter both English and Russian dish names.","Укажите название блюда на английском и русском."));
   if(!sizes.length||sizes.some(s=>!s.size.trim()||s.price.trim()===""||!Number.isFinite(Number(s.price))||Number(s.price)<0)||new Set(sizes.map(s=>s.size.trim().toLowerCase())).size!==sizes.length)
    throw Error(t("Enter unique sizes and valid prices.","Укажите уникальные размеры и правильные цены."));

   const price=Math.min(...sizes.map(s=>Number(s.price)));
   let id=createdId;
   if(!id){
    const created=await api("/api/dishes","POST",{name:nameEn,description:descriptionEn,language:"en",price:String(price),vendor_id:chefId||null});
    id=created.id;setCreatedId(id);
   }
   await api("/api/dishes","PATCH",{id,action:"edit",name:nameEn,description:descriptionEn,language:"en",nameEn,nameRu,descriptionEn,descriptionRu,price:String(price),ingredients,allergens,crossContact,portion:"",allergenConfirmed:confirmed});
   await api("/api/dishes/size-prices","POST",{dishId:id,sizes});
   const sb=createSupabaseBrowserClient();
   for(let i=0;i<photos.length;i++){
    const file=photos[i];
    const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    const key=`${id}/${crypto.randomUUID()}.${ext}`;
    const {error:uploadError}=await sb.storage.from("dish-photos").upload(key,file,{contentType:file.type,upsert:false});
    if(uploadError)throw Error(uploadError.message);
    const url=sb.storage.from("dish-photos").getPublicUrl(key).data.publicUrl;
    const {error:saveError}=await sb.from("menu_item_images").insert({menu_item_id:id,image_url:url,sort_order:i});
    if(saveError)throw Error(saveError.message);
   }
   setPhotos([]);
   if(!draftOnly)await api("/api/admin/dishes/quick-finish","POST",{dishId:id,vendorId:chefId||null,eventId:eventId||null,action:"finish"});
   window.location.assign(draftOnly?`/dishes/${id}`:eventId?`/admin/events/${eventId}?tab=menu`:"/admin?tab=food");
  }catch(e){setError(e instanceof Error?e.message:"Unable to save dish");setBusy(false)}
 }
 const label=(name:string,child:React.ReactNode)=><label className={styles.compactLabel}>{name}{child}</label>;
 return <main className={styles.page}><div className={styles.wrap}>
  <div className={styles.top}><Link href={eventId?`/admin/events/${eventId}?tab=menu`:"/admin?tab=food"}>← {t("Dishes","Блюда")}</Link><strong>{t("New dish","Новое блюдо")}</strong><button type="button" className={styles.doneButton} onClick={()=>void save(false)} disabled={busy}>{busy?t("Saving…","Сохраняем…"):t("✓ Done","✓ Готово")}</button></div>
  <div className={styles.product}><section className={styles.gallery}>
   <div className={styles.heroPhoto}>{preview?<img src={preview} alt={t("Dish photo","Фото блюда")}/>:<div className={styles.placeholder}>✿<small>{t("Dish photo","Фото блюда")}</small></div>}</div>
   <label className={styles.addPhoto} style={{width:"100%",height:65,marginTop:10}}>＋ {t("Choose photos","Выбрать фото")}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>{const files=Array.from(e.target.files??[]).filter(f=>f.size<=5242880&&["image/jpeg","image/png","image/webp"].includes(f.type)).slice(0,3);setPhotos(files)}}/></label>
   <p className={styles.hint}>{t("Up to 3 JPG, PNG or WebP photos, 5 MB each.","До 3 фото JPG, PNG или WebP, по 5 МБ.")}</p>
  </section><section className={styles.details}>
   <div className={styles.chef}>{chef?.hero_image_url?<img className={styles.avatar} alt={chef.display_name} src={chef.hero_image_url}/>:<span className={styles.avatar}>{(chef?.display_name??"M")[0]}</span>}
    {label(t("Chef","Повар"),<select value={chefId} onChange={e=>setChefId(e.target.value)}><option value="">{t("Assign chef","Назначить повара")}</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.display_name}</option>)}</select>)}
    {label(t("Event","Событие"),<select value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">{t("No event selected","Без события")}</option>{events.map(e=><option key={e.id} value={e.id}>{ru?e.title_ru||e.title_en:e.title_en}</option>)}</select>)}
   </div>
   <div className={styles.languageGrid}>
    {label(t("English name","Название на английском"),<input maxLength={160} value={nameEn} onChange={e=>setNameEn(e.target.value)}/>)}
    {label(t("Russian name","Название на русском"),<input maxLength={160} value={nameRu} onChange={e=>setNameRu(e.target.value)}/>)}
    {label(t("English Description","Описание на английском"),<textarea rows={3} value={descriptionEn} onChange={e=>setDescriptionEn(e.target.value)}/>)}
    {label(t("Russian Description","Описание на русском"),<textarea rows={3} value={descriptionRu} onChange={e=>setDescriptionRu(e.target.value)}/>)}
   </div>
   <section className={styles.sizes}><h2>{t("Size and price","Размер и цена")}</h2><div className={styles.sizesHeader}><span>{t("Size (e.g. 300g, 1kg)","Размер (300 г, 1 кг)")}</span><span>{t("Price (NZD)","Цена (NZD)")}</span></div>
    {sizes.map((row,i)=><div key={i} className={styles.sizeRow}><input aria-label={t("Size","Размер")} placeholder="300g / 1kg" value={row.size} onChange={e=>setSizes(v=>v.map((x,j)=>j===i?{...x,size:e.target.value}:x))}/><input aria-label={t("Price","Цена")} type="number" min="0" step=".01" placeholder="0.00" value={row.price} onChange={e=>setSizes(v=>v.map((x,j)=>j===i?{...x,price:e.target.value}:x))}/><button type="button" disabled={sizes.length===1} onClick={()=>setSizes(v=>v.filter((_,j)=>j!==i))}>×</button><small style={{gridColumn:"1 / -1",fontSize:12,color:"#2d6840",fontWeight:750,marginBottom:5}}>{t("Customer sees","Покупатель видит")} {row.price!==""&&Number.isFinite(Number(row.price))?new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD"}).format(customerPriceCents(Math.round(Number(row.price)*100))/100):"—"} (+10%)</small></div>)}
    <button type="button" className={styles.addSize} disabled={sizes.length>=12} onClick={()=>setSizes(v=>[...v,{size:"",price:""}])}>＋ {t("Add size","Добавить размер")}</button>
   </section>
   <section className={styles.safetyEditor}><h2>{t("Ingredients & allergens","Состав и аллергены")}</h2><div className={styles.safetyGrid}>
    <label>{t("Ingredients","Состав")}<textarea rows={2} value={ingredients} onChange={e=>{setIngredients(e.target.value);setConfirmed(false)}}/></label>
    <label>{t("Allergens (or explicitly none)","Аллергены (или явно нет)")}<textarea rows={2} value={allergens} onChange={e=>{setAllergens(e.target.value);setConfirmed(false)}}/></label>
   </div><label>{t("Cross-contact information","Перекрёстный контакт")}<input value={crossContact} onChange={e=>{setCrossContact(e.target.value);setConfirmed(false)}}/></label>
   <label className={styles.safetyCheck}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t("I confirm that the food-safety information is accurate.","Подтверждаю точность сведений о составе и аллергенах.")}</label></section>
   {error&&<p role="alert" className={styles.error}>{error}{createdId&&<> · <Link href={`/dishes/${createdId}`}>{t("Open saved draft","Открыть сохранённый черновик")}</Link></>}</p>}
   <div className={styles.editActions}><button type="button" disabled={busy} className={styles.saveDraft} onClick={()=>void save(true)}>{t("Save draft","Сохранить черновик")}</button><button type="button" disabled={busy} className={styles.submitApproval} onClick={()=>void save(false)}>{busy?t("Saving…","Сохраняем…"):t("✓ Done · Approve","✓ Готово · Одобрить")}</button></div>
  </section></div>
 </div></main>;
}
