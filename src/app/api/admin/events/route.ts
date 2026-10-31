import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function authorised(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {db,status:401};
 const {data,error}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 return {db,status:error?500:data?200:403};
}
function validate(raw:any){
 const slug=typeof raw.slug==="string"?raw.slug.trim():"";
 const title=typeof raw.title_en==="string"?raw.title_en.trim():"";
 const valid=(v:any)=>typeof v==="string"&&!Number.isNaN(Date.parse(v));
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>90||!title||title.length>200||!valid(raw.starts_at)||!valid(raw.ends_at)||Date.parse(raw.starts_at)>=Date.parse(raw.ends_at))return null;
 if((raw.ordering_opens_at&&!valid(raw.ordering_opens_at))||(raw.ordering_closes_at&&!valid(raw.ordering_closes_at)))return null;
 if(raw.ordering_opens_at&&raw.ordering_closes_at&&(Date.parse(raw.ordering_opens_at)>=Date.parse(raw.ordering_closes_at)))return null;
 const txt=(v:any,n=4000)=>typeof v==="string"?v.trim().slice(0,n)||null:null;
 return {slug,title_en:title,title_ru:txt(raw.title_ru,200),description_en:txt(raw.description_en),description_ru:txt(raw.description_ru),
 starts_at:raw.starts_at,ends_at:raw.ends_at,ordering_opens_at:raw.ordering_opens_at||null,ordering_closes_at:raw.ordering_closes_at||null,
 location_text:txt(raw.location_text,400),external_ticket_url:txt(raw.external_ticket_url,1000)};
}
export async function POST(req:Request){
 const {db,status}=await authorised();
 if(status!==200)return NextResponse.json({error:"Not authorised"},{status});
 let raw:any;try{raw=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const data=validate(raw);if(!data)return NextResponse.json({error:"Check event title, slug, dates and ordering window."},{status:400});
 const {data:created,error}=await db.from("events").insert({...data,is_published:false}).select("id,slug,is_published").single();
 if(error)return NextResponse.json({error:error.code==="23505"?"Slug already exists.":"Unable to save event."},{status:error.code==="23505"?409:500});
 return NextResponse.json({event:created},{status:201});
}
export async function PATCH(req:Request){
 const {db,status}=await authorised();
 if(status!==200)return NextResponse.json({error:"Not authorised"},{status});
 let raw:any;try{raw=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(typeof raw.id!=="string"||! /^[0-9a-f-]{36}$/i.test(raw.id))return NextResponse.json({error:"Invalid event ID"},{status:400});
 const {data:old,error:readError}=await db.from("events").select("*").eq("id",raw.id).single();
 if(readError||!old)return NextResponse.json({error:"Event not found"},{status:404});
 const clean=validate({...old,...raw});
 if(!clean)return NextResponse.json({error:"Check event details and dates."},{status:400});
 const allowed=["collection","onsite","other"];
 const options=Array.isArray(raw.chef_fulfilment_options)?[...new Set(raw.chef_fulfilment_options)]:old.chef_fulfilment_options;
 if(!Array.isArray(options)||!options.length||options.length>3||options.some((x:any)=>!allowed.includes(x)))return NextResponse.json({error:"Choose at least one valid food handover option"},{status:400});
 const publication=typeof raw.is_published==="boolean"?raw.is_published:old.is_published;
 if(publication&&(!clean.location_text||new Date(clean.ends_at)<=new Date()))return NextResponse.json({error:"A future date and venue are required before publishing an event."},{status:409});
 const fulfilment=["at_event","collection","delivery"].includes(raw.fulfilment_mode)?raw.fulfilment_mode:old.fulfilment_mode;
 const ticketRequired=typeof raw.ticket_required==="boolean"?raw.ticket_required:old.ticket_required;
 const appOpen=typeof raw.chef_applications_open==="boolean"?raw.chef_applications_open:old.chef_applications_open;
 const deadline=raw.chef_application_deadline===null?null:
  typeof raw.chef_application_deadline==="string"&&Number.isFinite(Date.parse(raw.chef_application_deadline))
   ?raw.chef_application_deadline:old.chef_application_deadline;
 const {data:updated,error}=await db.from("events").update({...clean,is_published:publication,chef_applications_open:appOpen,chef_application_deadline:deadline,chef_fulfilment_options:options,fulfilment_mode:fulfilment,ticket_required:ticketRequired,ordering_enabled:publication?old.ordering_enabled:false,updated_at:new Date().toISOString()}).eq("id",raw.id).select("id,slug,is_published").single();
 if(error)return NextResponse.json({error:error.code==="23505"?"Slug already exists.":"Unable to update event."},{status:error.code==="23505"?409:500});
 return NextResponse.json({event:updated});
}
