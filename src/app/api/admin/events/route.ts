import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EventInput = {
 slug?:unknown; title_en?:unknown; title_ru?:unknown;
 starts_at?:unknown; ends_at?:unknown; ordering_opens_at?:unknown;
 ordering_closes_at?:unknown; location_text?:unknown;
};

export async function POST(req: Request) {
 const supabase=await createSupabaseServerClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const {data:admin,error:roleError}=await supabase.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(roleError)return NextResponse.json({error:"Unable to verify authorisation"},{status:500});
 if(!admin)return NextResponse.json({error:"Admin access required"},{status:403});
 let raw:EventInput;
 try { raw=await req.json(); } catch {return NextResponse.json({error:"Invalid JSON"},{status:400});}
 const slug=typeof raw.slug==="string"?raw.slug.trim():"";
 const title=typeof raw.title_en==="string"?raw.title_en.trim():"";
 const validTimestamp=(x:unknown)=>typeof x==="string"&&x.length>0&&Number.isFinite(Date.parse(x));
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>90||!title||title.length>200||
    !validTimestamp(raw.starts_at)||!validTimestamp(raw.ends_at)||
    Date.parse(raw.starts_at as string)>=Date.parse(raw.ends_at as string)) {
  return NextResponse.json({error:"Invalid event details"},{status:400});
 }
 if(raw.ordering_opens_at!=null&&!validTimestamp(raw.ordering_opens_at)||
    raw.ordering_closes_at!=null&&!validTimestamp(raw.ordering_closes_at)) {
  return NextResponse.json({error:"Invalid ordering window"},{status:400});
 }
 const payload={
  slug,title_en:title,title_ru:typeof raw.title_ru==="string"?raw.title_ru.trim()||null:null,
  starts_at:raw.starts_at as string, ends_at:raw.ends_at as string,
  ordering_opens_at:raw.ordering_opens_at as string|null|undefined??null,
  ordering_closes_at:raw.ordering_closes_at as string|null|undefined??null,
  location_text:typeof raw.location_text==="string"?raw.location_text.trim()||null:null,
  is_published:false
 };
 const {data,error}=await supabase.from("events").insert(payload).select("id,slug,is_published").single();
 if(error) {
  console.error("Admin event creation failed",error.code);
  return NextResponse.json({error:error.code==="23505"?"Event slug already exists":"Could not create event"},{status:error.code==="23505"?409:500});
 }
 return NextResponse.json({event:data},{status:201});
}
