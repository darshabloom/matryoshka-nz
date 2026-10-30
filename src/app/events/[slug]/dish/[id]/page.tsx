"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {useBasket} from "@/components/cart/BasketProvider";
import type {CustomerDish,EventMenuData} from "@/lib/customer-types";
import {dollars,label} from "@/lib/customer-types";
import styles from "./product.module.css";
import shopStyles from "../../shop.module.css";
import {customerPriceCents} from "@/lib/customer-pricing";
function startingSelection(dish:CustomerDish):Record<string,string[]>{
 const selection:Record<string,string[]>={};
 for(const group of dish.options){
  const isSize=/^(size|weight|размер|вес)$/i.test(group.label_en.trim())||/^(размер|вес)$/i.test((group.label_ru??"").trim());
  if(group.max_select===1&&group.values.length&&(group.values.length===1||isSize&&(group.required||group.min_select>0)))
   selection[group.id]=[group.values[0].id];
 }
 return selection;
}
export default function ProductPage(){
 const {slug,id}=useParams<{slug:string;id:string}>(),router=useRouter();
 const {lang}=useLanguage(),ru=lang==="ru",t=(en:string,r:string)=>ru?r:en;
 const {add,count,subtotal}=useBasket();
 const [data,setData]=useState<EventMenuData|null>(null),[dish,setDish]=useState<CustomerDish|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const [photo,setPhoto]=useState(0),[quantity,setQuantity]=useState(1),[selected,setSelected]=useState<Record<string,string[]>>({}),[added,setAdded]=useState(false);
 useEffect(()=>{if(!slug||!id)return;const ac=new AbortController();fetch(`/api/events/${encodeURIComponent(slug)}/dishes`,{signal:ac.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||"Product unavailable");return body as EventMenuData}).then(x=>{setData(x);const item=x.dishes.find(d=>d.menu_item_id===id)??null;setDish(item);setSelected(item?startingSelection(item):{});setAdded(false);}).catch(e=>{if(!ac.signal.aborted)setError(e.message)}).finally(()=>{if(!ac.signal.aborted)setLoading(false)});return ()=>ac.abort()},[slug,id]);
 const chosen=useMemo(()=>dish?.options.flatMap(g=>(selected[g.id]??[]).map(v=>g.values.find(x=>x.id===v)).filter((x):x is NonNullable<typeof x>=>Boolean(x)))??[],[dish,selected]);
 const unitPrice=customerPriceCents((dish?.price_cents??0)+chosen.reduce((sum,v)=>sum+v.price_delta_cents,0));
 const valid=!!dish&&dish.options.every(g=>{const n=(selected[g.id]??[]).length;return n>=(g.required?Math.max(1,g.min_select):g.min_select)&&n<=Math.max(g.max_select,1)});
 function toggle(group:string,value:string,max:number){setSelected(old=>{const current=old[group]??[];return {...old,[group]:max===1?[value]:current.includes(value)?current.filter(x=>x!==value):current.length<max?[...current,value]:current}})}
 function addToBasket(){if(!dish||!data||!valid||dish.sale_ready===false)return;setError("");const options=dish.options.flatMap(group=>(selected[group.id]??[]).map(v=>{const option=group.values.find(x=>x.id===v);return option?`${label(group.label_en,group.label_ru,ru)}: ${label(option.label_en,option.label_ru,ru)}`:""})).filter(Boolean).join(" · ");
 const result=add({dishId:dish.menu_item_id,eventId:data.event.id,eventSlug:data.event.slug,eventName:label(data.event.title_en,data.event.title_ru,ru),name:label(dish.title_en,dish.title_ru,ru),chef:dish.vendor_name,photo:dish.images[0]??null,unitPriceCents:unitPrice,optionIds:chosen.map(v=>v.id),optionSummary:options,quantity});
 if(result){setAdded(true);router.push("/basket")} }
 return <main className={styles.page}>
 <Link href="/basket" className={shopStyles.floatingCart} aria-label={t("View cart with ","Корзина: ")+count+t(" items"," товаров")}>
  <span className={shopStyles.cartIcon} aria-hidden="true">🛒{count>0&&<span className={shopStyles.cartBadge}>{count}</span>}</span>
  <span className={shopStyles.cartText}><strong>{t("View cart","Корзина")}</strong><small>{count>0?dollars(subtotal):t("Your basket","Ваш заказ")}</small></span>
  <span className={shopStyles.cartArrow} aria-hidden="true">›</span>
 </Link><div className={styles.wrap}><Link href={`/events/${slug}`} className={styles.back}>← {t("Back to event menu","К меню события")}</Link>
 {loading&&<p role="status">{t("Loading dish…","Загружаем блюдо…")}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
 {!loading&&!dish&&!error&&<p>{t("This dish is not available for this event.","Это блюдо недоступно для события.")}</p>}
 {dish&&data&&<><div className={styles.product}><div className={styles.gallery}><div className={styles.photo}>{dish.images.length?<img src={dish.images[Math.min(photo,dish.images.length-1)]} alt={label(dish.title_en,dish.title_ru,ru)}/>:<span>✿</span>}</div><div className={styles.thumbs}>{dish.images.map((src,i)=><button key={src} type="button" aria-label={`Photo ${i+1}`} aria-pressed={photo===i} onClick={()=>setPhoto(i)}><img src={src} alt={`Photo ${i+1}`}/></button>)}</div></div>
 <div className={styles.detail}><div className={styles.chef}><span className={styles.avatar}>{dish.vendor_photo?<img src={dish.vendor_photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:dish.vendor_name[0]}</span><strong>{dish.vendor_name}</strong></div><span className={styles.eyebrow}>{t("HOMEMADE WITH LOVE","С ЛЮБОВЬЮ")}</span><h1>{label(dish.title_en,dish.title_ru,ru)}</h1><p className={styles.description}>{label(dish.description_en,dish.description_ru,ru)}</p><p className={styles.price}>{t("From ","От ")}{dollars(customerPriceCents(dish.price_cents))}</p>{dish.portion&&<p className={styles.portion}>🍽 {dish.portion}</p>}
 {dish.options.map(g=><fieldset className={styles.options} key={g.id}>
  <legend>{label(g.label_en,g.label_ru,ru)} {(g.required||g.min_select>0)&&<span>* {t("Required","Обязательно")}</span>}</legend>
  {g.max_select===1?<select className={styles.sizeDropdown} aria-label={label(g.label_en,g.label_ru,ru)}
   value={(selected[g.id]??[])[0]??""}
   required={g.required||g.min_select>0}
   onChange={e=>setSelected(old=>({...old,[g.id]:e.target.value?[e.target.value]:[]}))}>
    <option value="">{t("Select an option","Выберите вариант")}</option>
    {g.values.map(v=><option key={v.id} value={v.id}>{label(v.label_en,v.label_ru,ru)} · {(g.label_en==="Size"||g.label_en==="Weight")?dollars(customerPriceCents(dish.price_cents+v.price_delta_cents)):v.price_delta_cents===0?t("Included","Включено"):"+"+dollars(v.price_delta_cents)}</option>)}
   </select>:<div className={styles.optionGrid}>{g.values.map(v=><label className={(selected[g.id]??[]).includes(v.id)?styles.chosen:styles.option} key={v.id}>
    <input type="checkbox" name={g.id} checked={(selected[g.id]??[]).includes(v.id)} onChange={()=>toggle(g.id,v.id,g.max_select)}/>
    <strong>{label(v.label_en,v.label_ru,ru)}</strong>
    <small>{v.price_delta_cents===0?t("Included","Включено"):"+"+dollars(v.price_delta_cents)}</small>
   </label>)}</div>}
   {g.max_select>1&&<small className={styles.small}>{t(`Choose up to ${g.max_select}`,`Выберите до ${g.max_select}`)}</small>}
 </fieldset>)}
 <div className={styles.purchase}><div className={styles.counter}><button type="button" disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))} aria-label="Decrease quantity">−</button><strong>{quantity}</strong><button type="button" onClick={()=>setQuantity(q=>Math.min(100,Math.min(dish.max_quantity??100,q+1)))} aria-label="Increase quantity">+</button></div><button type="button" className={styles.addButton} disabled={!valid||dish.sale_ready===false||added} onClick={addToBasket}>{added?t("Added to basket","Добавлено"):dish.sale_ready===false?t("Unavailable","Пока недоступно"):`${t("Add to basket","В корзину")} · ${dollars(unitPrice*quantity)}`}</button></div><p className={styles.hint}>{data.event.ticket_required?t("A valid event ticket will be required at checkout.","Для оплаты потребуется билет на мероприятие."):""}</p></div></div>
 <section className={styles.foodSafety}><h2>{t("Ingredients & food safety","Состав и безопасность")}</h2><div className={styles.safetyColumns}><div><h3>{t("Ingredients","Ингредиенты")}</h3><p>{dish.ingredients}</p></div><div><h3>{t("Allergens","Аллергены")}</h3><p>{dish.allergens||t("Chef has not identified specific allergens.","Повар не указал отдельные аллергены.")}</p>{dish.cross_contact&&<p><strong>{t("Cross-contact: ","Перекрёстный контакт: ")}</strong>{dish.cross_contact}</p>}</div></div><p className={styles.safetyNote}>{t("Tell us about food allergies before paying. If you have a serious allergy, the relevant chef must confirm whether your order can be prepared safely.","Перед оплатой сообщите об аллергиях. При серьёзной аллергии повар должен подтвердить возможность безопасного приготовления.")}</p></section></>}
 </div></main>
}