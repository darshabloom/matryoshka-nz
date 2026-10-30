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
 const {slug}=useParams<{slug:string}>(),{count,items,subtotal}=useBasket();
 const [data,setData]=useState<EventMenuData|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[chef,setChef]=useState("all"),[category,setCategory]=useState("all");
 const [linkedTicketRef,setLinkedTicketRef]=useState("");

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
 const inEvent=items[0]?.eventId===e?.id;
 return <main className={styles.page}>
 {e&&<Link href="/basket" className={styles.floatingCart} aria-label={t("View cart, ","Открыть корзину, ")+count+t(" items"," товаров")}>
  <span className={styles.cartIcon} aria-hidden="true">🛒{count>0&&<span className={styles.cartBadge}>{count}</span>}</span>
  <span className={styles.cartText}><strong>{t("View cart","Корзина")}</strong><small>{count>0?dollars(subtotal):t("Your basket","Ваш заказ")}</small></span>
  <span className={styles.cartArrow} aria-hidden="true">›</span>
 </Link>}
 <div className={styles.wrap}>
 <Link className={styles.back} href="/events">← {t("All events","Все события")}</Link>
 {busy&&<p role="status">{t("Loading event food…","Загружаем меню…")}</p>}{error&&<p role="alert" className={styles.alert}>{error}</p>}
 {e&&<>{e.slug==="novogodnik26"&&linkedTicketRef&&<aside className={styles.bookingReferenceNote} role="status">
   <span>✓ {t("Booking reference added","Номер брони добавлен")}: <strong>{linkedTicketRef}</strong></span>
   <span>{t("Select your food now. At checkout, use the email of any adult listed on this paid Yumorilnik booking. The system checks it securely before payment.","Выбирайте блюда. При оформлении заказа укажите email любого взрослого из оплаченного бронирования Юморильника. Система безопасно проверит его перед оплатой.")}</span>
  </aside>}<section className={styles.heading}>
 <div className={styles.eventIntro}>
 <div className={styles.eventIntroText}><span className={styles.eyebrow}>MATRYOSHKA · {t("EVENT MENU","МЕНЮ СОБЫТИЯ")}</span><h1>{label(e.title_en,e.title_ru,ru)}</h1><p>{label(e.description_en,e.description_ru,ru)}</p><div className={styles.eventFacts}><span>📅 {new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"full",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(e.starts_at))}</span>{e.location_text&&<span>⌖ {e.location_text}</span>}<span>🍽️ {t("Food delivered to event","Еда с доставкой на мероприятие")}</span></div></div>
 <div className={styles.eventIntroMedia}>{e.cover_image_url&&<div className={styles.cover}><img src={e.cover_image_url} alt={label(e.title_en,e.title_ru,ru)}/></div>}
 <div className={styles.notice}>{open?<><strong>{t("Food ordering is open","Приём заказов открыт")}</strong><p>{e.ordering_closes_at?t("Order by ","Заказать до ")+new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"medium",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(e.ordering_closes_at)):t("Choose your favourites below.","Выберите блюда ниже.")}</p></>:<><strong>{t("Ordering is not open yet","Заказы сейчас закрыты")}</strong><p>{t("You can build your basket now; payment opens later.","Можно собрать корзину сейчас. Оплата откроется позже.")}</p></>}</div>{e.external_ticket_url&&e.slug==="novogodnik26"&&<a className={styles.ticketButton} href={e.external_ticket_url} target="_blank" rel="noopener noreferrer">{t("Book event tickets ↗","Купить билеты на мероприятие ↗")}</a>}</div></div>
 {Array.isArray(e.gallery_image_urls)&&e.gallery_image_urls.length>0&&<div className={styles.eventGallery}>{e.gallery_image_urls.map((photo,i)=><img src={photo} alt={t("Event photo","Фото события")+" "+(i+1)} key={photo}/>)}</div>}
 </section>
 <section className={styles.shop}><div className={styles.sectionHead}><div><span className={styles.menuLabel}>✿ MATRYOSHKA · {t("FRESHLY MADE","ДОМАШНЯЯ КУХНЯ")}</span><h2>{t("Our Event Menu","Меню мероприятия")}</h2><p>{t("Homemade dishes from local chefs, made with love for your celebration.","Домашние блюда от местных поваров, приготовленные с любовью к вашему празднику.")}</p></div></div>
 <div className={styles.filters}><label>{t("Search food","Поиск блюд")}<input type="search" value={search} onChange={x=>setSearch(x.target.value)} placeholder={t("Dish or chef…","Блюдо или повар…")}/></label><label>{t("Category","Категория")}<select value={category} onChange={x=>setCategory(x.target.value)}><option value="all">{t("All categories","Все категории")}</option>{categories.map(c=><option key={c.slug} value={c.slug}>{label(c.label_en,c.label_ru,ru)}</option>)}</select></label><label>{t("Chef","Повар")}<select value={chef} onChange={x=>setChef(x.target.value)}><option value="all">{t("All chefs","Все повара")}</option>{chefs.map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
 {dishes.length===0?<div className={styles.empty}>{data.dishes.length?t("No dishes match those filters.","По вашему запросу блюд не найдено."):t("The chefs are preparing this menu. Check back later.","Повара готовят меню. Загляните позже.")}</div>:<div className={styles.grid}>{orderedDishes.map((d:CustomerDish,i)=><Fragment key={d.menu_item_id}>{(i===0||orderedDishes[i-1].categories[0]?.slug!==d.categories[0]?.slug)&&<h3 className={styles.categoryHeading}><span>{d.categories[0]?label(d.categories[0].label_en,d.categories[0].label_ru,ru):t("Other dishes","Другие блюда")}</span></h3>}<article className={styles.card}>
 <div className={styles.imageFrame}>
  <Link href={`/events/${encodeURIComponent(e.slug)}/dish/${d.menu_item_id}`} className={styles.image} aria-label={t("View details: ","Подробнее: ")+label(d.title_en,d.title_ru,ru)}>{d.images[0]?<img loading="lazy" src={d.images[0]} alt={label(d.title_en,d.title_ru,ru)}/>:<span aria-hidden="true">✿</span>}</Link>
  <div className={styles.chefBadge} title={d.vendor_name}>
   <span className={styles.chefAvatar}>{d.vendor_photo?<img src={d.vendor_photo} alt="" loading="lazy"/>:<span aria-hidden="true">{d.vendor_name?.trim().charAt(0)||"✿"}</span>}</span>
   <span className={styles.chefName}><small>{t("By","От")}</small><strong>{d.vendor_name}</strong></span>
  </div>
 </div>
 <div className={styles.cardBody}>
  <Link href={`/events/${encodeURIComponent(e.slug)}/dish/${d.menu_item_id}`} className={styles.cardTitle}><h3>{label(d.title_en,d.title_ru,ru)}</h3></Link>
  {label(d.description_en,d.description_ru,ru)&&<p className={styles.cardDescription}>{label(d.description_en,d.description_ru,ru)}</p>}
  <div className={styles.cardBottom}><strong>{t("From ","От ")}{dollars(customerPriceCents(d.price_cents))}</strong></div>
  <EventMenuQuickAdd dish={d} event={e}/>
 </div></article></Fragment>)}</div>}
 </section></>}
 </div></main>
}