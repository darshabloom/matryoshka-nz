"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
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
 useEffect(()=>{const controller=new AbortController();if(!slug)return;
  setBusy(true);fetch(`/api/events/${encodeURIComponent(slug)}/dishes`,{signal:controller.signal}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||"Cannot load menu");return x}).then(x=>setData(x)).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});
  return ()=>controller.abort();
 },[slug]);
 const chefs=useMemo(()=>[...new Set(data?.dishes.map(d=>d.vendor_name)??[])].sort(),[data]);
 const categories=useMemo(()=>Array.from(new Map((data?.dishes??[]).flatMap(d=>d.categories).map(c=>[c.slug,c])).values()),[data]);
 const dishes=useMemo(()=>data?.dishes.filter(d=>(chef==="all"||d.vendor_name===chef)&&(category==="all"||d.categories.some(c=>c.slug===category))&&[d.title_en,d.title_ru,d.vendor_name,d.description_en,d.description_ru].join(" ").toLowerCase().includes(search.toLowerCase().trim()))??[],[data,chef,category,search]);
 const e=data?.event,open=e?.ordering_open??false;
 const inEvent=items[0]?.eventId===e?.id;
 return <main className={styles.page}><div className={styles.wrap}>
 <Link className={styles.back} href="/events">← {t("All events","Все события")}</Link>
 {busy&&<p role="status">{t("Loading event food…","Загружаем меню…")}</p>}{error&&<p role="alert" className={styles.alert}>{error}</p>}
 {e&&<><section className={styles.heading}>
 {e.cover_image_url&&<div className={styles.cover}><img src={e.cover_image_url} alt={label(e.title_en,e.title_ru,ru)} /></div>}
 <span className={styles.eyebrow}>MATRYOSHKA · {t("EVENT MENU","МЕНЮ СОБЫТИЯ")}</span><h1>{label(e.title_en,e.title_ru,ru)}</h1><p>{label(e.description_en,e.description_ru,ru)}</p><div className={styles.eventFacts}><span>📅 {new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"full",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(e.starts_at))}</span>{e.location_text&&<span>⌖ {e.location_text}</span>}<span>🍽️ {t("Food provided at event","Еда на мероприятии")}</span></div>
 {Array.isArray(e.gallery_image_urls)&&e.gallery_image_urls.length>0&&<div className={styles.eventGallery}>{e.gallery_image_urls.map((photo,i)=><img src={photo} alt={t("Event photo","Фото события")+" "+(i+1)} key={photo}/>)}</div>}
 <div className={styles.notice}>{open?<><strong>{t("Food ordering is open","Приём заказов открыт")}</strong><p>{e.ordering_closes_at?t("Order by ","Заказать до ")+new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"medium",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(e.ordering_closes_at)):t("Choose your favourites below.","Выберите блюда ниже.")}{e.ticket_required?" · "+t("Valid event ticket required at checkout","Для оплаты нужен билет"):""}</p></>:<><strong>{t("Ordering is not open yet","Заказы сейчас закрыты")}</strong><p>{t("You can build your basket now; payments will become available when the organiser opens ordering.","Можно собрать корзину сейчас, но оплата станет доступна только после открытия заказов.")}</p></>}</div></section>
 <section className={styles.shop}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>✿ HOMEMADE WITH LOVE</span><h2>{t("Explore the menu","Выберите блюда")}</h2><p>{t("Choose dishes from one or more local chefs.","Выбирайте блюда от разных поваров в одном заказе.")}</p></div>{inEvent&&count>0&&<Link className={styles.basketButton} href="/basket">🛒 {t("View basket","Корзина")} ({count}) →</Link>}</div>
 <div className={styles.filters}><label>{t("Search food","Поиск блюд")}<input type="search" value={search} onChange={x=>setSearch(x.target.value)} placeholder={t("Dish or chef…","Блюдо или повар…")}/></label><label>{t("Category","Категория")}<select value={category} onChange={x=>setCategory(x.target.value)}><option value="all">{t("All categories","Все категории")}</option>{categories.map(c=><option key={c.slug} value={c.slug}>{label(c.label_en,c.label_ru,ru)}</option>)}</select></label><label>{t("Chef","Повар")}<select value={chef} onChange={x=>setChef(x.target.value)}><option value="all">{t("All chefs","Все повара")}</option>{chefs.map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
 {dishes.length===0?<div className={styles.empty}>{data.dishes.length?t("No dishes match those filters.","По вашему запросу блюд не найдено."):t("The chefs are preparing this menu. Check back later.","Повара готовят меню. Загляните позже.")}</div>:<div className={styles.grid}>{dishes.map((d:CustomerDish)=><article key={d.menu_item_id} className={styles.card}>
 <Link href={`/events/${encodeURIComponent(e.slug)}/dish/${d.menu_item_id}`} className={styles.image} aria-label={t("View details: ","Подробнее: ")+label(d.title_en,d.title_ru,ru)}>{d.images[0]?<img src={d.images[0]} alt={label(d.title_en,d.title_ru,ru)}/>:<span>✿</span>}</Link>
 <div className={styles.cardBody}><div className={styles.cardChef}>{d.vendor_photo?<img src={d.vendor_photo} alt=""/>:<span className={styles.chefFallback}>✿</span>}<span className={styles.chef}>{d.vendor_name}</span></div>
 <Link href={`/events/${encodeURIComponent(e.slug)}/dish/${d.menu_item_id}`}><h3>{label(d.title_en,d.title_ru,ru)}</h3></Link>
 <p>{label(d.description_en,d.description_ru,ru)}</p>
 <div className={styles.cardBottom}><strong>{t("From ","От ")}{dollars(customerPriceCents(d.price_cents))}</strong><Link href={`/events/${encodeURIComponent(e.slug)}/dish/${d.menu_item_id}`}>{t("Ingredients & details","Состав и описание")} →</Link></div>
 <EventMenuQuickAdd dish={d} event={e}/></div></article>)}</div>}
 </section></>}
 </div></main>
}