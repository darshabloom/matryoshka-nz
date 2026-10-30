"use client";
import {createContext,useContext,useEffect,useMemo,useState} from "react";
import {useCartDrawer} from "./CartDrawerContext";
export type BasketSelection={id:string;dishId:string;eventId:string;eventSlug:string;eventName:string;name:string;chef:string;photo:string|null;unitPriceCents:number;optionIds:string[];optionSummary:string;quantity:number;note?:string};
type BasketApi={items:BasketSelection[];ready:boolean;count:number;subtotal:number;add:(item:Omit<BasketSelection,"id">)=>boolean;setQuantity:(id:string,quantity:number)=>void;setNote:(id:string,note:string)=>void;remove:(id:string)=>void;clear:()=>void};
const BasketContext=createContext<BasketApi|null>(null);const KEY="matryoshka-event-basket-v2"; // Reset stale pre-markup basket prices when customer pricing changed.
export function BasketProvider({children}:{children:React.ReactNode}){
 const [items,setItems]=useState<BasketSelection[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(stored)){const clean=stored.filter(x=>x&&typeof x.dishId==="string"&&typeof x.eventId==="string"&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&x.quantity<=100&&Array.isArray(x.optionIds)).slice(0,100).map(x=>({...x,note:typeof x.note==="string"?x.note.slice(0,300):""}));setItems(clean)}}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready){try{localStorage.setItem(KEY,JSON.stringify(items))}catch{}}},[items,ready]);
 const add=(item:Omit<BasketSelection,"id">)=>{
  if(!item.eventId||!item.dishId||item.quantity<1||item.quantity>100)return false;
  if(items.length&&items[0].eventId!==item.eventId){
   if(!window.confirm("Your basket contains food for another event. Clear that basket and start one for this event?"))return false;
   setItems([{...item,id:crypto.randomUUID()}]);return true;
  }
  const key=[item.dishId,...[...item.optionIds].sort()].join(":");const old=items.find(x=>[x.dishId,...[...x.optionIds].sort()].join(":")===key);
  if(old){setItems(prev=>prev.map(x=>x.id===old.id?{...x,quantity:Math.min(100,x.quantity+item.quantity)}:x));return true}
  setItems(prev=>[...prev,{...item,id:crypto.randomUUID()}]);return true;
 };
 const val=useMemo(()=>({items,ready,count:items.reduce((a,b)=>a+b.quantity,0),subtotal:items.reduce((a,b)=>a+b.quantity*b.unitPriceCents,0),add,setQuantity:(id:string,quantity:number)=>setItems(old=>old.map(x=>x.id===id?{...x,quantity:Math.max(1,Math.min(100,quantity))}:x)),setNote:(id:string,note:string)=>setItems(old=>old.map(x=>x.id===id?{...x,note:note.slice(0,300)}:x)),remove:(id:string)=>setItems(old=>old.filter(x=>x.id!==id)),clear:()=>setItems([])}),[items,ready]);
 return <BasketContext.Provider value={val}>{children}</BasketContext.Provider>;
}
export function useBasket(){const c=useContext(BasketContext);if(!c)throw Error("Missing BasketProvider");return c}
export function BasketLink(){const {count}=useBasket(),{openBasket}=useCartDrawer();return <button type="button" onClick={openBasket} aria-haspopup="dialog" aria-label={`Open basket with ${count} items`} style={{display:"inline-flex",gap:7,alignItems:"center",background:"#fff0e8",border:"1px solid #e7c3b3",padding:"10px 13px",borderRadius:9,color:"#a12c27",fontWeight:800,textDecoration:"none",whiteSpace:"nowrap",font:"inherit",fontSize:13,cursor:"pointer"}}>🛒 {count>0?`Basket (${count})`:"Basket"}</button>}
