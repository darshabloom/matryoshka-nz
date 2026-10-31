"use client";
import styles from "./FoodOrderReceipt.module.css";

export type ChefReceipt={
 reference:string;vendorId:string;chef:string;
 items:{name:string;quantity:number;unitPriceCents:number;lineTotalCents:number;options:unknown;note:string}[];
};
export type PaidFoodReceipt={
 id:string;paymentStatus:string;status:string;paidAt:string|null;
 masterReference:string|null;totalCents:number|null;
 chefOrders:ChefReceipt[];
 event:{title_en:string;location_text:string|null;starts_at:string}|null;
};

export function FoodOrderReceipt({receipt}:{receipt:PaidFoodReceipt}){
 const paid=receipt.paymentStatus==="paid";
 const money=(cents:number)=>(cents/100).toLocaleString("en-NZ",{style:"currency",currency:"NZD"});
 const total=money(Number(receipt.totalCents??0));
 return <article className={styles.receipt} aria-label="Matryoshka food order receipt">
  <header className={styles.header}>
   <div className={styles.brand}>✿ MATRYOSHKA <span>HOMEMADE FOOD</span></div>
   <div className={styles.type}>FOOD ORDER CONFIRMATION</div>
  </header>
  <section className={styles.master}>
   <small>FOOD ORDER NUMBER</small>
   <strong>{paid?receipt.masterReference||"Preparing reference…":"Awaiting payment"}</strong>
   <p>{receipt.event?.title_en||"Event food order"}</p>
   {receipt.event?.starts_at&&<p>{new Intl.DateTimeFormat("en-NZ",{timeZone:"Pacific/Auckland",dateStyle:"full",timeStyle:"short"}).format(new Date(receipt.event.starts_at))}</p>}
   {receipt.event?.location_text&&<p>{receipt.event.location_text}</p>}
  </section>
  <div className={styles.sections}>
   <h2>Items by chef</h2>
   {receipt.chefOrders.map((chef)=><section key={chef.vendorId} className={styles.chef}>
    <div className={styles.chefHeading}>
     <div><small>PREPARED BY</small><h3>{chef.chef}</h3></div>

    </div>
    {chef.items.map((item,i)=><div className={styles.item} key={i}>
     <span>{item.quantity} × {item.name}<small className={styles.priceDetails}>{money(item.unitPriceCents)} each</small>{item.note&&<em>Note: {item.note}</em>}</span><strong className={styles.lineTotal}>{money(item.lineTotalCents)}</strong>
    </div>)}
   </section>)}
  </div>
  <footer className={styles.footer}>
   <div className={styles.paymentTotal}><span>Total paid</span><strong>{total}</strong></div>
   <p>Quote your food order number when collecting your food at the event.</p>
   <small>This is a Matryoshka food-order confirmation, not a Yumorilnik admission ticket.</small>
  </footer>
 </article>;
}
