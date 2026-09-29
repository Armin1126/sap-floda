/** @typedef {{manifest_id:string, commodity_type:string, weight_kg:number, carriage_constraint:string, status:string}} Manifest */
/** @typedef {{ranking_id:string, manifest_id:string, priority_rank:number, composite_score:number, allocated:'Y'|'N', requires_approval:boolean, approval_status:string}} Ranking */
/** @typedef {{chokepoint_id:string, location:string, chokepoint_type:string, severity:string, affected_routes:string, capacity_reduction_percent:number, estimated_resolution_hours:number, status:string, created_at:string}} Chokepoint */
/** @typedef {{log_id:string, actor:string, action:string, decision_rationale:string, timestamp:string}} AuditEntry */
export {}
