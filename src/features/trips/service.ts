import { requireSupabase } from '../../services/supabase'
import type { Trip,TripInsert,TripUpdate,TripPermit,TripPermitInsert,TripCost,TripCostInsert,TripFuelLog,TripFuelLogInsert } from './types'
const db=()=>requireSupabase()
export const tripsService={
 async list(){const {data,error}=await db().from('trips').select('*').order('created_at',{ascending:false});if(error)throw error;return (data??[]) as Trip[]},
 async getById(id:string){const {data,error}=await db().from('trips').select('*').eq('id',id).single();if(error)throw error;return data as Trip},
 async create(input:TripInsert){const {data,error}=await db().from('trips').insert(input).select('*').single();if(error)throw error;return data as Trip},
 async update(id:string,input:TripUpdate){const {data,error}=await db().from('trips').update(input).eq('id',id).select('*').single();if(error)throw error;return data as Trip},
 async updateStatus(id:string,status:Trip['status']){return this.update(id,{status})},
 async cancel(id:string){return this.updateStatus(id,'cancelled')},
 async delete(id:string){const {error}=await db().from('trips').delete().eq('id',id);if(error)throw error},
 async listByDriver(id:string){const {data,error}=await db().from('trips').select('*').eq('driver_id',id).order('scheduled_start',{ascending:false});if(error)throw error;return (data??[]) as Trip[]},
 async listByProject(id:string){const {data,error}=await db().from('trips').select('*').or(`from_project_id.eq.${id},to_project_id.eq.${id}`).order('scheduled_start',{ascending:false});if(error)throw error;return (data??[]) as Trip[]},
 async listByAsset(id:string){const {data,error}=await db().from('trips').select('*').or(`truck_asset_id.eq.${id},trailer_asset_id.eq.${id}`).order('scheduled_start',{ascending:false});if(error)throw error;return (data??[]) as Trip[]},
}
export const tripPermitsService={
 async listByTrip(id:string){const {data,error}=await db().from('trip_permits').select('*').eq('trip_id',id).order('issued_at');if(error)throw error;return (data??[]) as TripPermit[]},
 async create(input:TripPermitInsert){const {data,error}=await db().from('trip_permits').insert(input).select('*').single();if(error)throw error;return data as TripPermit},
 async sign(id:string,details:{signed_by_name:string;signed_by_role:string;signature_url:string;receipt_condition?:TripPermit['receipt_condition'];received_quantity?:number|null;discrepancy_notes?:string|null}){const {data,error}=await db().from('trip_permits').update({...details,signed_at:new Date().toISOString()}).eq('id',id).select('*').single();if(error)throw error;return data as TripPermit},
 async attachFiles(id:string,urls:string[]){const {data:old,error:readError}=await db().from('trip_permits').select('attachment_urls').eq('id',id).single();if(readError)throw readError;const {data,error}=await db().from('trip_permits').update({attachment_urls:[...((old.attachment_urls as string[]|null)??[]),...urls]}).eq('id',id).select('*').single();if(error)throw error;return data as TripPermit},
 async delete(id:string){const {error}=await db().from('trip_permits').delete().eq('id',id);if(error)throw error},
}
export const tripCostsService={
 async listByTrip(id:string){const {data,error}=await db().from('trip_costs').select('*').eq('trip_id',id).order('cost_date',{ascending:false});if(error)throw error;return (data??[]) as TripCost[]},
 async create(input:TripCostInsert){const {data,error}=await db().from('trip_costs').insert(input).select('*').single();if(error)throw error;return data as TripCost},
 async update(id:string,input:Partial<TripCostInsert>){const {data,error}=await db().from('trip_costs').update(input).eq('id',id).select('*').single();if(error)throw error;return data as TripCost},
 async delete(id:string){const {error}=await db().from('trip_costs').delete().eq('id',id);if(error)throw error},
 async getSummary(id:string){const costs=await this.listByTrip(id);return costs.reduce((s,c)=>s+Number(c.amount),0)},
 async listAll(){const {data,error}=await db().from('trip_costs').select('*').order('cost_date',{ascending:false});if(error)throw error;return (data??[]) as TripCost[]},
}

export const tripFuelService={
 async listByTrip(id:string){const {data,error}=await db().from('fuel_operations').select('*').eq('trip_id',id).order('operation_date',{ascending:false});if(error)throw error;return (data??[]).map(x=>({id:x.id,trip_id:x.trip_id,asset_id:x.asset_id,liters:Number(x.qty??0),unit_price:Number(x.price??0),total_cost:Number(x.total??0),odometer_reading:x.meter==null?null:Number(x.meter),fuel_station:x.station??null,filled_at:x.trip_filled_at??x.operation_date,created_at:x.created_at})) as TripFuelLog[]},
 async create(input:TripFuelLogInsert){const {data,error}=await db().from('fuel_operations').insert({trip_id:input.trip_id,asset_id:input.asset_id,qty:input.liters,price:input.unit_price,meter:input.odometer_reading,station:input.fuel_station,trip_filled_at:input.filled_at,operation_date:input.filled_at.slice(0,10),type:'ديزل',status:'معتمد'}).select('*').single();if(error)throw error;return {id:data.id,trip_id:data.trip_id,asset_id:data.asset_id,liters:Number(data.qty),unit_price:Number(data.price),total_cost:Number(data.total),odometer_reading:data.meter==null?null:Number(data.meter),fuel_station:data.station??null,filled_at:data.trip_filled_at??data.operation_date,created_at:data.created_at} as TripFuelLog},
 async delete(id:string){const {error}=await db().from('fuel_operations').delete().eq('id',id);if(error)throw error},
 async getConsumption(id:string){const [trip,logs]=await Promise.all([tripsService.getById(id),this.listByTrip(id)]);const liters=logs.reduce((s,x)=>s+x.liters,0);return {liters,distanceKm:Number(trip.distance_km??0),litersPer100Km:Number(trip.distance_km)>0?liters/Number(trip.distance_km)*100:0}},
}

export const tripBillingService={
 async markAsInvoiced(id:string,invoiceId:string){return tripsService.update(id,{status:'invoiced',invoice_id:invoiceId})},
 async markAsPaid(id:string){return tripsService.updateStatus(id,'paid')},
 async getUnbilledTrips(){const {data,error}=await db().from('trips').select('*').eq('status','received').eq('is_billable',true).is('invoice_id',null).order('scheduled_start');if(error)throw error;return (data??[]) as Trip[]},
 async getProjectSummary(projectId:string){const trips=await tripsService.listByProject(projectId);return trips.filter(t=>t.to_project_id===projectId).reduce((s,t)=>({tripCount:s.tripCount+1,billableAmount:s.billableAmount+(t.is_billable?Number(t.total_charge):0),unbilledAmount:s.unbilledAmount+(t.is_billable&&t.status==='received'&&!t.invoice_id?Number(t.total_charge):0)}),{tripCount:0,billableAmount:0,unbilledAmount:0})},
}
