"use client";
import Link from "next/link";
import {Fragment,useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {useBasket} from "@/components/cart/BasketProvider";
import type {EventMenuData,CustomerDish} from "@/lib/customer-types";
import {dollars,label} from "@/lib/customer-types";
import styles from "./shop.module.css";
import EventMenuQuickAdd from "./EventMenuQuickAdd";
import {customerPriceCents} from "@/lib/customer-pricing";
export default function EventFoodPage(){
 const {lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a;
 const {slug}=useParams<{slug:string}>(),{count,items}=useBasket();
 const [data,setData]=useState<EventMenuData|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[chef,setChef]=useState("all"),[category,setCategory]=useState("all");
 const [linkedTicketRef,setLinkedTicketRef]=useState("");
 const [bookingEmail,setBookingEmail]=useState("");
 const [ticketCheck,setTicketCheck]=useState<"idle"|"checking"|"verified"|"invalid"|"error">("idle");
 useEffect(()=>{const controller=new AbortController();if(!slug)return;
  setBusy(true);fetch(`/api/events/${encodeURIComponent(slug)}/dishes`,{signal:controller.signal}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||"Cannot load menu");return x}).then(x=>setData(x)).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});
  return ()=>controller.abort();
 },[slug]);
 const chefs=useMemo(()=>[...new Set(data?.dishes.map(d=>d.vendor_name)??[])].sort(),[data]);
 const categories=useMemo(()=>Array.from(new Map((data?.dishes??[]).flatMap(d=>d.categories).map(c=>[c.slug,c])).values()),[data]);
 const dishes=useMemo(()=>data?.dishes.filter(d=>(chef==="all"||d.vendor_name===chef)&&(category==="all"||d.categories.some(c=>c.slug===category))&&[d.title_en,d.title_ru,d.vendor_name,d.description_en,d.description_ru].join(" ").toLowerCase().includes(search.toLowerCase().trim()))??[],[data,chef,category,search]);
 const orderedDishes=useMemo(()=>[...dishes].sort((a,b)=>{const ai=categories.findIndex(c=>c.slug===a.categories[0]?.slug),bi=categories.findIndex(c=>c.slug===b.categories[0]?.slug);return ai-bi}),[dishes,categories]);
 const e=data?.event,open=e?.ordering_open??false;
 useEffect(()=>{
  if(!e?.id||e.slug!=="novogodnik26")return;
  try{
   const param=new URLSearchParams(window.location.search).get("ticket_ref")?.trim().toUpperCase()??"";
   const saved=sessionStorage.getItem("matryoshka:ticket_ref:"+e.id)??"";
   const ref=/^YMR-[A-Z0-9-]{5,80}$/.test(param)?param:saved;
   if(/^YMR-[A-Z0-9-]{5,80}$/.test(ref)){
    sessionStorage.setItem("matryoshka:ticket_ref:"+e.id,ref);
    setLinkedTicketRef(ref);
   }
  }catch{}
 },[e?.id,e?.slug]);
 async function verifyTicket(){
  if(!e?.id||ticketCheck==="checking")return;
  const reference=linkedTicketRef.trim().toUpperCase();
  const email=bookingEmail.trim().toLowerCase();
  if(!/^YMR-[A-Z0-9-]{5,80}$/.test(reference)||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){
   setTicketCheck("invalid");return;
  }
  setTicketCheck("checking");
  try{
   const res=await fetch("/api/tickets/verify-yumorilnik",{method:"POST",
    headers:{"Content-Type":"application/json"},cache:"no-store",
    body:JSON.stringify({reference,email})});
   const json=await res.json() as {valid?:boolean};
   if(!res.ok){setTicketCheck("error");return;}
   setTicketCheck(json.valid?"verified":"invalid");
   if(json.valid){
    sessionStorage.setItem("matryoshka:ticket_ref:"+e.id,reference);
    sessionStorage.setItem("matryoshka:ticket_email:"+e.id,email);
   }else sessionStorage.removeItem("matryoshka:ticket_email:"+e.id);
  }catch{setTicketCheck("error");}
 }
 const inEvent=items[0]?.eventId===e?.id;
 return <main className={styles.page}><div className={styles.wrap}>
 <Link className={styles.back} href="/events">← {t("All events","Все события")}</Link>
 {busy&&<p role="status">{t("Loading event food…","Загружаем меню…")}</p>}{error&&<p role="alert" className={styles.alert}>{error}</p>}
 {e&&<>{e.slug==="novogodnik26"&&<section className={styles.ticketVerifyPanel}>
   <h2>{t("Connect your Yumorilnik ticket","Подключите билет Юморильника")}</h2>
   <p>{t("Verify your paid booking before ordering food. The booking number is carried over automatically from Yumorilnik; this check does not charge you.","Подтвердите оплаченное бронирование перед заказом еды. Номер автоматически передаётся с Юморильника; эта проверка ничего не списывает.")}</p>
   <div className={styles.ticketVerifyInputs}>
    <label>{t("Booking reference","Номер брони")}
     <input value={linkedTicketRef} onChange={ev=>{setLinkedTicketRef(ev.target.value.toUpperCase());setTicketCheck("idle")}} placeholder="YMR-…" maxLength={80} autoComplete="off"/>
    </label>
    <label>{t("Email used for the Yumorilnik booking","Email, указанный при бронировании")}
     <input type="email" value={bookingEmail} onChange={ev=>{setBookingEmail(ev.target.value);setTicketCheck("idle")}} placeholder="you@example.com" maxLength={254} autoComplete="email"/>
    </label>
    <button type="button" onClick={()=>void verifyTicket()} disabled={ticketCheck==="checking"}>
     {ticketCheck==="checking"?t("Checking…","Проверяем…"):t("Verify booking","Проверить бронирование")}
    </button>
   </div>
   {ticketCheck==="verified"&&<p className={styles.ticketVerified} role="status">✓ {t("Your paid Yumorilnik booking is verified and linked for food checkout.","Оплаченное бронирование Юморильника проверено и подключено для заказа еды.")}</p>}
   {ticketCheck==="invalid"&&<p className={styles.ticketProblem} role="alert">{t("Booking not verified. Check the booking reference and the exact email used on Yumorilnik.","Бронирование не подтверждено. Проверьте номер и email, указанный на Юморильнике.")}</p>}
   {ticketCheck==="error"&&<p className={styles.ticketProblem} role="alert">{t("Verification temporarily unavailable. Try again later; no payment was taken.","Проверка временно недоступна. Попробуйте позже; оплата не производилась.")}</p>}
  </section>}<section className={styles.heading}>
 <div className={styles.eventIntro}>
 <div className={styles.eventIntroText}><span className={styles.eyebrow}>MATRYOSHKA · {t("EVENT MENU","МЕНЮ СОБЫТИЯ")}</span><h1>{label(e.title_en,e.title_ru,ru)}</h1><p>{label(e.description_en,e.description_ru,ru)}</p><div className={styles.eventFacts}><span>📅 {new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"full",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(e.starts_at))}</span>{e.location_text&&<span>⌖ {e.location_text}</span>}<span>🍽️ {t("Food delivered to event","Еда с доставкой на мероприятие")}</span></div></div>
 <div className={styles.eventIntroMedia}>{e.cover_image_url&&<div className={styles.cover}><img src={e.cover_image_url} alt={label(e.title_en,e.title_ru,ru)}/></div>}
 <div className={styles.notice}>{open?<><strong>{t("Food ordering is open","Приём заказов открыт")}</strong><p>{e.ordering_closes_at?t("Order by ","Заказать до ")+new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"medium",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(e.ordering_closes_at)):t("Choose your favourites below.","Выберите блюда ниже.")}</p></>:<><strong>{t("Ordering is not open yet","Заказы сейчас закрыты")}</strong><p>{t("You can build your basket now; payment opens later.","Можно собрать корзину сейчас. Оплата откроется позже.")}</p></>}</div>{e.external_ticket_url&&e.slug==="novogodnik26"&&<a className={styles.ticketButton} href={e.external_ticket_url} target="_blank" rel="noopener noreferrer">{t("Book event tickets ↗","Купить билеты на мероприятие ↗")}</a>}</div></div>
 {Array.isArray(e.gallery_image_urls)&&e.gallery_image_urls.length>0&&<div className={styles.eventGallery}>{e.gallery_image_urls.map((photo,i)=><img src={photo} alt={t("Event photo","Фото события")+" "+(i+1)} key={photo}/>)}</div>}
 </section>
 <section className={styles.shop}><div className={styles.sectionHead}><div><span className={styles.menuLabel}>{t("Available for this event","Доступно на мероприятии")}</span></div>{inEvent&&count>0&&<Link className={styles.basketButton} href="/basket">🛒 {t("View basket","Корзина")} ({count}) →</Link>}</div>
 <div className={styles.filters}><label>{t("Search food","Поиск блюд")}<input type="search" value={search} onChange={x=>setSearch(x.target.value)} placeholder={t("Dish or chef…","Блюдо или повар…")}/></label><label>{t("Category","Категория")}<select value={category} onChange={x=>setCategory(x.target.value)}><option value="all">{t("All categories","Все категории")}</option>{categories.map(c=><option key={c.slug} value={c.slug}>{label(c.label_en,c.label_ru,ru)}</option>)}</select></label><label>{t("Chef","Повар")}<select value={chef} onChange={x=>setChef(x.target.value)}><option value="all">{t("All chefs","Все повара")}</option>{chefs.map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
 {dishes.length===0?<div className={styles.empty}>{data.dishes.length?t("No dishes match those filters.","По вашему запросу блюд не найдено."):t("The chefs are preparing this menu. Check back later.","Повара готовят меню. Загляните позже.")}</div>:<div className={styles.grid}>{orderedDishes.map((d:CustomerDish,i)=><Fragment key={d.menu_item_id}>{(i===0||orderedDishes[i-1].categories[0]?.slug!==d.categories[0]?.slug)&&<h3 className={styles.categoryHeading}>{d.categories[0]?label(d.categories[0].label_en,d.categories[0].label_ru,ru):t("Other dishes","Другие блюда")}</h3>}<article className={styles.card}>
 <Link href={`/events/${encodeURIComponent(e.slug)}/dish/${d.menu_item_id}`} className={styles.image} aria-label={t("View details: ","Подробнее: ")+label(d.title_en,d.title_ru,ru)}>{d.images[0]?<img src={d.images[0]} alt={label(d.title_en,d.title_ru,ru)}/>:<span>✿</span>}</Link>
 <div className={styles.cardBody}>
 <Link href={`/events/${encodeURIComponent(e.slug)}/dish/${d.menu_item_id}`}><h3>{label(d.title_en,d.title_ru,ru)}</h3></Link>

 <div className={styles.cardBottom}><strong>{t("From ","От ")}{dollars(customerPriceCents(d.price_cents))}</strong></div>
 <EventMenuQuickAdd dish={d} event={e}/></div></article></Fragment>)}</div>}
 </section></>}
 </div></main>
}