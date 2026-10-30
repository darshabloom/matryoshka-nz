"use client";
import Link from "next/link";
import {useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import {useCartDrawer} from "@/components/cart/CartDrawerContext";
import {useBasket} from "@/components/cart/BasketProvider";
import {dollars} from "@/lib/customer-types";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./basket.module.css";
export default function BasketPage({inDrawer=false}:{inDrawer?:boolean}={}){
 const {openCheckout,close}=useCartDrawer();
 const router=useRouter(),pathname=usePathname();
 const {items,ready,subtotal,setQuantity,setNote,remove,clear}=useBasket(),{lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a;
 const [noteOpen,setNoteOpen]=useState<Record<string,boolean>>({});
 const event=items[0];
 function continueShopping(){
  close();
  if(event&&!pathname.startsWith("/events/"+event.eventSlug))
   router.push("/events/"+encodeURIComponent(event.eventSlug));
 }
 return <main className={`${styles.page} ${inDrawer?styles.drawerPage:""}`}><div className={styles.wrap}>{!inDrawer&&<><span className={styles.eyebrow}>MATRYOSHKA · {t("YOUR ORDER","ВАШ ЗАКАЗ")}</span><h1>{t("Your basket","Ваша корзина")}</h1></>}
 {!ready?<p>{t("Loading…","Загрузка…")}</p>:!items.length?<div className={styles.empty}><span>🛒</span><h2>{t("Your basket is empty","Ваша корзина пуста")}</h2><p>{t("Choose an event and explore homemade food.","Выберите событие и блюда от наших поваров.")}</p><Link href="/events" className={styles.primary} onClick={inDrawer?close:undefined}>{t("Browse events","Смотреть события")} →</Link></div>:<>
 {!inDrawer&&<div className={styles.event}>✿ <strong>{event.eventName}</strong><span>{t("One basket for one event · Food provided at the event","Одна корзина для одного события · Еда на мероприятии")}</span></div>}
 <div className={styles.columns}><div className={styles.lines}>{items.map(item=><article key={item.id} className={styles.line}>
 <Link className={styles.photo} href={`/events/${encodeURIComponent(item.eventSlug)}/dish/${encodeURIComponent(item.dishId)}`} onClick={inDrawer?close:undefined} aria-label={t("View dish: ","Открыть блюдо: ")+item.name}>
  {item.photo?<img src={item.photo} alt=""/>:<img src="/images/matryoshka-dish-placeholder.svg" alt=""/>}
 </Link>
 <div className={styles.lineMain}>
  <h2><Link className={styles.dishLink} href={`/events/${encodeURIComponent(item.eventSlug)}/dish/${encodeURIComponent(item.dishId)}`} onClick={inDrawer?close:undefined}>{item.name}</Link></h2>
  <p>{item.chef}</p>{item.optionSummary&&<p>{item.optionSummary}</p>}
  <strong>{dollars(item.unitPriceCents)} {t("each","за порцию")}</strong>
  <button type="button" className={styles.noteButton} aria-expanded={noteOpen[item.id]??false}
   onClick={()=>setNoteOpen(old=>({...old,[item.id]:!old[item.id]}))}>
   <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11.4c0 4.2-3.7 7.6-8.3 7.6-1.2 0-2.4-.2-3.4-.7L4 20l1.3-4A7.2 7.2 0 0 1 3.5 11.4C3.5 7.3 7.2 4 11.8 4c4.5 0 8.2 3.3 8.2 7.4Z"/>
    <path d="M11.7 8.3v6.1M8.7 11.35h6"/>
   </svg>
   {item.note?.trim()?t("Edit dish note","Изменить пожелание"):t("Add dish note","Пожелание к блюду")}
  </button>
  {noteOpen[item.id]&&<div className={styles.noteEditor}>
   <label htmlFor={`dish-note-${item.id}`}>{t("Instructions for this dish (optional)","Пожелания именно к этому блюду (необязательно)")}</label>
   <textarea id={`dish-note-${item.id}`} maxLength={300} rows={3}
    placeholder={t("For example: no mushrooms, please","Например: пожалуйста, без грибов")}
    value={item.note??""} onChange={e=>setNote(item.id,e.target.value)}/>
   <small>{t("Saved in your basket; sent to this dish's chef at checkout.","Сохраняется в корзине и передаётся повару этого блюда при заказе.")} {(item.note??"").length}/300</small>
  </div>}
  {!noteOpen[item.id]&&item.note?.trim()&&<p className={styles.notePreview}>💬 {item.note.trim()}</p>}
 </div>
 <div className={styles.adjust}>
  <div className={styles.qty}><button type="button" aria-label={t("Decrease quantity","Уменьшить количество")} onClick={()=>item.quantity<=1?remove(item.id):setQuantity(item.id,item.quantity-1)}>−</button><strong>{item.quantity}</strong><button type="button" aria-label={t("Increase quantity","Увеличить количество")} onClick={()=>setQuantity(item.id,item.quantity+1)}>＋</button></div>
  <button type="button" className={styles.remove} onClick={()=>remove(item.id)}>{t("Remove","Удалить")}</button>
  <strong className={styles.lineTotal}>{dollars(item.quantity*item.unitPriceCents)}</strong>
 </div>
 </article>)}<div className={styles.bottomActions}>{inDrawer?<button type="button" onClick={continueShopping}>← {t("Continue shopping","Продолжить покупки")}</button>:<Link href={`/events/${event.eventSlug}`}>← {t("Continue shopping","Продолжить покупки")}</Link>}<button onClick={()=>{if(confirm(t("Clear the basket?","Очистить корзину?")))clear()}}>{t("Clear basket","Очистить корзину")}</button></div></div>
 <aside className={styles.summary}><h2>{t("Order summary","Ваш заказ")}</h2><div><span>{t("Subtotal","Сумма")}</span><strong>{dollars(subtotal)}</strong></div><p>{t("Final prices and availability are checked again at checkout.","Стоимость и наличие будут проверены перед оплатой.")}</p>{inDrawer?<button type="button" className={styles.primary} onClick={openCheckout}>{t("Continue to checkout","Оформить заказ")} →</button>:<Link className={styles.primary} href="/checkout">{t("Continue to checkout","Оформить заказ")} →</Link>}<small className={styles.secureNotice}>🔒 {t("Ticket and allergy details required before payment.","Билет и аллергии проверяются перед оплатой.")}</small></aside></div></>}
 </div></main>;
}