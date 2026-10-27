"use client";
import {useState} from "react";
import Link from "next/link";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./admin.module.css";
type EventRow={id:string;slug:string;title_en:string;title_ru:string|null;description_en:string|null;description_ru:string|null;starts_at:string;ends_at:string;ordering_opens_at:string|null;ordering_closes_at:string|null;location_text:string|null;external_ticket_url:string|null;is_published:boolean};
type Field=Omit<EventRow,"id"|"is_published">;
const initial:Field={slug:"",title_en:"",title_ru:"",description_en:"",description_ru:"",starts_at:"",ends_at:"",ordering_opens_at:"",ordering_closes_at:"",location_text:"",external_ticket_url:""};
const toLocal=(s:string|null)=>{if(!s)return "";const d=new Date(s);if(Number.isNaN(d.getTime()))return "";const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);};
const fromLocal=(s:string)=>s?new Date(s).toISOString():null;
export default function EventManager({initialEvents,email,initialError}:{initialEvents:EventRow[];email:string;initialError:string}){
 const {lang}=useLanguage();const ru=lang==="ru";
 const [events,setEvents]=useState(initialEvents);const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState<Field>(initial);const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);const [error,setError]=useState(initialError);const [notice,setNotice]=useState("");
 const copy=(en:string,ruText:string)=>ru?ruText:en;
 const change=(name:keyof Field,value:string)=>setForm(old=>({...old,[name]:value}));
 function begin(row?:EventRow){setEditing(row?.id??null);setForm(row?{slug:row.slug,title_en:row.title_en,title_ru:row.title_ru??"",description_en:row.description_en??"",description_ru:row.description_ru??"",starts_at:toLocal(row.starts_at),ends_at:toLocal(row.ends_at),ordering_opens_at:toLocal(row.ordering_opens_at),ordering_closes_at:toLocal(row.ordering_closes_at),location_text:row.location_text??"",external_ticket_url:row.external_ticket_url??""}:initial);setError("");setNotice("");setOpen(true);}
 async function send(payload:object,method:"POST"|"PATCH"){
  setBusy(true);setError("");setNotice("");
  try{const res=await fetch("/api/admin/events",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await res.json();
   if(!res.ok)throw Error(data.error||"Unable to save event");
   window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save event");setBusy(false);}
 }
 function save(e:React.FormEvent){e.preventDefault();
  let payload:any;
  try{payload={...form,starts_at:fromLocal(form.starts_at),ends_at:fromLocal(form.ends_at),ordering_opens_at:fromLocal(form.ordering_opens_at??""),ordering_closes_at:fromLocal(form.ordering_closes_at??"")};}
  catch{setError(copy("Please check the date and time fields.","Проверьте даты и время."));return;}
  if(editing)payload.id=editing;
  void send(payload,editing?"PATCH":"POST");
 }
 async function publish(row:EventRow){if(!row.is_published&&!window.confirm(copy("Publish this event so customers can see it?","Опубликовать событие для покупателей?")))return;
  await send({id:row.id,is_published:!row.is_published},"PATCH");
 }
 const field=(key:keyof Field,label:string,type="text",required=false)=><label className={styles.label} key={key}><span>{label}</span><input type={type} required={required} value={form[key]??""} onChange={e=>change(key,e.target.value)} /></label>;
 return <main className={styles.page}>
  <div className={styles.top}><div><Link href="/account" className={styles.back}>← {copy("My account","Мой аккаунт")}</Link><span className={styles.kicker}>MATRYOSHKA · ADMIN</span><h1>{copy("Event management","Управление событиями")}</h1><p>{copy("Create beautiful celebrations, control availability and publish when ready.","Создавайте события, управляйте доступностью и публикацией.")}</p></div><button className={styles.primary} onClick={()=>begin()}>＋ {copy("New event","Новое событие")}</button></div>
  <div className={styles.stats}><div><small>{copy("Total events","Всего событий")}</small><strong>{events.length}</strong></div><div><small>{copy("Published","Опубликовано")}</small><strong>{events.filter(e=>e.is_published).length}</strong></div><div><small>{copy("Drafts","Черновики")}</small><strong>{events.filter(e=>!e.is_published).length}</strong></div></div>
  <div className={styles.sectionHead}><h2>{copy("Your events","Ваши события")}</h2><span>{email}</span></div>
  {events.length===0?<div className={styles.empty}><span>✿</span><h3>{copy("Your first event starts here","Создайте своё первое событие")}</h3><p>{copy("Add dates, descriptions and a location. Events stay private until you publish them.","Добавьте даты, описание и место. Событие будет скрыто до публикации.")}</p><button onClick={()=>begin()} className={styles.primary}>{copy("Create an event","Создать событие")}</button></div>:<div className={styles.cards}>{events.map(event=><article className={styles.card} key={event.id}><div className={styles.cardHead}><span className={event.is_published?styles.live:styles.draft}>{event.is_published?copy("Published","Опубликовано"):copy("Draft","Черновик")}</span><span className={styles.slug}>/{event.slug}</span></div><h3>{ru?(event.title_ru||event.title_en):event.title_en}</h3><p className={styles.muted}>{new Intl.DateTimeFormat(ru?"ru-NZ":"en-NZ",{dateStyle:"medium",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(event.starts_at))}</p>{event.location_text&&<p className={styles.muted}>⌖ {event.location_text}</p>}<div className={styles.actions}><button onClick={()=>begin(event)}>{copy("Edit details","Редактировать")}</button><button disabled={busy} onClick={()=>void publish(event)}>{event.is_published?copy("Unpublish","Скрыть"):copy("Publish","Опубликовать")}</button><Link href={`/events/${event.slug}`}>{copy("View","Открыть")} ↗</Link></div></article>)}</div>}
  {open&&<div className={styles.overlay} role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="event-editor-title" className={styles.dialog}><div className={styles.dialogHead}><div><span className={styles.kicker}>MATRYOSHKA · EVENTS</span><h2 id="event-editor-title">{editing?copy("Edit event","Редактирование события"):copy("Create an event","Создать событие")}</h2><p>{copy("New events are saved as private drafts.","Новые события сохраняются как черновики.")}</p></div><button type="button" aria-label={copy("Close editor","Закрыть")} onClick={()=>setOpen(false)} className={styles.close}>×</button></div><form onSubmit={save}><div className={styles.formBody}><h3>{copy("Event details","Информация о событии")}</h3><div className={styles.two}>{field("title_en","Event name · English","text",true)}{field("title_ru","Название · Русский")}</div>{field("slug",copy("URL slug (letters, numbers and hyphens)","Адрес страницы (латиница, цифры и дефисы)"),"text",true)}
  <div className={styles.two}><label className={styles.label}><span>Description · English</span><textarea rows={3} value={form.description_en??""} onChange={e=>change("description_en",e.target.value)}/></label><label className={styles.label}><span>Описание · Русский</span><textarea rows={3} value={form.description_ru??""} onChange={e=>change("description_ru",e.target.value)}/></label></div>
  <h3>{copy("Dates and ordering","Даты и приём заказов")}</h3><p className={styles.hint}>{copy("Times are entered in your device's time zone.","Время указывается в часовом поясе устройства.")}</p><div className={styles.two}>{field("starts_at",copy("Event starts","Начало события"),"datetime-local",true)}{field("ends_at",copy("Event ends","Конец события"),"datetime-local",true)}{field("ordering_opens_at",copy("Ordering opens","Начало приёма заказов"),"datetime-local")}{field("ordering_closes_at",copy("Ordering closes","Конец приёма заказов"),"datetime-local")}</div>
  <h3>{copy("Location and links","Место и ссылки")}</h3>{field("location_text",copy("Venue / location","Место проведения"))}{field("external_ticket_url",copy("Ticket link (optional)","Ссылка на билеты (необязательно)"),"url")}
  </div><div className={styles.formFooter}>{error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status">{notice}</p>}<button type="button" className={styles.cancel} onClick={()=>setOpen(false)}>{copy("Cancel","Отмена")}</button><button disabled={busy} type="submit" className={styles.primary}>{busy?copy("Saving…","Сохранение…"):copy("Save event","Сохранить событие")}</button></div></form></section></div>}
 </main>;
}