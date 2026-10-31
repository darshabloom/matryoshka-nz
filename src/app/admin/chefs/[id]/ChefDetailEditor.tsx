import type {ReactNode} from "react";
"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
type Translation={lang:string;tagline:string|null;description:string|null;about:string|null};
type Chef={id:string;display_name:string;slug:string;phone:string|null;instagram_handle:string|null;hero_image_url:string|null;area_code:string|null;vendor_translations:Translation[]};
type Dish={id:string;vendor_id:string|null;approval_status:string;price_cents?:number;menu_item_translations:{lang:string;name:string}[]};
export default function ChefDetailEditor({chef,dishes,available,googleLink}:{chef:Chef;dishes:Dish[];available:Dish[];googleLink?:ReactNode}){
 const {lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a,router=useRouter();
 const tr=(l:string)=>chef.vendor_translations.find(x=>x.lang===l);
 const [name,setName]=useState(chef.display_name),[slug,setSlug]=useState(chef.slug),[phone,setPhone]=useState(chef.phone??""),[instagram,setInstagram]=useState(chef.instagram_handle??""),[image,setImage]=useState(chef.hero_image_url??""),[area,setArea]=useState(chef.area_code??"");
 const [enDesc,setEnDesc]=useState(tr("en")?.description??""),[ruDesc,setRuDesc]=useState(tr("ru")?.description??""),[enTag,setEnTag]=useState(tr("en")?.tagline??""),[ruTag,setRuTag]=useState(tr("ru")?.tagline??""),[enAbout,setEnAbout]=useState(tr("en")?.about??""),[ruAbout,setRuAbout]=useState(tr("ru")?.about??"");
 const [dishId,setDishId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const field="w-full rounded-lg border border-[#d8c9bf] bg-white p-3";
 const dishName=(d:Dish)=>d.menu_item_translations.find(x=>x.lang===lang)?.name||d.menu_item_translations[0]?.name||"Untitled";
 async function save(payload:Record<string,unknown>){setBusy(true);setError("");setMessage("");try{
  const res=await fetch("/api/admin/chef-details",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({vendor_id:chef.id,...payload})});
  const data=await res.json() as {error?:string};if(!res.ok)throw Error(data.error||"Unable to save");
  setMessage(t("Saved successfully","Сохранено"));router.refresh();
 }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 return <div className="space-y-7 py-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-4xl font-bold text-[#982d29]">{name}</h1><p className="text-sm text-[#796b62]">/{slug} · {t("Chef profile","Профиль повара")}</p></div><Link className="rounded-lg border border-[#a32d27] px-4 py-3 text-[#a32d27]" href={"/chefs/"+chef.slug}>{t("View public page","Открыть страницу повара")}</Link></div>
 <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-2xl font-bold">{t("Edit chef profile","Редактирование профиля")}</h2><div className="grid gap-4 md:grid-cols-2">
 {([[t("Display name","Имя повара"),name,setName],[t("Profile URL","Адрес профиля"),slug,setSlug],[t("Phone","Телефон"),phone,setPhone],["Instagram",instagram,setInstagram],[t("Image URL","Ссылка на фото"),image,setImage],[t("Area code","Район"),area,setArea],[t("English tagline","Слоган по-английски"),enTag,setEnTag],[t("Russian tagline","Слоган по-русски"),ruTag,setRuTag]] as [string,string,(v:string)=>void][]).map(([label,value,change])=><label key={label} className="text-sm font-semibold">{label}<input className={field} value={value} onChange={e=>change(e.target.value)}/></label>)}
 <label>{t("English description","Описание на английском")}<textarea className={field} rows={3} value={enDesc} onChange={e=>setEnDesc(e.target.value)}/></label>
 <label>{t("Russian description","Описание на русском")}<textarea className={field} rows={3} value={ruDesc} onChange={e=>setRuDesc(e.target.value)}/></label>
 <label>{t("English about","О поваре на английском")}<textarea className={field} rows={4} value={enAbout} onChange={e=>setEnAbout(e.target.value)}/></label>
 <label>{t("Russian about","О поваре на русском")}<textarea className={field} rows={4} value={ruAbout} onChange={e=>setRuAbout(e.target.value)}/></label>
 </div><button disabled={busy} className="mt-5 rounded-lg bg-[#a32d27] px-5 py-3 font-bold text-white disabled:opacity-50" onClick={()=>void save({action:"profile",name,slug,phone,instagram,image,area,en_description:enDesc,ru_description:ruDesc,en_tagline:enTag,ru_tagline:ruTag,en_about:enAbout,ru_about:ruAbout})}>{t("Save chef profile","Сохранить профиль")}</button></section>
 {googleLink}
 <section className="rounded-xl bg-white p-6 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{t("Chef's dishes","Блюда повара")} ({dishes.length})</h2><Link href={"/dishes/new?chef="+chef.id} className="rounded-lg bg-[#a32d27] px-4 py-3 font-semibold text-white">{t("Create a dish","Создать блюдо")}</Link></div>
 <div className="space-y-3">{dishes.length===0?<p>{t("No dishes assigned yet.","Пока нет закреплённых блюд.")}</p>:dishes.map(d=><div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong>{dishName(d)}</strong><p className="text-sm text-[#796b62]">{d.approval_status}</p></div><div className="flex gap-3"><Link className="underline" href={"/dishes/"+d.id}>{t("Edit","Редактировать")}</Link>{d.approval_status==="draft"&&<button disabled={busy} className="text-[#a32d27] underline" onClick={()=>void save({action:"unassign",dish_id:d.id})}>{t("Unassign","Открепить")}</button>}</div></div>)}</div>
 <div className="mt-6 flex flex-wrap items-end gap-3"><label className="min-w-[220px] flex-1 text-sm">{t("Assign an unassigned draft dish","Прикрепить свободное блюдо")}<select className={field} value={dishId} onChange={e=>setDishId(e.target.value)}><option value="">{t("Choose a draft dish","Выберите черновик")}</option>{available.filter(d=>d.approval_status==="draft").map(d=><option key={d.id} value={d.id}>{dishName(d)}</option>)}</select></label><button disabled={busy||!dishId} className="rounded-lg bg-[#a32d27] px-5 py-3 font-semibold text-white disabled:opacity-50" onClick={()=>void save({action:"assign",dish_id:dishId})}>{t("Assign dish","Назначить блюдо")}</button></div>
 </section>{error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}{message&&<p role="status" className="rounded bg-green-50 p-3">{message}</p>}</div>;
}
