"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Vendor } from "@/lib/types";
import styles from "./page.module.css";

type Dish = { id:string; name:string; description:string; price:number; chef:string; slug:string };
type PublicEvent = { id:string;slug:string; title_en:string;title_ru:string|null;starts_at:string };
const photos = {
 hero:"https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg",
 sets:"https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
 snacks:"https://images.pexels.com/photos/1435907/pexels-photo-1435907.jpeg",
 salads:"https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg",
 mains:"https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg",
 desserts:"https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
};
const categories=[
 {key:"sets",en:"Sets",ru:"Наборы",image:photos.sets},
 {key:"snacks",en:"Snacks",ru:"Закуски",image:photos.snacks},
 {key:"salads",en:"Salads",ru:"Салаты",image:photos.salads},
 {key:"mains",en:"Main dishes",ru:"Основные блюда",image:photos.mains},
 {key:"desserts",en:"Desserts",ru:"Десерты",image:photos.desserts},
];

export default function HomePage(){
 const {lang}=useLanguage();
 const ru=lang==="ru";
 const [chefs,setChefs]=useState<Vendor[]>([]);
 const [events,setEvents]=useState<PublicEvent[]>([]);
 const [q,setQ]=useState("");
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  Promise.all([
   fetch("/api/chefs?lang=en&q=&area=all&cuisine=all",{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("chefs");return r.json()}),
   fetch("/api/events",{signal:controller.signal}).then(async r=>r.ok?r.json():{events:[]})
  ]).then(([c,e])=>{if(!controller.signal.aborted){setChefs(c.chefs??[]);setEvents(e.events??[]);}})
   .catch(()=>{if(!controller.signal.aborted)setError(true);})
   .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return ()=>controller.abort();
 },[]);
 const dishes=useMemo<Dish[]>(()=>chefs.flatMap(c=>c.menu.map(i=>({
  id:i.id,name:(ru?i.name.ru:i.name.en)||(ru?i.name.en:i.name.ru),
  description:(ru?i.description?.ru:i.description?.en)||(ru?i.description?.en:i.description?.ru)||"",
  price:i.price_cents,chef:c.name,slug:c.slug
 }))),[chefs,ru]);
 const filtered=useMemo(()=>{const s=q.toLocaleLowerCase().trim();return s?dishes.filter(d=>[d.name,d.chef,d.description].join(" ").toLocaleLowerCase().includes(s)):dishes},[dishes,q]);
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
   <div className={styles.categories}>{categories.map(c=><a key={c.key} href="#dishes" className={styles.category}><img src={c.image} alt="" loading="lazy"/><span>{ru?c.ru:c.en}<span aria-hidden="true">→</span></span></a>)}</div>
  </section>
  <section className={styles.section} id="dishes">
   <div className={styles.heading}><span className={styles.flourish}>❧</span><h2>{ru?"Домашние блюда":"Homemade dishes"}</h2><p>{ru?"Выбирайте блюда от наших поваров.":"See what our home chefs are making."}</p></div>
   <div className={styles.searchRow}><label className={styles.srOnly} htmlFor="food-search">{ru?"Поиск блюд":"Search dishes"}</label><input id="food-search" value={q} onChange={e=>setQ(e.target.value)} placeholder={ru?"Найти блюдо или повара…":"Search food or chefs…"} /></div>
   {busy?<p role="status" className={styles.empty}>{ru?"Загрузка меню…":"Loading menu…"}</p>:error?<p role="alert" className={styles.empty}>{ru?"Не удалось загрузить меню.":"Unable to load the menu."}</p>:filtered.length===0?<p className={styles.empty}>{q?(ru?"Ничего не найдено.":"No matching dishes."):(ru?"Скоро здесь появятся новые блюда.":"New dishes will be available here soon.")}</p>:<div className={styles.dishGrid}>{filtered.slice(0,12).map(d=><Link href={`/chef/${d.slug}`} key={d.id} className={styles.dishCard}><div className={styles.dishImage} aria-hidden="true">✿</div><div className={styles.dishInfo}><span className={styles.chefTag}>{d.chef}</span><h3>{d.name}</h3><p>{d.description}</p><div className={styles.dishBottom}><strong>{new Intl.NumberFormat(ru?"ru-NZ":"en-NZ",{style:"currency",currency:"NZD"}).format(d.price/100)}</strong><span>{ru?"Подробнее":"View dish"} →</span></div></div></Link>)}</div>}
   <p className={styles.note}>{ru?"Онлайн-заказ и оплата находятся в разработке.":"Online ordering and payments are being prepared."}</p>
  </section>
  <section className={styles.section} id="chefs">
   <div className={styles.heading}><span className={styles.flourish}>❧</span><h2>{ru?"Наши повара":"Our Chefs"}</h2><p>{ru?"Знакомьтесь с людьми, которые готовят для вас.":"Meet the people behind your favourite homemade dishes."}</p></div>
   <div className={styles.chefs}>{chefs.map(c=><Link className={styles.chefCard} key={c.slug} href={`/chef/${c.slug}`}><div className={styles.chefAvatar}>{c.heroImage?<img src={c.heroImage} alt="" loading="lazy"/>:"✿"}</div><strong>{c.name}</strong><small>{ru?(c.tagline?.ru||c.description.ru):(c.tagline?.en||c.description.en)}</small></Link>)}</div>
  </section>
  <section className={styles.how} id="how-it-works"><h2>{ru?"Как это работает":"How it works"}</h2><div className={styles.howGrid}>{[[ru?"1. Выберите":"1. Explore",ru?"Найдите любимые блюда":"Find food you love"],[ru?"2. Закажите":"2. Order",ru?"Настройте и оформите заказ":"Customise and order"],[ru?"3. Наслаждайтесь":"3. Enjoy",ru?"Получите домашнюю еду":"Enjoy homemade food"]].map(([a,b])=><div key={a}><strong>{a}</strong><span>{b}</span></div>)}</div></section>
  <footer className={styles.footer} id="contact"><strong>Matryoshka</strong><span>{ru?"Домашняя еда с любовью":"Homemade food with love"}</span><span>© {new Date().getFullYear()} Matryoshka NZ</span></footer>
 </main>
}
