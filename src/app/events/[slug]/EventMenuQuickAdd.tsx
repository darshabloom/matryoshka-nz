"use client";
import {useMemo,useState} from "react";
import {useBasket} from "@/components/cart/BasketProvider";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {dollars,label,type CustomerDish,type ShoppingEvent} from "@/lib/customer-types";
import styles from "./shop.module.css";
import {customerPriceCents} from "@/lib/customer-pricing";
export default function EventMenuQuickAdd({dish,event}:{dish:CustomerDish;event:ShoppingEvent}){
 const {lang}=useLanguage(),ru=lang==="ru",t=(en:string,russian:string)=>ru?russian:en;
 const {add}=useBasket();
 const [quantity,setQuantity]=useState(1);
 const [selected,setSelected]=useState<Record<string,string[]>>({});
 const [notice,setNotice]=useState("");
 const chosen=useMemo(()=>dish.options.flatMap(group=>(selected[group.id]??[])
  .map(id=>group.values.find(v=>v.id===id)).filter((v):v is NonNullable<typeof v>=>!!v)),[dish.options,selected]);
 const ready=dish.options.every(group=>{
  const n=(selected[group.id]??[]).length;
  return n>=Math.max(group.min_select,group.required?1:0)&&n<=group.max_select;
 });
 const limit=Math.max(0,Math.min(100,dish.max_quantity??100));
 const price=customerPriceCents(dish.price_cents+chosen.reduce((sum,v)=>sum+v.price_delta_cents,0));
 function toggle(groupId:string,id:string,max:number){
  setNotice("");setSelected(old=>{
   const list=old[groupId]??[];
   return {...old,[groupId]:max===1?[id]:list.includes(id)?list.filter(x=>x!==id):list.length<max?[...list,id]:list};
  });
 }
 function addDish(){
  if(!ready||quantity<1||quantity>limit)return;
  const summary=dish.options.flatMap(group=>(selected[group.id]??[])
   .map(id=>group.values.find(v=>v.id===id))
   .filter((v):v is NonNullable<typeof v>=>!!v)
   .map(v=>label(group.label_en,group.label_ru,ru)+": "+label(v.label_en,v.label_ru,ru))).join(" · ");
  const ok=add({dishId:dish.menu_item_id,eventId:event.id,eventSlug:event.slug,
   eventName:label(event.title_en,event.title_ru,ru),name:label(dish.title_en,dish.title_ru,ru),
   chef:dish.vendor_name,photo:dish.images[0]??null,
   unitPriceCents:price,optionIds:chosen.map(v=>v.id),optionSummary:summary,quantity});
  if(ok)setNotice(t("Added to basket","Добавлено в корзину"));
 }
 if(dish.sale_ready===false)return <div className={styles.quickAdd}><p style={{color:"#976a45",fontSize:12,fontWeight:700}}>{t("This dish is being prepared for ordering.","Блюдо готовится к заказу.")}</p></div>;
 return <div className={styles.quickAdd}>
  {dish.options.map(group=><fieldset key={group.id} className={styles.quickOptions}>
   <legend>{label(group.label_en,group.label_ru,ru)}{(group.required||group.min_select>0)?" *":""}</legend>
   <div className={styles.quickChoices}>{group.values.map(value=><label key={value.id} className={styles.quickOption}>
    <input type={group.max_select===1?"radio":"checkbox"} name={dish.menu_item_id+group.id}
     checked={(selected[group.id]??[]).includes(value.id)} onChange={()=>toggle(group.id,value.id,group.max_select)}/>
    <span>{label(value.label_en,value.label_ru,ru)}{(group.label_en==="Size"||group.label_en==="Weight")?(" · "+dollars(customerPriceCents(dish.price_cents+value.price_delta_cents))):value.price_delta_cents?(" · +"+dollars(value.price_delta_cents)):""}</span>
   </label>)}</div>
   {group.max_select>1&&<small>{t("Choose up to ","Можно выбрать до ")}{group.max_select}</small>}
  </fieldset>)}
  <div className={styles.quickActions}>
   <div className={styles.quickQuantity} aria-label={t("Quantity","Количество")}>
    <button type="button" disabled={quantity===1} onClick={()=>setQuantity(q=>q-1)} aria-label={t("Decrease","Меньше")}>−</button>
    <strong>{quantity}</strong>
    <button type="button" disabled={quantity>=limit} onClick={()=>setQuantity(q=>q+1)} aria-label={t("Increase","Больше")}>+</button>
   </div>
   <button type="button" className={styles.quickButton} disabled={!ready||limit<1} onClick={addDish}>
    {limit===0?t("Sold out","Нет в наличии"):t("Add to basket","В корзину")+" · "+dollars(price*quantity)}
   </button>
  </div>
  {!ready&&<small className={styles.quickHint}>{t("Choose the required options above.","Выберите обязательные варианты выше.")}</small>}
  {notice&&<span role="status" className={styles.quickSuccess}>{notice}</span>}
 </div>;
}
