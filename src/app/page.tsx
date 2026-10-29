"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Vendor } from "@/lib/types";
import type {EventMenuData,CustomerDish} from "@/lib/customer-types";
import EventMenuQuickAdd from "./events/[slug]/EventMenuQuickAdd";
import styles from "./page.module.css";

type Dish = {id:string;name_en:string;name_ru:string;description_en:string;description_ru:string;price_cents:number;chef:string;chef_slug:string;chef_photo:string|null;image:string|null;categories:{slug:string;label_en:string;label_ru:string|null}[];ready:boolean};
type ShopDish={dish:CustomerDish;event:EventMenuData["event"]};
type PublicEvent = { id:string;slug:string; title_en:string;title_ru:string|null;starts_at:string };
const photos = {
 hero:"https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg",
 sets:"https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
 snacks:"https://images.pexels.com/photos/1435907/pexels-photo-1435907.jpeg",
 salads:"https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg",
 mains:"https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg",
 desserts:"https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
};
export default function HomePage(){
 const {lang}=useLanguage();
 const ru=lang==="ru";
 const [chefs,setChefs]=useState<Vendor[]>([]);
 const [events,setEvents]=useState<PublicEvent[]>([]);
 const [menu,setMenu]=useState<Dish[]>([]);
 const [shopDishes,setShopDishes]=useState<Record<string,ShopDish>>({});
 const [category,setCategory]=useState("all");
 const [q,setQ]=useState("");
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  Promise.all([
   fetch("/api/chefs?lang=en&q=&area=all&cuisine=all",{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("chefs");return r.json()}),
   fetch("/api/events",{signal:controller.signal}).then(async r=>r.ok?r.json():{events:[]}),
   fetch("/api/public-menu",{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("menu");return r.json()})
  ]).then(async([c,e,m])=>{if(controller.signal.aborted)return;
   setChefs(c.chefs??[]);setEvents(e.events??[]);setMenu(m.dishes??[]);
   const menus=await Promise.all((e.events??[]).slice(0,8).map(async(event:PublicEvent)=>{
    try{const r=await fetch("/api/events/"+encodeURIComponent(event.slug)+"/dishes",{signal:controller.signal});if(!r.ok)return null;return await r.json() as EventMenuData}catch{return null}
   }));
   if(!controller.signal.aborted){
    const available:Record<string,ShopDish>={};
    for(const result of menus)if(result?.event)for(const dish of result.dishes){
     if(!available[dish.menu_item_id])available[dish.menu_item_id]={dish,event:result.event};
    }
    setShopDishes(available);
   }
  })
   .catch(()=>{if(!controller.signal.aborted)setError(true);})
   .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return ()=>controller.abort();
 },[]);
 const categories=useMemo(()=>Array.from(new Map(menu.flatMap(d=>d.categories).map(c=>[c.slug,c])).values()),[menu]);
 const filtered=useMemo(()=>{const search=q.toLocaleLowerCase().trim();return menu.filter(d=>(category==="all"||d.categories.some(c=>c.slug===category))&&(!search||[d.name_en,d.name_ru,d.chef,d.description_en,d.description_ru].join(" ").toLocaleLowerCase().includes(search)))},[menu,q,category]);
 return <main className={styles.site}>
  <section className={styles.hero} id="home" style={{backgroundImage:`linear-gradient(90deg,rgba(19,13,8,.87),rgba(19,13,8,.45) 54%,rgba(19,13,8,.08)),url("${photos.hero}")`}}>
   <div className={styles.heroContent}>
    <span className={styles.eyebrow}>MATRYOSHKA · HOMEMADE FOOD</span>
    <h1>{ru?"Настоящая домашняя еда":"Authentic Homemade Food"}</h1>
    <p>{ru?"Традиционные рецепты. Настоящие люди. Приготовлено с любовью.":"Traditional recipes. Real people. Made with love."}</p>
    <div className={styles.heroActions}>
     <a href="#events" className={styles.button}>{ru?"Заказать еду к событию":"Order Food for an Event"} <span aria-hidden="true">→</span></a>
     <a href="#dishes" className={styles.secondaryButton}>{ru?"Посмотреть всю еду":"Explore All Food"}</a>
    </div>
   </div>
  </section>
  <section className={styles.benefits} aria-label={ru?"Наши ценности":"Our values"}>
   {[
    ["❧",ru?"Домашние рецепты":"Homemade recipes",ru?"Традиционный вкус":"Traditional tastes"],
    ["♣",ru?"Талантливые повара":"Talented home chefs",ru?"Готовят с душой":"Prepared with passion"],
    ["♥",ru?"Свежие продукты":"Fresh ingredients",ru?"Качество прежде всего":"Quality you can trust"],
    ["✿",ru?"Объединяем людей":"Bringing people together",ru?"Еда для любого повода":"Food for every occasion"]
   ].map(([symbol,title,subtitle])=><div className={styles.benefit} key={title}><span className={styles.benefitIcon}>{symbol}</span><strong>{title}</strong><small>{subtitle}</small></div>)}
  </section>
  <section className={styles.section} id="events">
   <div className={styles.heading}><span className={styles.flourish}>❧</span><h2>{ru?"Закажите еду к событию":"Order Food for an Event"}</h2><p>{ru?"Выберите событие, чтобы увидеть доступные блюда.":"Choose your event to see the food available for it."}</p></div>
   {events.length>0?<div className={styles.eventRow}>{events.map(e=><Link key={e.id} className={styles.eventCard} href={`/events/${e.slug}`}><strong>{ru?(e.title_ru||e.title_en):e.title_en}</strong><span>{new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{day:"numeric",month:"long",year:"numeric",timeZone:"Pacific/Auckland"}).format(new Date(e.starts_at))}</span><span className={styles.eventAction}>{ru?"Посмотреть меню":"Browse event menu"} →</span></Link>)}</div>:<div className={styles.empty}>{ru?"Новые события скоро появятся.":"Upcoming events will appear here soon."} <Link href="/events">{ru?"Все события":"All events"} →</Link></div>}
  </section>
  <section className={styles.section} id="menu">
   <div className={styles.heading}><span className={styles.flourish}>❧</span><h2>{ru?"Наше меню":"Our Menu"}</h2><p>{ru?"Откройте для себя домашние блюда от наших поваров.":"Explore homemade dishes prepared by our talented chefs."}</p></div>
   <div className={styles.realCategories}><button type="button" className={category==="all"?styles.activeCategory:styles.categoryButton} onClick={()=>{setCategory("all");document.getElementById("dishes")?.scrollIntoView({behavior:"smooth"})}}>{ru?"Все блюда":"All dishes"}</button>{categories.map(c=><button type="button" key={c.slug} className={category===c.slug?styles.activeCategory:styles.categoryButton} onClick={()=>{setCategory(c.slug);document.getElementById("dishes")?.scrollIntoView({behavior:"smooth"})}}>{ru?c.label_ru||c.label_en:c.label_en}</button>)}</div>
   <p className={styles.categoryNote}>{ru?"Меню составлено из настоящих блюд поваров, без вымышленных позиций.":"Our menu uses actual chef dishes, not stock-photo placeholders."}</p>
  </section>
  <section className={styles.section} id="dishes">
   <div className={styles.heading}><span className={styles.flourish}>❧</span><h2>{ru?"Домашние блюда":"Homemade dishes"}</h2><p>{ru?"Выбирайте блюда от наших поваров.":"See what our home chefs are making."}</p></div>
   <div className={styles.searchRow}><label className={styles.srOnly} htmlFor="food-search">{ru?"Поиск блюд":"Search dishes"}</label><input id="food-search" value={q} onChange={e=>setQ(e.target.value)} placeholder={ru?"Найти блюдо или повара…":"Search food or chefs…"} /></div>
   {busy?<p role="status" className={styles.empty}>{ru?"Загрузка меню…":"Loading menu…"}</p>:error?<p role="alert" className={styles.empty}>{ru?"Не удалось загрузить меню.":"Unable to load the menu."}</p>:filtered.length===0?<p className={styles.empty}>{q||category!=="all"?(ru?"Ничего не найдено.":"No matching dishes."):(ru?"Повара готовят меню. Блюда появятся после проверки.":"Our chefs are preparing the menu. Dishes appear after review.")}</p>:<div className={styles.dishGrid}>{filtered.map(d=>{
    const offer=shopDishes[d.id];const title=ru?d.name_ru||d.name_en:d.name_en||d.name_ru;
    return <article key={d.id} className={styles.dishCard}>
     <div className={styles.dishImage}>{d.image?<img src={d.image} alt={title} loading="lazy"/>:<span aria-hidden="true">✿</span>}</div>
     <div className={styles.dishInfo}><Link href={`/chef/${d.chef_slug}`} className={styles.chefTag}>{d.chef_photo?<img src={d.chef_photo} alt=""/>:null}{d.chef}</Link>
      <h3>{title}</h3><p>{ru?d.description_ru||d.description_en:d.description_en||d.description_ru}</p>
      <div className={styles.dishBottom}><strong>{new Intl.NumberFormat("en-NZ",{style:"currency",currency:"NZD"}).format(d.price_cents/100)}</strong><span>{ru?"От":"From"}</span></div>
      {offer?<><EventMenuQuickAdd dish={offer.dish} event={offer.event}/><Link className={styles.dishDetailLink} href={`/events/${encodeURIComponent(offer.event.slug)}/dish/${d.id}`}>{ru?"Состав и описание":"Ingredients & details"} →</Link></>
       :<div className={styles.preparing}>{d.ready?(ru?"Доступно при открытии заказа на событие":"Available when event ordering opens"):(ru?"Готовим к продаже · уточняем состав":"Preparing for sale · ingredients under review")}</div>}
     </div></article>
   })}</div>}
   <p className={styles.note}>{ru?"Корзину можно собрать для доступных событий. Оплата откроется только после проверки билета и подтверждения организатора.":"Build a basket for eligible events; payment stays closed until the organiser opens orders and validates tickets."}</p>
  </section>
  <section className={styles.section} id="chefs">
   <div className={styles.heading}><span className={styles.flourish}>❧</span><h2>{ru?"Наши повара":"Our Chefs"}</h2><p>{ru?"Знакомьтесь с людьми, которые готовят для вас.":"Meet the people behind your favourite homemade dishes."}</p></div>
   <div className={styles.chefs}>{chefs.map(c=><Link className={styles.chefCard} key={c.slug} href={`/chef/${c.slug}`}><div className={styles.chefAvatar}>{c.heroImage?<img src={c.heroImage} alt="" loading="lazy"/>:"✿"}</div><strong>{c.name}</strong><small>{ru?(c.tagline?.ru||c.description.ru):(c.tagline?.en||c.description.en)}</small></Link>)}</div>
  </section>
  <section className={styles.how} id="how-it-works"><h2>{ru?"Как это работает":"How it works"}</h2><div className={styles.howGrid}>{[[ru?"1. Выберите":"1. Explore",ru?"Найдите любимые блюда":"Find food you love"],[ru?"2. Закажите":"2. Order",ru?"Настройте и оформите заказ":"Customise and order"],[ru?"3. Наслаждайтесь":"3. Enjoy",ru?"Получите домашнюю еду":"Enjoy homemade food"]].map(([a,b])=><div key={a}><strong>{a}</strong><span>{b}</span></div>)}</div></section>
  <footer className={styles.footer} id="contact"><strong>Matryoshka</strong><span>{ru?"Домашняя еда с любовью":"Homemade food with love"}</span><span>© {new Date().getFullYear()} Matryoshka NZ</span></footer>
 </main>
}
