"use client";
import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";
import {useBasket} from "@/components/cart/BasketProvider";
import {useLanguage} from "@/components/i18n/LanguageProvider";
import {dollars} from "@/lib/customer-types";
import {useCartDrawer} from "./CartDrawerContext";
import BasketPage from "@/app/basket/page";
import Checkout from "@/app/checkout/page";
import styles from "./ShoppingDrawer.module.css";

/**
 * One floating trigger and one accessible overlay across the public site.
 * Basket -> Checkout is internal state, NOT a route change.
 * Stripe Hosted Checkout still requires a secure external Stripe redirect.
 */
export default function ShoppingDrawer(){
 const {open,step,openBasket,close,backToBasket}=useCartDrawer();
 const {count,subtotal}=useBasket();
 const {lang}=useLanguage(),ru=lang==="ru",t=(en:string,russian:string)=>ru?russian:en;
 const pathname=usePathname();
 const dialog=useRef<HTMLElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const previousFocus=useRef<HTMLElement|null>(null);
 const publicRoute=pathname==="/"||pathname==="/events"||pathname.startsWith("/events/")||
  pathname==="/basket"||pathname==="/checkout";
 useEffect(()=>{
  if(!open)return;
  previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  // Let the dialog mount before focusing the close button.
  closeButton.current?.focus();
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==="Escape"){e.preventDefault();close();return;}
   if(e.key!=="Tab"||!dialog.current)return;
   const all=Array.from(dialog.current.querySelectorAll<HTMLElement>(
    'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
   )).filter(x=>x.getClientRects().length>0);
   if(!all.length){e.preventDefault();return;}
   const first=all[0],last=all[all.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  document.addEventListener("keydown",onKey);
  return()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",onKey);
   previousFocus.current?.focus();
  };
 },[open,close]);
 useEffect(()=>{
  if(open&&dialog.current)dialog.current.scrollTop=0;
 },[step,open]);

 if(!publicRoute&&!open)return null;
 return <>
  {publicRoute&&!open&&<button type="button" className={styles.floatingCart}
   onClick={openBasket} aria-label={t("Open shopping cart","Открыть корзину")} aria-haspopup="dialog">
   <span className={styles.icon} aria-hidden="true">🛒</span>
   {count>0&&<span className={styles.count}>{count}</span>}
   <span className={styles.triggerCopy}><strong>{t("My cart","Корзина")}</strong>
    <small>{count?dollars(subtotal):t("View basket","Открыть")}</small></span>
  </button>}
  {open&&<>
   <div className={styles.backdrop} aria-hidden="true" onClick={close}/>
   <section ref={dialog} className={styles.drawer} role="dialog" aria-modal="true"
    aria-labelledby="matryoshka-drawer-heading" tabIndex={-1}>
    <header className={styles.header}>
     {step==="checkout"?<button type="button" className={styles.backButton}
        onClick={backToBasket} aria-label={t("Back to cart","Назад в корзину")}>←</button>:<span className={styles.ornament} aria-hidden="true">✿</span>}
     <div className={styles.headerTitle}>
      <span className={styles.eyebrow}>MATRYOSHKA · {t("YOUR ORDER","ВАШ ЗАКАЗ")}</span>
      <h2 id="matryoshka-drawer-heading">{step==="basket"?t("My cart","Моя корзина"):t("Checkout","Оформление заказа")}</h2>
     </div>
     <button type="button" ref={closeButton} className={styles.close}
      onClick={close} aria-label={t("Close shopping panel","Закрыть панель")}>✕</button>
    </header>
    <div className={styles.content} key={step}>
     {step==="basket"?<BasketPage inDrawer/>:<Checkout inDrawer/>}
    </div>
   </section>
  </>}
 </>;
}
