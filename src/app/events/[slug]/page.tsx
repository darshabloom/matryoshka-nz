"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Dish = { menu_item_id:string; price_cents:number; title_en:string; title_ru:string|null; description_en:string|null; description_ru:string|null; vendor_name:string; size_options:{id:string;label_en:string;label_ru:string;price_cents:number}[] };
type EventDetails = { title_en:string;title_ru:string|null; description_en:string|null; description_ru:string|null; starts_at:string; location_text:string|null };
export default function EventFoodPage() {
 const { lang } = useLanguage();
 const params = useParams<{slug:string}>();
 const slug = params?.slug;
 const [event,setEvent] = useState<EventDetails|null>(null);
 const [dishes,setDishes] = useState<Dish[]>([]);
 const [loading,setLoading] = useState(true);
 const [selectedSizes,setSelectedSizes] = useState<Record<string,string>>({});
 const [error,setError] = useState(false);
 useEffect(()=>{
  if (!slug) return;
  const controller = new AbortController();
  fetch(`/api/events/${encodeURIComponent(slug)}/dishes`,{signal:controller.signal})
   .then(async res=>{if(!res.ok)throw Error("Not available");return res.json();})
   .then(data=>{if(!controller.signal.aborted){setEvent(data.event);setDishes(data.dishes??[]);}})
   .catch(()=>{if(!controller.signal.aborted)setError(true);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[slug]);
 const pick=(en:string|null,ru:string|null)=>lang==="ru"?(ru||en||""):(en||ru||"");
 return <main style={{maxWidth:1000,margin:"0 auto",padding:"44px 18px"}}>
  <Link href="/events">{lang==="ru"?"← События":"← Events"}</Link>
  {loading&&<p role="status">{lang==="ru"?"Загрузка…":"Loading…"}</p>}
  {error&&<p role="alert">{lang==="ru"?"Событие недоступно.":"Event unavailable."}</p>}
  {event&&<><h1 style={{margin:"24px 0 8px"}}>{pick(event.title_en,event.title_ru)}</h1>
   {event.description_en||event.description_ru?<p>{pick(event.description_en,event.description_ru)}</p>:null}
   {event.location_text&&<p>{event.location_text}</p>}
   <h2 style={{marginTop:32}}>{lang==="ru"?"Меню мероприятия":"Event menu"}</h2>
   {dishes.length===0&&<p>{lang==="ru"?"Пока нет доступных блюд.":"No dishes available yet."}</p>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16,marginTop:18}}>
    {dishes.map(d=><article key={d.menu_item_id} style={{padding:18,border:"1px solid #ddd",borderRadius:12}}>
     <h3>{pick(d.title_en,d.title_ru)}</h3>
     <p>{d.vendor_name}</p>
     <p>{pick(d.description_en,d.description_ru)}</p>
     {d.size_options?.length ? <label style={{display:"grid",gap:6,marginTop:12}}>
      <span>{lang==="ru"?"Размер":"Size"}</span>
      <select required value={selectedSizes[d.menu_item_id]??""} onChange={e=>setSelectedSizes(prev=>({...prev,[d.menu_item_id]:e.target.value}))} style={{padding:10,border:"1px solid #aaa",borderRadius:8,width:"100%"}}>
       <option value="" disabled>{lang==="ru"?"Пожалуйста, выберите размер":"Please choose a size"}</option>
       {d.size_options.map(size=><option key={size.id} value={size.id}>{lang==="ru"?(size.label_ru||size.label_en):size.label_en} — {new Intl.NumberFormat(lang==="ru"?"ru-NZ":"en-NZ",{style:"currency",currency:"NZD"}).format(size.price_cents/100)}</option>)}
      </select>
     </label> : null}
     <strong>{new Intl.NumberFormat(lang==="ru"?"ru-NZ":"en-NZ",{style:"currency",currency:"NZD"}).format((d.size_options?.find(size=>size.id===selectedSizes[d.menu_item_id])?.price_cents??d.price_cents)/100)}</strong>
    </article>)}
   </div>
   <p style={{marginTop:30,opacity:.75}}>{lang==="ru"?"Онлайн-заказы скоро откроются.":"Online ordering coming soon."}</p>
  </>}
 </main>;
}
