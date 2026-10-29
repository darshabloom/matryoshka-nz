import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const runtime="nodejs";
const UUID=/^[0-9a-f-]{36}$/i;
const json=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
 const auth=await createSupabaseServerClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return json({error:"Sign in required"},401);
 const {data:admin}=await auth.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return json({error:"Admin only"},403);
 const form=await req.formData().catch(()=>null),eventId=form?.get("eventId");
 const kind=form?.get("kind"),file=form?.get("file");
 if(typeof eventId!=="string"||!UUID.test(eventId)||!["cover","gallery"].includes(String(kind)))return json({error:"Choose a valid event and photo slot"},400);
 if(!(file instanceof File)||file.size<1||file.size>5242880)return json({error:"Photo must be under 5 MB"},400);
 const formats:Record<string,{ext:string;test:(b:Uint8Array)=>boolean}>={
 "image/jpeg":{ext:"jpg",test:b=>b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255},
 "image/png":{ext:"png",test:b=>b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x)},
 "image/webp":{ext:"webp",test:b=>b.length>=12&&new TextDecoder().decode(b.slice(0,4))==="RIFF"&&new TextDecoder().decode(b.slice(8,12))==="WEBP"}
 };
 const fmt=formats[file.type];
 if(!fmt)return json({error:"Only JPG, PNG or WebP allowed"},415);
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!fmt.test(bytes))return json({error:"File is not a valid image"},415);
 const {data:event}=await auth.from("events").select("id,cover_image_url,gallery_image_urls").eq("id",eventId).maybeSingle();
 if(!event)return json({error:"Event not found"},404);
 const current=(Array.isArray(event.gallery_image_urls)?event.gallery_image_urls:[]).filter((x:unknown)=>typeof x==="string");
 if(kind==="gallery"&&current.length>=6)return json({error:"Maximum six gallery photos"},409);
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!serviceKey||!url||new URL(url).hostname!=="aplkqpmkjwmnnthsmxvx.supabase.co")return json({error:"Storage unavailable"},503);
 const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const objectPath=eventId+"/"+crypto.randomUUID()+"."+fmt.ext;
 const {error:uploadError}=await service.storage.from("event-photos").upload(objectPath,bytes,{contentType:file.type,upsert:false,cacheControl:"3600"});
 if(uploadError)return json({error:"Photo upload failed"},503);
 const newUrl=service.storage.from("event-photos").getPublicUrl(objectPath).data.publicUrl;
 const fields=kind==="cover"?{cover_image_url:newUrl}:{gallery_image_urls:[...current,newUrl]};
 const {data:saved,error:saveError}=await service.from("events").update({...fields,updated_at:new Date().toISOString()}).eq("id",eventId).select("id").maybeSingle();
 if(saveError||!saved){
  await service.storage.from("event-photos").remove([objectPath]);
  return json({error:"Unable to save event photo"},503);
 }
 return json({url:newUrl,kind});
}
export async function DELETE(req:Request){
 const auth=await createSupabaseServerClient();
 const {data:{user}}=await auth.auth.getUser();if(!user)return json({error:"Sign in required"},401);
 const {data:admin}=await auth.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return json({error:"Admin only"},403);
 let b:any;try{b=await req.json()}catch{return json({error:"Invalid request"},400)}
 if(!UUID.test(b.eventId??"")||typeof b.url!=="string")return json({error:"Invalid request"},400);
 const {data:e}=await auth.from("events").select("cover_image_url,gallery_image_urls").eq("id",b.eventId).maybeSingle();
 if(!e)return json({error:"Event not found"},404);
 const gallery=(Array.isArray(e.gallery_image_urls)?e.gallery_image_urls:[]).filter((x:unknown):x is string=>typeof x==="string");
 if(e.cover_image_url!==b.url&&!gallery.includes(b.url))return json({error:"Photo does not belong to event"},403);
 const fields=e.cover_image_url===b.url?{cover_image_url:null}:{gallery_image_urls:gallery.filter(x=>x!==b.url)};
 const {error}=await auth.from("events").update(fields).eq("id",b.eventId);
 if(error)return json({error:"Unable to remove photo"},500);
 return json({ok:true});
}
