/** Shared, conservative prerequisites before a dish is offered at an event. */
export type ReadinessDish={
 vendor_id:string|null;
 approval_status:string;
 is_active:boolean;
 ingredients_text:string|null;
 allergen_statement:string|null;
 allergen_review_complete:boolean;
};
export function dishReadinessIssues(dish:ReadinessDish,approvedChefIds:readonly string[]):string[]{
 const issues:string[]=[];
 if(!dish.vendor_id)issues.push("Assign a chef to this dish");
 else if(!approvedChefIds.includes(dish.vendor_id))issues.push("Approve this chef for the event");
 if(dish.approval_status!=="approved")issues.push("Approve the dish");
 if(!dish.is_active)issues.push("Make the dish active");
 if(!dish.ingredients_text?.trim())issues.push("Complete the ingredient list");
 if(!dish.allergen_statement?.trim())issues.push("Add an allergen statement, including if none are known");
 if(!dish.allergen_review_complete)issues.push("Confirm the ingredient and allergen safety review");
 return issues;
}
export const dishReadyForEvent=(dish:ReadinessDish,approvedChefIds:readonly string[])=>dishReadinessIssues(dish,approvedChefIds).length===0;
