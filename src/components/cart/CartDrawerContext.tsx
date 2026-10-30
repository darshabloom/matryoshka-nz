"use client";
import {createContext,useCallback,useContext,useMemo,useState,type ReactNode} from "react";

export type CartDrawerStep="basket"|"checkout";
type CartDrawerApi={
 open:boolean;step:CartDrawerStep;openBasket:()=>void;openCheckout:()=>void;
 backToBasket:()=>void;close:()=>void;
};
const Context=createContext<CartDrawerApi|null>(null);

/** One shared drawer that persists while the customer browses event dishes.
 * Both basket and food checkout are rendered in this same overlay.
 */
export function CartDrawerProvider({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false);
 const [step,setStep]=useState<CartDrawerStep>("basket");
 const openBasket=useCallback(()=>{setStep("basket");setOpen(true)},[]);
 const openCheckout=useCallback(()=>{setStep("checkout");setOpen(true)},[]);
 const close=useCallback(()=>setOpen(false),[]);
 const value=useMemo(()=>({open,step,openBasket,openCheckout,backToBasket:openBasket,close}),
  [open,step,openBasket,openCheckout,close]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCartDrawer(){
 const ctx=useContext(Context);
 if(!ctx)throw Error("CartDrawerProvider missing");
 return ctx;
}
