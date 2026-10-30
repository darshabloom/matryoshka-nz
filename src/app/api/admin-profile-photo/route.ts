import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export async function POST(req:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 const form=await req.formData(),file=form.get("file");
 if(!(file instanceof File)||file.size<1||file.size>5*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type))
  return NextResponse.json({error:"JPG, PNG or WebP under 5 MB required"},{status:400});
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!secret||!url)return NextResponse.json({error:"Storage unavailable"},{status:503});
 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
 const path="admins/"+user.id+"/"+crypto.randomUUID()+"."+ext;
 const {error}=await service.storage.from("profile-photos").upload(path,await file.arrayBuffer(),{contentType:file.type});
 if(error)return NextResponse.json({error:"Unable to upload photo"},{status:500});
 const photo=service.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
 const {error:saved}=await db.auth.updateUser({data:{avatar_url:photo}});
 if(saved)return NextResponse.json({error:"Unable to save profile photo"},{status:500});
 return NextResponse.json({url:photo});
}
