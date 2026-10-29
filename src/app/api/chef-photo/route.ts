import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export async function POST(req:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Please sign in"},{status:401});
 const form=await req.formData();
 const file=form.get("file"),vendor=form.get("vendor_id");
 if(!(file instanceof File))return NextResponse.json({error:"Choose a photo"},{status:400});
 if(file.size>5*1024*1024||file.size===0||!["image/jpeg","image/png","image/webp"].includes(file.type))
  return NextResponse.json({error:"Use a JPG, PNG or WebP smaller than 5MB"},{status:400});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(typeof vendor!=="string"||!/^[a-f0-9-]{36}$/i.test(vendor))
  return NextResponse.json({error:"Invalid chef"},{status:400});
 if(!admin){
  const {data:own}=await db.from("vendor_users").select("user_id").eq("vendor_id",vendor).eq("user_id",user.id).maybeSingle();
  if(!own)return NextResponse.json({error:"Not authorised"},{status:403});
 }
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!key||!url)return NextResponse.json({error:"Storage unavailable"},{status:503});
 const service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
 const path="chefs/"+vendor+"/"+crypto.randomUUID()+"."+ext;
 const {error}=await service.storage.from("profile-photos").upload(path,await file.arrayBuffer(),{contentType:file.type});
 if(error)return NextResponse.json({error:"Upload failed"},{status:500});
 const publicUrl=service.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
 const {data:saved,error:saveError}=await service.from("vendors")
  .update({hero_image_url:publicUrl}).eq("id",vendor).select("id").maybeSingle();
 if(saveError||!saved){
  await service.storage.from("profile-photos").remove([path]);
  console.error("Chef profile photo update failed",saveError?.code??"no matching vendor row");
  return NextResponse.json({error:"Photo uploaded but profile could not be saved. Please try again."},{status:500});
 }
 return NextResponse.json({url:publicUrl},{headers:{"Cache-Control":"no-store"}});
}
