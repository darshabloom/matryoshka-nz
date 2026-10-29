"use client";
import {useState} from "react";
import Link from "next/link";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function NewDishEditor(){
 const {lang}=useLanguage(),ru=lang==="ru",t=(a:string,b:string)=>ru?b:a;
 const [name,setName]=useState(""),[description,setDescription]=useState(""),[language,setLanguage]=useState<"en"|"ru">(ru?"ru":"en");
 const [price,setPrice]=useState(""),[ingredients,setIngredients]=useState(""),[allergens,setAllergens]=useState(""),[crossContact,setCrossContact]=useState(""),[portion,setPortion]=useState(""),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function save(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/dishes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,description,language,price,vendor_id:null})});
   const result=await response.json() as {id?:string;error?:string};
   if(!response.ok||!result.id)throw Error(result.error||"Unable to create dish");
   const update=await fetch("/api/dishes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:result.id,action:"edit",name,description,language,price,ingredients,allergens,crossContact,portion,allergenConfirmed:confirmed})});
   if(!update.ok){const detail=await update.json() as {error?:string};throw Error((detail.error||"Could not save full details")+" — dish draft was created. Find it in Food & Menus.");}
   window.location.assign("/dishes/"+result.id);
  }catch(e){setError(e instanceof Error?e.message:"Unable to save dish");setBusy(false)}
 }
 const field="w-full rounded-lg border border-[#cdbdb1] bg-white p-3 text-[#292320]";
 return <main className="min-h-screen bg-[#faf2e9] px-4 py-8 text-[#292320]"><div className="mx-auto max-w-5xl">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link className="underline" href="/admin?tab=food">← {t("Food & Menus","Блюда и меню")}</Link><span className="text-sm">{t("Customer preview · New dish","Предпросмотр для покупателей · Новое блюдо")}</span></div>
  <h1 className="mb-3 text-4xl font-bold text-[#932c27]">{t("Create a dish","Создать блюдо")}</h1><p className="mb-7 text-sm">{t("Enter the full product details here. After saving, the product page opens for photography, options and final review.","Заполните карточку блюда. После сохранения откроется полная страница для фотографий, опций и проверки.")}</p>
  <div className="grid gap-8 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-8">
   <section className="space-y-4"><div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#f4e6da] text-center text-[#8d7162]"><div>✿<p>{t("Photo gallery available after first save","Фото можно добавить после первого сохранения")}</p></div></div>
    <h2 className="break-words text-3xl font-bold">{name||t("Your dish name","Название блюда")}</h2><p className="text-2xl font-semibold text-[#992c28]">NZ$ {Number(price||0).toFixed(2)}</p><p className="whitespace-pre-wrap">{description||t("Description preview","Предпросмотр описания")}</p><p className="text-sm text-[#6f6258]">{portion}</p>
    <p className="text-sm"><strong>{t("Ingredients","Состав")}:</strong> {ingredients||"—"}</p><p className="text-sm"><strong>{t("Allergens","Аллергены")}:</strong> {allergens||"—"}</p>
   </section>
   <form className="space-y-4" onSubmit={e=>{e.preventDefault();void save()}}>
    <label className="block font-semibold">{t("Dish name","Название блюда")}<input required maxLength={160} className={field} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label className="block font-semibold">{t("Language","Язык")}<select className={field} value={language} onChange={e=>setLanguage(e.target.value as "en"|"ru")}><option value="en">English</option><option value="ru">Русский</option></select></label>
    <label className="block font-semibold">{t("Price (NZD)","Цена (NZD)")}<input required min="0" max="100000" step="0.01" type="number" className={field} value={price} onChange={e=>setPrice(e.target.value)}/></label>
    <label className="block font-semibold">{t("Description","Описание")}<textarea rows={3} className={field} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <label className="block font-semibold">{t("Ingredients","Состав")}<textarea rows={3} className={field} value={ingredients} onChange={e=>setIngredients(e.target.value)}/></label>
    <label className="block font-semibold">{t("Allergen statement","Информация об аллергенах")}<textarea rows={2} className={field} value={allergens} onChange={e=>setAllergens(e.target.value)}/></label>
    <label className="block font-semibold">{t("Cross-contact information","Перекрёстный контакт")}<textarea rows={2} className={field} value={crossContact} onChange={e=>setCrossContact(e.target.value)}/></label>
    <label className="block font-semibold">{t("Portion / serving size","Размер порции")}<input className={field} value={portion} onChange={e=>setPortion(e.target.value)}/></label>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t("I have reviewed the ingredient and allergen information.","Я проверила информацию о составе и аллергенах.")}</label>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-[#982d29] px-5 py-4 font-bold text-white disabled:opacity-50">{busy?t("Saving…","Сохраняем…"):t("Save draft & open full editor","Сохранить и открыть полную карточку")}</button>
   </form>
  </div></div></main>;
}
