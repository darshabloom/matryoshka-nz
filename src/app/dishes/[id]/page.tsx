import AssignmentControl from "./AssignmentControl";
import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import CustomerDishEditor from "./CustomerDishEditor";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 const {data:dish}=await db.from("menu_items").select("id,vendor_id,price_cents,approval_status,ingredients_text,allergen_statement,cross_contact_statement,portion_label,allergen_review_complete,menu_item_translations(lang,name,description),menu_item_images(id,image_url,sort_order),vendors(display_name)").eq("id",id).maybeSingle();
 if(!dish)notFound();
 if(!admin){const {data:member}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).eq("vendor_id",dish.vendor_id).maybeSingle();if(!member)notFound()}
 const [vendors,assignment]=admin?await Promise.all([db.from("vendors").select("id,display_name").order("display_name"),db.from("dish_chef_assignments").select("vendor_id,status,chef_note").eq("dish_id",id).maybeSingle()]):[{data:[]},{data:null}];
 return <CustomerDishEditor dish={dish as any} isAdmin={!!admin} assignmentControl={admin&&!dish.vendor_id?<AssignmentControl dishId={id} vendors={vendors.data??[]} assignment={assignment.data??null}/>:null}/>;
}