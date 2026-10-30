"use client";
import Link from "next/link";
import {useEffect,useState,type ReactNode} from "react";
import {usePathname} from "next/navigation";
import LanguageToggle from "@/components/LanguageToggle/LanguageToggle";
import {BasketLink} from "@/components/cart/BasketProvider";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import styles from "./SiteHeader.module.css";

const links=[
 {href:"/#home",en:"Home",ru:"Главная"},
 {href:"/#menu",en:"Menu",ru:"Меню"},
 {href:"/events",en:"Events",ru:"События"},
 {href:"/#chefs",en:"Our Chefs",ru:"Наши повара"},
 {href:"/#how-it-works",en:"How it works",ru:"Как это работает"},
 {href:"/#contact",en:"Contact",ru:"Контакты"},
];

export default function SiteHeader({account}:{account:ReactNode}){
 const {lang}=useLanguage(),ru=lang==="ru";
 const [expanded,setExpanded]=useState(false);
 const pathname=usePathname();
 useEffect(()=>setExpanded(false),[pathname]);
 useEffect(()=>{
  if(!expanded)return;
  const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false)};
  document.addEventListener("keydown",onEscape);
  return()=>document.removeEventListener("keydown",onEscape);
 },[expanded]);
 return <header className={styles.header}>
  <nav className={styles.nav} aria-label={ru?"Основная навигация":"Main navigation"}>
   <Link href="/" className={styles.brand} onClick={()=>setExpanded(false)} aria-label="Matryoshka home">
    <span className={styles.brandName}>❀ Matryoshka</span>
    <span className={styles.brandTagline}>HOMEMADE FOOD</span>
   </Link>
   <div className={styles.navigation} id="matryoshka-mobile-navigation" data-open={expanded}>
    <div className={styles.navLinks}>
     {links.map(l=><Link key={l.href} href={l.href} onClick={()=>setExpanded(false)}>{ru?l.ru:l.en}</Link>)}
    </div>
    <div className={styles.actions}>
     <div className={styles.desktopLanguage}><LanguageToggle/></div>
     <div className={styles.desktopBasket}><BasketLink/></div>
     <div className={styles.account}>{account}</div>
    </div>
   </div>
   <div className={styles.mobileActions}>
    <span className={styles.mobileBasket}><BasketLink/></span>
    <button type="button" className={styles.menuToggle} aria-label={expanded?(ru?"Закрыть меню":"Close menu"):(ru?"Открыть меню":"Open menu")}
     aria-expanded={expanded} aria-controls="matryoshka-mobile-navigation" onClick={()=>setExpanded(v=>!v)}>
     {expanded?<svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
     :<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>}
    </button>
   </div>
  </nav>
 </header>;
}
