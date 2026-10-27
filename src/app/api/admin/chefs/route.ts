import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
async function authorised(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {db,status:401};
 const {data,error}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 return {db,status:error?500:data?200:403};
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 const {db,status}=await authorised();if(status!==200)return NextResponse.json({error:"Not authorised"},{status});
 let b:any;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const name=typeof b.name==="string"?b.name.trim():"";
 const slug=typeof b.slug==="string"?b.slug.trim():"";
 if(!name||name.length>120||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>90)return NextResponse.json({error:"Please enter a valid chef name and URL slug."},{status:400});
 const {data:chef,error}=await db.from("vendors").insert({display_name:name,slug,area_code:null}).select("id,slug,display_name").single();
 if(error)return NextResponse.json({error:error.code==="23505"?"That chef URL is already taken.":"Could not create chef."},{status:error.code==="23505"?409:500});
 const translation=[{vendor_id:chef.id,lang:"en",description:typeof b.about_en==="string"?b.about_en.slice(0,4000):""},{vendor_id:chef.id,lang:"ru",description:typeof b.about_ru==="string"?b.about_ru.slice(0,4000):""}];
 const {error:trError}=await db.from("vendor_translations").insert(translation);
 if(trError){return NextResponse.json({error:"Chef created, but translations could not be saved. Edit the profile before publishing.",chef},{status:207})}
 return NextResponse.json({chef},{status:201});
}
export async function PATCH(req:Request){
 const {db,status}=await authorised();if(status!==200)return NextResponse.json({error:"Not authorised"},{status});
 let b:any;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!uuid.test(b.vendor_id??"")||!uuid.test(b.user_id??""))return NextResponse.json({error:"Valid chef and account IDs required."},{status:400});
 const {data:chef}=await db.from("vendors").select("id").eq("id",b.vendor_id).maybeSingle();
 if(!chef)return NextResponse.json({error:"Chef not found."},{status:404});
 if(b.action==="link"){
  const {error}=await db.from("vendor_users").upsert({vendor_id:b.vendor_id,user_id:b.user_id,role:"owner"},{onConflict:"vendor_id,user_id"});
  if(error)return NextResponse.json({error:"Could not link account. Ensure this user has signed in first."},{status:400});
  return NextResponse.json({ok:true});
 }
 if(b.action==="unlink"){
  const {error}=await db.from("vendor_users").delete().eq("vendor_id",b.vendor_id).eq("user_id",b.user_id);
  return error?NextResponse.json({error:"Could not unlink account"},{status:500}):NextResponse.json({ok:true});
 }
 return NextResponse.json({error:"Invalid action"},{status:400});
}