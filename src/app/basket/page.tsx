"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useCartDrawer} from "@/components/cart/CartDrawerContext";
import {useBasket} from "@/components/cart/BasketProvider";
import {dollars} from "@/lib/customer-types";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./basket.module.css";
export default function BasketPage({inDrawer=false}:{inDrawer?:boolean}={}){
 const {openCheckout,close}=useCartDrawer();
 const router=useRouter(),pathname=usePathname();
 const {items,ready,subtotal,setQuantity,remove,clear}=useBasket(),{lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a;
 const event=items[0];
 function continueShopping(){
  close();
  if(event&&!pathname.startsWith("/events/"+event.eventSlug))
   router.push("/events/"+encodeURIComponent(event.eventSlug));
 }
 return <main className={`${styles.page} ${inDrawer?styles.drawerPage:""}`}><div className={styles.wrap}>{!inDrawer&&<><span className={styles.eyebrow}>MATRYOSHKA · {t("YOUR ORDER","ВАШ ЗАКАЗ")}</span><h1>{t("Your basket","Ваша корзина")}</h1></>}
 {!ready?<p>{t("Loading…","Загрузка…")}</p>:!items.length?<div className={styles.empty}><span>🛒</span><h2>{t("Your basket is empty","Ваша корзина пуста")}</h2><p>{t("Choose an event and explore homemade food.","Выберите событие и блюда от наших поваров.")}</p><Link href="/events" className={styles.primary} onClick={inDrawer?close:undefined}>{t("Browse events","Смотреть события")} →</Link></div>:<>
 {!inDrawer&&<div className={styles.event}>✿ <strong>{event.eventName}</strong><span>{t("One basket for one event · Food provided at the event","Одна корзина для одного события · Еда на мероприятии")}</span></div>}
 <div className={styles.columns}><div className={styles.lines}>{items.map(item=><article key={item.id} className={styles.line}><div className={styles.photo}>{item.photo?<img src={item.photo} alt=""/>:<img src="/images/matryoshka-dish-placeholder.svg" alt=""/>}</div><div className={styles.lineMain}><h2>{item.name}</h2><p>{item.chef}</p>{item.optionSummary&&<p>{item.optionSummary}</p>}<strong>{dollars(item.unitPriceCents)} {t("each","за порцию")}</strong><button className={styles.remove} onClick={()=>remove(item.id)}>{t("Remove","Удалить")}</button></div><div className={styles.adjust}><div className={styles.qty}><button aria-label="Decrease" onClick={()=>item.quantity<=1?remove(item.id):setQuantity(item.id,item.quantity-1)}>−</button><strong>{item.quantity}</strong><button aria-label="Increase" onClick={()=>setQuantity(item.id,item.quantity+1)}>＋</button></div><strong>{dollars(item.quantity*item.unitPriceCents)}</strong></div></article>)}<div className={styles.bottomActions}>{inDrawer?<button type="button" onClick={continueShopping}>← {t("Continue shopping","Продолжить покупки")}</button>:<Link href={`/events/${event.eventSlug}`}>← {t("Continue shopping","Продолжить покупки")}</Link>}<button onClick={()=>{if(confirm(t("Clear the basket?","Очистить корзину?")))clear()}}>{t("Clear basket","Очистить корзину")}</button></div></div>
 <aside className={styles.summary}><h2>{t("Order summary","Ваш заказ")}</h2><div><span>{t("Subtotal","Сумма")}</span><strong>{dollars(subtotal)}</strong></div><p>{t("Final prices and availability are checked again at checkout.","Стоимость и наличие будут проверены перед оплатой.")}</p>{inDrawer?<button type="button" className={styles.primary} onClick={openCheckout}>{t("Continue to checkout","Оформить заказ")} →</button>:<Link className={styles.primary} href="/checkout">{t("Continue to checkout","Оформить заказ")} →</Link>}<small>🔒 {t("Ticket verification and allergy declaration are required before payment.","Перед оплатой нужно подтвердить билет и сообщить об аллергиях.")}</small></aside></div></>}
 </div></main>;
}