"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function ChefPhotoUpload({vendorId,name,image}:{vendorId:string;name:string;image:string|null}){
 const [photo,setPhoto]=useState(image??""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const router=useRouter(),{lang}=useLanguage(),ru=lang==="ru";
 async function upload(file:File){
  setBusy(true);setError("");
  const form=new FormData();form.set("vendor_id",vendorId);form.set("file",file);
  try{
   const response=await fetch("/api/chef-photo",{method:"POST",body:form});
   const result=await response.json();
   if(!response.ok||!result.url)throw Error(result.error||"Upload failed");
   setPhoto(result.url);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false)}
 }
 return <section className="chefPhotoPanel"><h2>{ru?"Фото повара":"Chef profile photo"}</h2><div className="chefPhotoFlex">
 {photo?<img src={photo} alt={name}/>:<div className="chefPhotoPlaceholder">{name[0]}</div>}
 <label>{ru?"Загрузить фотографию":"Upload profile photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/><small>{ru?"JPG, PNG, WebP · до 5 МБ":"JPG, PNG, WebP · maximum 5 MB"}</small></label>
 </div>{busy&&<p>{ru?"Загружаем…":"Uploading…"}</p>}{error&&<p role="alert">{error}</p>}</section>;
}
