"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./onboarding.module.css";
export default function Onboard(){
 const {lang}=useLanguage(),ru=lang==="ru",router=useRouter();
 const [name,setName]=useState(""),[description,setDescription]=useState(""),[language,setLanguage]=useState<"en"|"ru">(lang==="ru"?"ru":"en");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[checking,setChecking]=useState(true);
 useEffect(()=>{const sb=createSupabaseBrowserClient();sb.auth.getUser().then(async({data:{user}})=>{if(!user){router.replace("/sign-in");return}const {data}=await sb.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);if(data?.length){router.replace("/chef-dashboard");return}setChecking(false)})},[router]);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");
  const sb=createSupabaseBrowserClient();const {error}=await sb.rpc("register_chef_profile_simple",{p_name:name,p_description:description,p_language:language});
  if(error){setError(error.message);setBusy(false);return}router.replace("/chef-dashboard");router.refresh();
 }
 if(checking)return <main className={styles.page}><p className={styles.loading}>Loading / Загрузка…</p></main>;
 return <main className={styles.page}><div className={styles.wrap}>
 <div className={styles.intro}><span className={styles.eyebrow}>MATRYOSHKA · CHEFS</span><h1>{ru?"Готовьте вместе с нами":"Share your cooking with us"}</h1><p>{ru?"Создайте профиль кухни и подавайте заявки на участие в событиях Матрёшки.":"Create a kitchen profile and apply to share your food at Matryoshka events."}</p><div className={styles.steps}><div><b>01</b><strong>{ru?"Создайте профиль":"Create your profile"}</strong></div><div><b>02</b><strong>{ru?"Подайте заявку":"Apply to an event"}</strong></div><div><b>03</b><strong>{ru?"Получите одобрение":"Get approved"}</strong></div></div></div>
 <form className={styles.form} onSubmit={save}><span className={styles.eyebrow}>{ru?"НАЧНЁМ":"LET'S GET STARTED"}</span><h2>{ru?"Расскажите о своей кухне":"Tell us about your kitchen"}</h2><p>{ru?"Для начала нужна только основная информация. Ссылку на профиль мы создадим автоматически.":"Just a few details to begin. Your profile link will be created automatically."}</p>
 <label>{ru?"Как называется ваша кухня?":"What's your kitchen called?"}<input required minLength={2} maxLength={120} autoComplete="organization" placeholder={ru?"Например, Домашняя кухня Даши":"e.g. Darsha's Kitchen"} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>{ru?"На каком языке вы хотите заполнить описание?":"Which language would you like to write in?"}<select value={language} onChange={e=>setLanguage(e.target.value as "en"|"ru")}><option value="en">English</option><option value="ru">Русский</option></select></label>
 <label>{ru?"Расскажите немного о своей еде":"A little about your cooking"}<textarea rows={5} maxLength={4000} placeholder={ru?"Что вы любите готовить? Какие блюда ваши любимые?":"What do you love to cook? What makes your dishes special?"} value={description} onChange={e=>setDescription(e.target.value)}/><small>{ru?"Пишите на удобном для вас языке. Перевод можно добавить позже.":"Write in whichever language feels easiest. Translations can be added later."}</small></label>
 {error&&<p role="alert" className={styles.error}>{error}</p>}
 <button disabled={busy} type="submit">{busy?(ru?"Сохранение…":"Creating profile…"):(ru?"Создать мой профиль":"Create my chef profile")} →</button>
 <p className={styles.fine}>{ru?"Создание профиля не означает автоматическое одобрение участия в событиях.":"Creating your profile doesn't automatically approve you to participate in an event."}</p>
 </form></div></main>;
}