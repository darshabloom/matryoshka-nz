"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {useBasket} from "@/components/cart/BasketProvider";
import type {CustomerDish,EventMenuData} from "@/lib/customer-types";
import {dollars,label} from "@/lib/customer-types";
import styles from "./product.module.css";
import {useCartDrawer} from "@/components/cart/CartDrawerContext";
import {customerPriceCents} from "@/lib/customer-pricing";
export default function ProductPage(){
 const {slug,id}=useParams<{slug:string;id:string}>();
 const {lang}=useLanguage(),ru=lang==="ru",t=(en:string,r:string)=>ru?r:en;
 const {add}=useBasket(),{openBasket}=useCartDrawer();
 const [data,setData]=useState<EventMenuData|null>(null),[dish,setDish]=useState<CustomerDish|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const [photo,setPhoto]=useState(0),[quantity,setQuantity]=useState(1),[selected,setSelected]=useState<Record<string,string[]>>({}),[added,setAdded]=useState(false);
 useEffect(()=>{if(!slug||!id)return;const ac=new AbortController();fetch(`/api/events/${encodeURIComponent(slug)}/dishes`,{signal:ac.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||"Product unavailable");return body as EventMenuData}).then(x=>{setData(x);const item=x.dishes.find(d=>d.menu_item_id===id)??null;setDish(item);setSelected({});setAdded(false);}).catch(e=>{if(!ac.signal.aborted)setError(e.message)}).finally(()=>{if(!ac.signal.aborted)setLoading(false)});return ()=>ac.abort()},[slug,id]);
 const chosen=useMemo(()=>dish?.options.flatMap(g=>(selected[g.id]??(g.max_select===1&&g.values.length===1?[g.values[0].id]:[])).map(v=>g.values.find(x=>x.id===v)).filter((x):x is NonNullable<typeof x>=>Boolean(x)))??[],[dish,selected]);
 const unitPrice=customerPriceCents((dish?.price_cents??0)+chosen.reduce((sum,v)=>sum+v.price_delta_cents,0));
 const valid=!!dish&&dish.options.every(g=>{const n=(selected[g.id]??(g.max_select===1&&g.values.length===1?[g.values[0].id]:[])).length;const isSize=/^(size|weight|размер|вес)$/i.test(g.label_en.trim())||/^(размер|вес)$/i.test((g.label_ru??"").trim());return n>=Math.max(g.min_select,(g.required||isSize)?1:0)&&n<=Math.max(g.max_select,1)});
 function toggle(group:string,value:string,max:number){setSelected(old=>{const current=old[group]??[];return {...old,[group]:max===1?[value]:current.includes(value)?current.filter(x=>x!==value):current.length<max?[...current,value]:current}})}
 function addToBasket(){if(!dish||!data||!valid)return;setError("");const options=dish.options.flatMap(group=>(selected[group.id]??(group.max_select===1&&group.values.length===1?[group.values[0].id]:[])).map(v=>{const option=group.values.find(x=>x.id===v);return option?`${label(group.label_en,group.label_ru,ru)}: ${label(option.label_en,option.label_ru,ru)}`:""})).filter(Boolean).join(" · ");
 const result=add({dishId:dish.menu_item_id,eventId:data.event.id,eventSlug:data.event.slug,eventName:label(data.event.title_en,data.event.title_ru,ru),name:label(dish.title_en,dish.title_ru,ru),chef:dish.vendor_name,photo:dish.images[0]??null,unitPriceCents:unitPrice,optionIds:chosen.map(v=>v.id),optionSummary:options,quantity});
 if(result){setAdded(true);openBasket()} }
 return <main className={styles.page}>
<div className={styles.wrap}><Link href={`/events/${slug}`} className={styles.back}>← {t("Back to event menu","К меню события")}</Link>
 {loading&&<p role="status">{t("Loading dish…","Загружаем блюдо…")}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
 {!loading&&!dish&&!error&&<p>{t("This dish is not available for this event.","Это блюдо недоступно для события.")}</p>}
 {dish&&data&&<><div className={styles.product}><div className={styles.gallery}><div className={styles.photo}>{dish.images.length?<img src={dish.images[Math.min(photo,dish.images.length-1)]} style={{objectFit:dish.image_positions?.[photo]?.mode==="contain"?"contain":"cover",objectPosition:`${dish.image_positions?.[photo]?.x??50}% ${dish.image_positions?.[photo]?.y??50}%`,transform:`translate(${(50-(dish.image_positions?.[photo]?.x??50))*0.5}%, ${(50-(dish.image_positions?.[photo]?.y??50))*0.5}%) scale(${(dish.image_positions?.[photo]?.zoom??100)/100})`,transformOrigin:"center center"}} alt={label(dish.title_en,dish.title_ru,ru)}/>:<img src="/images/matryoshka-dish-placeholder.svg" alt=""/>}</div><div className={styles.thumbs}>{dish.images.map((src,i)=><button key={src} type="button" aria-label={`Photo ${i+1}`} aria-pressed={photo===i} onClick={()=>setPhoto(i)}><img src={src} alt={`Photo ${i+1}`}/></button>)}</div></div>
 <div className={styles.detail}><div className={styles.chef}><span className={styles.avatar}>{dish.vendor_photo?<img src={dish.vendor_photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:dish.vendor_name[0]}</span><strong>{dish.vendor_name}</strong></div><span className={styles.eyebrow}>{t("HOMEMADE WITH LOVE","С ЛЮБОВЬЮ")}</span><h1>{label(dish.title_en,dish.title_ru,ru)}</h1><p className={styles.description}>{label(dish.description_en,dish.description_ru,ru)}</p><p className={styles.price}>{dish.options.some(g=>g.max_select===1&&g.values.length>1)?t("From ","От "):""}{dollars(customerPriceCents(dish.price_cents+dish.options.filter(g=>g.max_select===1&&g.values.length===1).reduce((sum,g)=>sum+g.values[0].price_delta_cents,0)))}</p>{dish.portion&&<p className={styles.portion}>🍽 {dish.portion}</p>}
 {dish.options.filter(g=>!(g.max_select===1&&g.values.length===1)).map(g=>{const isSize=/^(size|weight|размер|вес)$/i.test(g.label_en.trim())||/^(размер|вес)$/i.test((g.label_ru??"").trim());return <fieldset className={styles.options} key={g.id}>
  {!isSize&&<legend>{label(g.label_en,g.label_ru,ru)} {(g.required||g.min_select>0)&&<span>* {t("Required","Обязательно")}</span>}</legend>}
  {g.max_select===1?<select className={styles.sizeDropdown} aria-label={label(g.label_en,g.label_ru,ru)}
   value={(selected[g.id]??[])[0]??""}
   required={isSize||g.required||g.min_select>0}
   onChange={e=>setSelected(old=>({...old,[g.id]:e.target.value?[e.target.value]:[]}))}>
    <option value="">{isSize?t("Please choose a size","Пожалуйста, выберите размер"):t("Select an option","Выберите вариант")}</option>
    {g.values.map(v=><option key={v.id} value={v.id}>{label(v.label_en,v.label_ru,ru)} · {(g.label_en==="Size"||g.label_en==="Weight")?dollars(customerPriceCents(dish.price_cents+v.price_delta_cents)):v.price_delta_cents===0?t("Included","Включено"):"+"+dollars(v.price_delta_cents)}</option>)}
   </select>:<div className={styles.optionGrid}>{g.values.map(v=><label className={(selected[g.id]??[]).includes(v.id)?styles.chosen:styles.option} key={v.id}>
    <input type="checkbox" name={g.id} checked={(selected[g.id]??[]).includes(v.id)} onChange={()=>toggle(g.id,v.id,g.max_select)}/>
    <strong>{label(v.label_en,v.label_ru,ru)}</strong>
    <small>{v.price_delta_cents===0?t("Included","Включено"):"+"+dollars(v.price_delta_cents)}</small>
   </label>)}</div>}
   {g.max_select>1&&<small className={styles.small}>{t(`Choose up to ${g.max_select}`,`Выберите до ${g.max_select}`)}</small>}
 </fieldset>})}
 <div className={styles.purchase}><div className={styles.counter}><button type="button" disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))} aria-label="Decrease quantity">−</button><strong>{quantity}</strong><button type="button" onClick={()=>setQuantity(q=>Math.min(100,Math.min(dish.max_quantity??100,q+1)))} aria-label="Increase quantity">+</button></div><button type="button" className={styles.addButton} disabled={!valid||added} onClick={addToBasket}>{added?t("Added to basket","Добавлено"):`${t("Add to basket","В корзину")} · ${dollars(unitPrice*quantity)}`}</button></div><p className={styles.hint}>{dish.sale_ready===false?t("You can plan your basket now. Chef approval and food-safety details must be completed before checkout.","Корзину можно собрать сейчас. Перед оплатой повар должен завершить проверку блюда и сведений о безопасности."):null} {data.event.ticket_required?t("A valid event ticket will be required at checkout.","Для оплаты потребуется билет на мероприятие."):""}</p></div></div>
 <section className={styles.foodSafety}><h2>{t("Ingredients & food safety","Состав и безопасность")}</h2><div className={styles.safetyColumns}><div><h3>{t("Ingredients","Ингредиенты")}</h3><p>{dish.ingredients}</p></div><div><h3>{t("Allergens","Аллергены")}</h3><p>{dish.allergens||t("Chef has not identified specific allergens.","Повар не указал отдельные аллергены.")}</p>{dish.cross_contact&&<p><strong>{t("Cross-contact: ","Перекрёстный контакт: ")}</strong>{dish.cross_contact}</p>}</div></div><p className={styles.safetyNote}>{t("Tell us about food allergies before paying. If you have a serious allergy, the relevant chef must confirm whether your order can be prepared safely.","Перед оплатой сообщите об аллергиях. При серьёзной аллергии повар должен подтвердить возможность безопасного приготовления.")}</p></section></>}
 </div></main>
}