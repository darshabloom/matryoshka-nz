"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./events.module.css";
type Event={id:string;slug:string;title_en:string;title_ru:string|null;description_en:string|null;description_ru:string|null;starts_at:string;location_text:string|null;cover_image_url:string|null};
export default function EventsPage(){
 const {lang}=useLanguage(),ru=lang==="ru";
 const [events,setEvents]=useState<Event[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 useEffect(()=>{const c=new AbortController();fetch("/api/events",{signal:c.signal}).then(async r=>{if(!r.ok)throw Error("Events unavailable");return r.json()}).then(r=>setEvents(r.events??[])).catch(()=>{if(!c.signal.aborted)setError(true)}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort()},[]);
 return <main className={styles.page}><Link href="/">{ru?"← Главная":"← Home"}</Link><p className={styles.eyebrow}>{ru?"СКОРО":"COMING SOON"}</p><h1>{ru?"Предстоящие события":"Upcoming events"}</h1>
 {loading&&<p role="status">{ru?"Загружаем…":"Loading…"}</p>}{error&&<p role="alert">{ru?"Не удалось загрузить события":"Could not load events"}</p>}
 {!loading&&!error&&!events.length&&<p className={styles.empty}>{ru?"Скоро здесь появятся события.":"No published events yet."}</p>}
 <div className={styles.grid}>{events.map(e=><Link key={e.id} href={`/events/${encodeURIComponent(e.slug)}`} className={styles.card}>
 <div className={styles.poster}>{e.cover_image_url?<img src={e.cover_image_url} alt={ru?e.title_ru||e.title_en:e.title_en}/>:<span aria-hidden="true">✿</span>}</div>
 <div className={styles.info}><span className={styles.date}>{new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"full",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(e.starts_at))}</span>
 <h2>{ru?e.title_ru||e.title_en:e.title_en}</h2>{e.location_text&&<span className={styles.venue}>⌖ {e.location_text}</span>}<span className={styles.button}>{ru?"Подробнее":"Details"} →</span></div>
 </Link>)}</div></main>;
}
