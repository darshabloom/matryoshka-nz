"use client";
import {createContext,useCallback,useContext,useMemo,useState,type ReactNode} from "react";

export type CartDrawerStep="basket"|"checkout"|"result";
type CartDrawerApi={
 open:boolean;step:CartDrawerStep;sessionId:string|null;openBasket:()=>void;openCheckout:()=>void;
 openPaymentResult:(sessionId:string)=>void;
 backToBasket:()=>void;close:()=>void;
};
const Context=createContext<CartDrawerApi|null>(null);

/** One shared drawer that persists while the customer browses event dishes.
 * Both basket and food checkout are rendered in this same overlay.
 */
export function CartDrawerProvider({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false);
 const [step,setStep]=useState<CartDrawerStep>("basket");
 const [sessionId,setSessionId]=useState<string|null>(null);
 const openBasket=useCallback(()=>{setSessionId(null);setStep("basket");setOpen(true)},[]);
 const openCheckout=useCallback(()=>{setSessionId(null);setStep("checkout");setOpen(true)},[]);
 const openPaymentResult=useCallback((value:string)=>{setSessionId(value);setStep("result");setOpen(true)},[]);
 const close=useCallback(()=>setOpen(false),[]);
 const value=useMemo(()=>({open,step,sessionId,openBasket,openCheckout,openPaymentResult,backToBasket:openBasket,close}),
  [open,step,sessionId,openBasket,openCheckout,openPaymentResult,close]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCartDrawer(){
 const ctx=useContext(Context);
 if(!ctx)throw Error("CartDrawerProvider missing");
 return ctx;
}
