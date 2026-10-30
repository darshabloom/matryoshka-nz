"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {useBasket} from "@/components/cart/BasketProvider";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {dollars} from "@/lib/customer-types";
import styles from "./checkout.module.css";
type Quote={event:{id:string;slug:string;title:string;ticketRequired:boolean;fulfilmentMode:string};lines:{dishId:string;name:string;chef:string;quantity:number;unitPriceCents:number;totalCents:number;optionSummary:string[]}[];subtotalCents:number};
export default function Checkout(){
 const {items,ready,clear}=useBasket(),{lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a;
 const [email,setEmail]=useState(""),[ticket,setTicket]=useState(""),[allergy,setAllergy]=useState<"none"|"declared"|null>(null),[allergyDetails,setAllergyDetails]=useState("");
 const [specialRequests,setSpecialRequests]=useState("");
 const [quote,setQuote]=useState<Quote|null>(null),[quoting,setQuoting]=useState(false),[problem,setProblem]=useState(""),[paying,setPaying]=useState(false),[status,setStatus]=useState<{enabled:boolean;reason:string|null}|null>(null);
 const eventId=items[0]?.eventId;const basketSignature=useMemo(()=>JSON.stringify(items.map(x=>[x.dishId,x.quantity,x.optionIds])),[items]);
 useEffect(()=>{
  if(!eventId)return;
  try{
   const saved=sessionStorage.getItem("matryoshka:ticket_ref:"+eventId);
   if(saved&&/^YMR-[A-Z0-9-]{5,80}$/.test(saved))setTicket(current=>current||saved);
   const verifiedEmail=sessionStorage.getItem("matryoshka:ticket_email:"+eventId);
   if(verifiedEmail&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedEmail))
    setEmail(current=>current||verifiedEmail);
  }catch{}
 },[eventId]);
 useEffect(()=>{fetch("/api/checkout/status",{cache:"no-store"}).then(r=>r.json()).then(setStatus).catch(()=>setStatus({enabled:false,reason:"Secure checkout is unavailable"}))},[]);
 useEffect(()=>{if(!ready||!eventId){setQuote(null);return};const ac=new AbortController();setQuoting(true);setProblem("");
  fetch("/api/checkout/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,items:items.map(x=>({dishId:x.dishId,quantity:x.quantity,optionIds:x.optionIds}))}),signal:ac.signal}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||"Unable to check prices");return x}).then(x=>setQuote(x)).catch(e=>{if(!ac.signal.aborted){setQuote(null);setProblem(e.message)}}).finally(()=>{if(!ac.signal.aborted)setQuoting(false)});return ()=>ac.abort();
 },[eventId,basketSignature,ready]);
 const allergyValid=allergy==="none"||(allergy==="declared"&&allergyDetails.trim().length>0);
 const canPay=ready&&!!quote&&!!status?.enabled&&!!email.trim()&&allergyValid&&ticket.trim().length>2&&!paying;
 async function checkout(){
  if(!canPay||!quote)return;
  setPaying(true);setProblem("");
  try{const r=await fetch("/api/checkout/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId:quote.event.id,items:items.map(x=>({dishId:x.dishId,quantity:x.quantity,optionIds:x.optionIds})),email,ticketReference:ticket,allergyDeclaration:allergy,allergyDetails:allergy==="declared"?allergyDetails.trim():"",specialRequests:specialRequests.trim(),idempotencyKey:crypto.randomUUID()})});const body=await r.json();if(!r.ok)throw Error(body.error||"Could not start secure payment");if(!body.url?.startsWith("https://checkout.stripe.com/"))throw Error("Payment connection unavailable");window.location.assign(body.url);
  }catch(e){setProblem(e instanceof Error?e.message:"Payment unavailable");setPaying(false)}
 }
 return <main className={styles.page}><div className={styles.wrap}><Link href="/basket" className={styles.back}>← {t("Back to basket","Назад в корзину")}</Link><span className={styles.eyebrow}>MATRYOSHKA · CHECKOUT</span><h1>{t("Complete your order","Оформление заказа")}</h1>
 {!items.length&&ready?<section className={styles.panel}><h2>{t("Your basket is empty","Корзина пуста")}</h2><Link href="/events">{t("Explore events","Посмотреть события")} →</Link></section>:<div className={styles.columns}>
 <div className={styles.forms}><section className={styles.panel}><h2>1. {t("Your event","Ваше событие")}</h2><div className={styles.event}><strong>{items[0]?.eventName}</strong><p>🍽 {t("Food is provided at the event. No collection or delivery address is needed.","Еда будет на мероприятии. Адрес самовывоза или доставки не нужен.")}</p></div></section>
 <section className={styles.panel}><h2>2. {t("Contact details","Контактные данные")}</h2><label>{t("Email for your order receipt","Email для подтверждения заказа")}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email"/></label></section>
 {<section className={styles.panel}><h2>3. {t("Verify your event ticket","Подтвердите билет")}</h2><p>{t("Only ticket holders can buy food for this event. Enter the Ticket Number from Yumorilnik. It will be checked securely before payment.","Заказать еду могут только владельцы билетов. Введите номер билета с Юморильника.")}</p><label>{t("Ticket Number (Yumorilnik)","Номер билета (Юморильник)")}<input value={ticket} maxLength={100} onChange={e=>setTicket(e.target.value)} placeholder={t("Booking reference","Номер бронирования")} autoComplete="off"/></label><small>{t("The email must match your ticket booking.","Email должен совпадать с бронированием.")}</small></section>}
 <section className={styles.panel}><h2>4. {t("Food allergies","Пищевые аллергии")}</h2><p>{t("If you have allergies, tell us what to avoid. Your order will be clearly marked for the chef.","Если у вас есть аллергии, напишите, каких продуктов избегать. Мы отметим заказ для повара.")}</p><div className={styles.choices}><label><input type="radio" name="allergy" checked={allergy==="none"} onChange={()=>setAllergy("none")}/>{t("I have no known food allergies","У меня нет известных пищевых аллергий")}</label><label><input type="radio" name="allergy" checked={allergy==="declared"} onChange={()=>setAllergy("declared")}/>{t("I have food allergies","У меня есть пищевые аллергии")}</label></div>{allergy==="declared"&&<label>{t("Describe all foods or ingredients you must avoid","Опишите продукты и ингредиенты, которых нужно избегать")}<textarea rows={4} value={allergyDetails} onChange={e=>setAllergyDetails(e.target.value)} placeholder={t("Please be specific…","Укажите подробно…")}/></label>}<div className={styles.warning}>{t("We will flag this order as ALLERGY for the chef. Please contact the organiser directly if you need confirmation that a dish can be prepared safely; cross-contact may still be possible.","Заказ будет отмечен как «АЛЛЕРГИЯ». Если вам требуется подтверждение безопасности блюда, свяжитесь с организатором; перекрёстный контакт возможен.")}</div></section>
 <section className={styles.panel}><h2>5. {t("Special requests","Пожелания к заказу")}</h2><label>{t("Comment for the chef (optional)","Комментарий для повара (необязательно)")}<textarea rows={3} maxLength={500} value={specialRequests} onChange={e=>setSpecialRequests(e.target.value)} placeholder={t("Please leave out mushrooms, thank you…","Пожалуйста, без грибов…")}/></label><small>{t("Requests are not guaranteed; the kitchen will review them.","Пожелания не гарантируются — повар их рассмотрит.")} {specialRequests.length}/500</small></section>
 </div>
 <aside className={styles.summary}><h2>{t("Order review","Проверка заказа")}</h2>{quoting&&<p>{t("Checking current availability…","Проверяем наличие…")}</p>}{quote?.lines.map((x,i)=><div key={i} className={styles.item}><div><strong>{x.name}</strong><small>{x.chef} · {x.quantity} × {dollars(x.unitPriceCents)}</small>{x.optionSummary?.map(o=><small key={o}>{o}</small>)}</div><strong>{dollars(x.totalCents)}</strong></div>)}<div className={styles.total}><strong>{t("Total","Итого")}</strong><strong>{quote?dollars(quote.subtotalCents):"—"}</strong></div>{problem&&<p role="alert" className={styles.error}>{problem}</p>}
 {!status?.enabled&&<p className={styles.setup}><strong>{t("Secure checkout being configured","Настраиваем безопасную оплату")}</strong><span>{t("Payments are not available yet. Your basket remains saved on this device. No charge will be made.","Оплата пока недоступна. Корзина сохранена на этом устройстве. Деньги не списываются.")}</span></p>}
 <button className={styles.pay} disabled={!canPay} onClick={()=>void checkout()}>{paying?t("Connecting to Stripe…","Подключаем Stripe…"):t("Continue to secure payment","Перейти к безопасной оплате")}</button><small>{t("An order is confirmed only after Stripe verifies payment and ticket eligibility is validated.","Заказ подтверждается только после проверки оплаты Stripe и билета.")}</small></aside></div>}
 </div></main>;
}