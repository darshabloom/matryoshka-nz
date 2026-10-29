"use client";
import DishOptionEditor from "./DishOptionEditor";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./editor.module.css";
type Dish={id:string;vendor_id:string;price_cents:number;approval_status:string;ingredients_text:string;allergen_statement:string;cross_contact_statement:string;portion_label:string;allergen_review_complete:boolean;vendors:{display_name:string}|null;menu_item_translations:{lang:string;name:string;description:string|null}[];menu_item_images:{id:string;image_url:string;sort_order:number}[]};
export default function CustomerDishEditor({dish,isAdmin,assignmentControl,options}:{dish:Dish;isAdmin:boolean;assignmentControl?:React.ReactNode;options:any[]}){
 const {lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a,router=useRouter();
 const original=dish.menu_item_translations.find(x=>x.lang===lang)||dish.menu_item_translations[0];
 const [name,setName]=useState(original?.name||""),[description,setDescription]=useState(original?.description||""),[language,setLanguage]=useState<"en"|"ru">(original?.lang==="ru"?"ru":"en"),[price,setPrice]=useState((dish.price_cents/100).toFixed(2));
 const [ingredients,setIngredients]=useState(dish.ingredients_text??"");
 const [allergens,setAllergens]=useState(dish.allergen_statement??"");
 const [crossContact,setCrossContact]=useState(dish.cross_contact_statement??"");
 const [portion,setPortion]=useState(dish.portion_label??"");
 const [allergenConfirmed,setAllergenConfirmed]=useState(dish.allergen_review_complete??false);
 const [photos,setPhotos]=useState([...dish.menu_item_images].sort((a,b)=>a.sort_order-b.sort_order));
 const [active,setActive]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [status,setStatus]=useState(dish.approval_status);
 const canEdit=isAdmin||["draft","changes_requested"].includes(status);
 const weightOption=options.find((o:any)=>o.label_en==="Weight"&&o.required&&o.max_select===1);
 const weightValues=(weightOption?.menu_item_option_values??[]).slice().sort((a:any,b:any)=>a.sort_order-b.sort_order);
 const [selectedWeight,setSelectedWeight]=useState<string>("");
 const chosenWeight=weightValues.find((v:any)=>v.id===selectedWeight)??weightValues[0];
 const currentPrice=Number(price||0)+(chosenWeight?.price_delta_cents??0)/100;
 async function save(){
  setBusy(true);setError("");setNotice("");
  try{const response=await fetch("/api/dishes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:dish.id,action:"edit",name,description,language,price,ingredients,allergens,crossContact,portion,allergenConfirmed})});const result=await response.json();if(!response.ok)throw Error(result.error||"Unable to save");
   setNotice(t("Changes saved.","Изменения сохранены."));router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save")}finally{setBusy(false)}
 }
 async function submitForApproval(){
  if(!ingredients.trim()||!allergens.trim()||!allergenConfirmed){setError(t("Complete ingredients, allergen statement and confirmation before submitting.","Заполните состав, информацию об аллергенах и подтвердите её."));return;}
  setBusy(true);setError("");setNotice("");
  try{
   const saved=await fetch("/api/dishes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:dish.id,action:"edit",name,description,language,price,ingredients,allergens,crossContact,portion,allergenConfirmed})});
   const sr=await saved.json();if(!saved.ok)throw Error(sr.error||"Could not save your changes");
   const response=await fetch("/api/dishes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:dish.id,action:"submit"})});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Unable to submit");
   setStatus("pending");setNotice(t("Submitted! Marina can now review your dish.","Отправлено! Марина может рассмотреть блюдо."));router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to submit")}finally{setBusy(false)}
 }
 async function upload(files:FileList|null){
  if(!files?.length)return;
  if(photos.length+files.length>3){setError(t("Maximum three photos per dish.","Не более трёх фотографий блюда."));return}
  setBusy(true);setError("");
  const sb=createSupabaseBrowserClient();
  for(const file of Array.from(files)){
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5242880){setError(t("Use JPG, PNG or WebP images under 5 MB.","Только JPG, PNG или WebP до 5 МБ."));break}
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const key=`${dish.id}/${crypto.randomUUID()}.${ext}`;
   const {error:uploadError}=await sb.storage.from("dish-photos").upload(key,file,{contentType:file.type,upsert:false});
   if(uploadError){setError(uploadError.message);break}
   const {data:publicUrl}=sb.storage.from("dish-photos").getPublicUrl(key);
   const {data:image,error:dbError}=await sb.from("menu_item_images").insert({menu_item_id:dish.id,image_url:publicUrl.publicUrl,sort_order:photos.length}).select("id,image_url,sort_order").single();
   if(dbError){setError(dbError.message);break}
   setPhotos(p=>[...p,image]);setNotice(t("Photo added.","Фото добавлено."));
  }
  setBusy(false);
 }
 async function removePhoto(id:string){
  const photo=photos.find(p=>p.id===id);if(!photo)return;
  setBusy(true);setError("");
  const sb=createSupabaseBrowserClient();
  const {error:e}=await sb.from("menu_item_images").delete().eq("id",id);
  if(e){setError(e.message)}else{
   const path=decodeURIComponent(new URL(photo.image_url).pathname.split("/dish-photos/")[1]||"");
   if(path)await sb.storage.from("dish-photos").remove([path]);
   setPhotos(prev=>prev.filter(p=>p.id!==id));setActive(0);
  }
  setBusy(false);
 }
 return <main className={styles.page}><div className={styles.wrap}>{assignmentControl}
 <div className={styles.top}><Link href={isAdmin?"/admin?tab=food":"/chef-dashboard?tab=dishes"}>← {t("My Dishes","Мои блюда")}</Link><span>{t("Customer page · Editing mode","Страница покупателя · Редактирование")}</span><button type="button" onClick={()=>router.back()}>{t("Done","Готово")}</button></div>
 <div className={styles.product}><section className={styles.gallery}><div className={styles.heroPhoto}>{photos.length?<img src={photos[Math.min(active,photos.length-1)].image_url} alt={name}/>:<div className={styles.placeholder}>✿<small>{t("Add a photograph of your dish","Добавьте фотографию блюда")}</small></div>}</div><div className={styles.thumbs}>{photos.map((photo,i)=><div key={photo.id} className={styles.thumb}><button onClick={()=>setActive(i)} className={styles.thumbPhoto}><img src={photo.image_url} alt={`Photo ${i+1}`}/></button>{canEdit&&<button className={styles.remove} disabled={busy} onClick={()=>void removePhoto(photo.id)} aria-label="Remove photo">×</button>}</div>)}{canEdit&&photos.length<3&&<label className={styles.addPhoto}>＋<small>{t("Add photo","Добавить фото")}</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{void upload(e.target.files);e.target.value=""}} hidden disabled={busy}/></label>}</div><p className={styles.hint}>{t("Up to 3 photos · JPG, PNG or WebP · Maximum 5 MB each","До 3 фотографий · JPG, PNG или WebP · Не более 5 МБ")}</p></section>
 <section className={styles.details}><div className={styles.chef}><span className={styles.avatar}>{(dish.vendors?.display_name||"C")[0].toUpperCase()}</span><strong>{dish.vendors?.display_name||"Chef"}</strong></div><span className={styles.status}>{status==="approved"?t("Approved","Одобрено"):status==="pending"?t("Awaiting approval","На рассмотрении"):t("Draft · Not public","Черновик · Не опубликовано")}</span>
 <label className={styles.nameLabel}>{t("Dish name","Название блюда")}<input disabled={!canEdit} className={styles.name} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className={styles.inputLabel}>{t("Writing language","Язык описания")}<select disabled={!canEdit} value={language} onChange={e=>setLanguage(e.target.value as "en"|"ru")}><option value="en">English</option><option value="ru">Русский</option></select></label>
 <label className={styles.inputLabel}>{t("Description","Описание")}<textarea disabled={!canEdit} rows={4} value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <h2>{t("Choose an option","Выберите вариант")}</h2>
 {weightValues.length>0&&<label className={styles.inputLabel}>{t("Weight and price","Вес и цена")}
 <select value={chosenWeight?.id??""} onChange={e=>setSelectedWeight(e.target.value)}>
 {weightValues.map((v:any)=><option key={v.id} value={v.id}>{ru?(v.label_ru||v.label_en):v.label_en} — NZ$ {(Number(price||0)+v.price_delta_cents/100).toFixed(2)}</option>)}
 </select></label>}
 <div className={styles.option}><span>◉ {weightValues.length>0?t("Selected portion","Выбранная порция"):t("Standard serving","Стандартная порция")}</span><label>NZ$ {weightValues.length>0?<strong>{currentPrice.toFixed(2)}</strong>:<input disabled={!canEdit} type="number" min="0" step=".01" value={price} onChange={e=>setPrice(e.target.value)}/>}</label></div>
 <section className={styles.safetyEditor}><h2>{t("Ingredients & food safety","Состав и безопасность")}</h2><label>{t("Portion or package size","Размер порции или упаковки")}<input disabled={!canEdit} value={portion} onChange={e=>setPortion(e.target.value)} placeholder={t("e.g. 500 g","Например, 500 г")}/></label>
 <label>{t("Full ingredient list (required)","Полный состав (обязательно)")}<textarea disabled={!canEdit} value={ingredients} onChange={e=>{setIngredients(e.target.value);setAllergenConfirmed(false)}} rows={3}/></label>
 <label>{t("Allergens present, or explicitly state none known (required)","Аллергены или прямое указание их отсутствия (обязательно)")}<textarea disabled={!canEdit} value={allergens} onChange={e=>{setAllergens(e.target.value);setAllergenConfirmed(false)}} rows={3} placeholder={t("e.g. Contains eggs, dairy and wheat","Например, содержит яйца, молоко и пшеницу")}/></label>
 <label>{t("Cross-contact risks / shared equipment","Риски перекрёстного контакта / общее оборудование")}<textarea disabled={!canEdit} value={crossContact} onChange={e=>{setCrossContact(e.target.value);setAllergenConfirmed(false)}} rows={2}/></label>
 <label className={styles.safetyCheck}><input disabled={!canEdit} type="checkbox" checked={allergenConfirmed} onChange={e=>setAllergenConfirmed(e.target.checked)}/>{t("I confirm the ingredient and allergen information is accurate and complete to the best of my knowledge.","Подтверждаю, что сведения о составе и аллергенах являются полными и точными, насколько мне известно.")}</label></section>
 <DishOptionEditor dishId={dish.id} initial={options??[]} editable={canEdit}/><div className={styles.mockCheckout}><span>− &nbsp; 1 &nbsp; ＋</span><button disabled>{t("Add to Cart · Customer preview","В корзину · Предпросмотр")}</button></div>
 {canEdit?<div className={styles.editActions}><button className={styles.saveDraft} disabled={busy||!name.trim()} onClick={()=>void save()}>{busy?t("Saving…","Сохранение…"):t("Save draft","Сохранить черновик")}</button>{!isAdmin&&<button className={styles.submitApproval} disabled={busy||!name.trim()} onClick={()=>void submitForApproval()}>{t("Submit for approval →","Отправить на одобрение →")}</button>}</div>:<p className={styles.hint}>{t("Approved dishes are protected. Material edits will use a reviewable version.","Одобренные блюда защищены. Изменения будут проходить проверку.")}</p>}
 {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.success}>{notice}</p>}
 </section></div><section className={styles.description}><div className={styles.tabs}><strong>{t("Description","Описание")}</strong><span>{t("Ingredients","Ингредиенты")}</span></div><p>{description||t("Your description will appear here.","Здесь появится ваше описание.")}</p><p><strong>{t("Ingredients: ","Состав: ")}</strong>{ingredients}</p><p><strong>{t("Allergens: ","Аллергены: ")}</strong>{allergens}</p><div className={styles.floral}>✿ ❀</div></section></div></main>;

}
