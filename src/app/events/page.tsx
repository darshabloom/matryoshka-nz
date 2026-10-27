"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Event = {
 id: string; slug: string; title_en: string; title_ru: string | null;
 description_en: string | null; description_ru: string | null;
 starts_at: string; ends_at: string; location_text: string | null;
 ordering_opens_at: string | null; ordering_closes_at: string | null;
};
export default function EventsPage() {
 const { lang } = useLanguage();
 const [events, setEvents] = useState<Event[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);
 useEffect(() => {
  const controller = new AbortController();
  fetch("/api/events", { signal: controller.signal })
   .then(async (res) => { if (!res.ok) throw new Error("Unable to load events"); return res.json(); })
   .then((data) => { if (!controller.signal.aborted) setEvents(data.events ?? []); })
   .catch(() => { if (!controller.signal.aborted) setError(true); })
   .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  return () => controller.abort();
 }, []);
 return <main style={{maxWidth:1000,margin:"0 auto",padding:"44px 18px"}}>
  <Link href="/">{lang==="ru"?"← Главная":"← Home"}</Link>
  <h1 style={{margin:"22px 0"}}>{lang==="ru"?"События":"Events"}</h1>
  {loading && <p role="status">{lang==="ru"?"Загрузка…":"Loading…"}</p>}
  {error && <p role="alert">{lang==="ru"?"Не удалось загрузить события.":"Could not load events."}</p>}
  {!loading && !error && events.length===0 && <p>{lang==="ru"?"Пока нет опубликованных событий.":"No published events yet."}</p>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
   {events.map((event)=><Link href={`/events/${encodeURIComponent(event.slug)}`} key={event.id} style={{border:"1px solid #ddd",padding:18,borderRadius:12}}>
    <h2 style={{fontSize:21,marginBottom:8}}>{lang==="ru"?(event.title_ru||event.title_en):event.title_en}</h2>
    <p>{new Intl.DateTimeFormat(lang==="ru"?"ru-NZ":"en-NZ",{dateStyle:"medium",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(event.starts_at))}</p>
    {event.location_text && <p>{event.location_text}</p>}
    <p style={{marginTop:12,fontWeight:700}}>{lang==="ru"?"Смотреть еду →":"View food →"}</p>
   </Link>)}
  </div>
 </main>;
}
