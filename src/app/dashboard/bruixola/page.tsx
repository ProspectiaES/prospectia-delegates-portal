import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { SKUS_PROMO } from "@/lib/skus";
import { BruixolaPeriodNav } from "@/components/BruixolaPeriodNav";
import { ObjectiusDashboard } from "./objectius/ObjectiusDashboard";

export const metadata = { title: "Brúixola — Quadre de Comandament" };

const ML = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function monthRange(y: number, m: number) {
  return { start: new Date(Date.UTC(y, m, 1)).toISOString(), end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).toISOString() };
}
function normName(s: string) { return s.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " "); }
function fmtEur(n: number) { return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n); }
function fmtK(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}k €` : `${Math.round(n)} €`; }

type RawLine = { sku?: string; units?: number|string; name?: string; price?: number|string };
type Inv = { id: string; contact_id: string; date: string; is_credit_note: boolean; from_invoice_id: string|null;
             raw: { subtotal?: number; products?: RawLine[]; items?: RawLine[] }|null };

export default async function BruixolaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) notFound();

  const sp  = await searchParams;
  const now = new Date();
  let year  = now.getFullYear(), month = now.getMonth();
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) { const [y,m] = sp.mes.split("-").map(Number); year=y; month=m-1; }
  const mesStr = `${year}-${String(month+1).padStart(2,"0")}`;
  const isNow  = mesStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  const windowStart = new Date(Date.UTC(year-1, month, 1)).toISOString();
  const { end: windowEnd } = monthRange(year, month);

  const admin = createAdminClient();
  const [invRes, creditRes, profilesRes, cdRes, simRes, objectiusRes] = await Promise.all([
    admin.from("holded_invoices").select("id,contact_id,status,date,is_credit_note,from_invoice_id,raw")
      .in("status",[1,2,3]).eq("is_credit_note",false).gte("date",windowStart).lte("date",windowEnd),
    admin.from("holded_invoices").select("from_invoice_id").eq("is_credit_note",true).not("from_invoice_id","is",null),
    admin.from("profiles").select("id,full_name,delegate_name,role,is_kol,is_coordinator,kol_id").in("role",["DELEGATE","KOL","COORDINATOR"]),
    admin.from("contact_delegates").select("contact_id,delegate_id"),
    admin.from("economic_simulations").select("net_sale_price,estructura_pct,logistics_pct,production_cost_lines").eq("is_performance_reference",true).maybeSingle(),
    admin.from("bruixola_objectius")
      .select("id,titol,tipus,any,trimestre,mes,estat,prioritat,progress,data_objectiu,metrica,valor_objectiu,valor_actual,seguent_accio,decisio_pendent")
      .eq("user_id", profile.id)
      .order("prioritat", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const objectius = (objectiusRes.data ?? []) as { id:string; titol:string; tipus:string; any:number; trimestre:number|null; mes:number|null; estat:string; prioritat:number|null; progress:number; data_objectiu:string|null; metrica:string|null; valor_objectiu:number|null; valor_actual:number|null; seguent_accio:string|null; decisio_pendent:string|null }[];
  const cancelled = new Set(((creditRes.data??[]) as {from_invoice_id:string|null}[]).map(r=>r.from_invoice_id).filter(Boolean) as string[]);
  const allInv = ((invRes.data??[]) as Inv[]).filter(i=>!cancelled.has(i.id));
  const profiles = (profilesRes.data??[]) as {id:string;full_name:string;delegate_name:string|null;role:string;is_kol:boolean;is_coordinator:boolean;kol_id:string|null}[];
  const cdRows   = (cdRes.data??[]) as {contact_id:string;delegate_id:string}[];

  const sim = simRes.data as {net_sale_price?:number;estructura_pct?:number;logistics_pct?:number;production_cost_lines?:{unit_cost?:number}[]}|null;
  const costPerUnit = sim ? (sim.production_cost_lines??[]).reduce((s,l)=>s+(l.unit_cost??0),0) : 0;

  // First invoice per contact for new-client detection
  const firstInvDate: Record<string,string> = {};
  for (const inv of allInv) {
    if (!firstInvDate[inv.contact_id] || inv.date < firstInvDate[inv.contact_id]) firstInvDate[inv.contact_id] = inv.date;
  }

  function computeMonth(start: string, end: string) {
    const invs = allInv.filter(i=>i.date>=start&&i.date<=end);
    let allUnits=0, focUnits=0, revenue=0;
    const byProduct: Record<string,{displayName:string;units:number}> = {};
    const clients = new Set<string>();
    let newClients=0;
    for (const inv of invs) {
      revenue += inv.raw?.subtotal??0;
      clients.add(inv.contact_id);
      if (firstInvDate[inv.contact_id]>=start) newClients++;
      const lines = inv.raw?.products??inv.raw?.items??[];
      for (const l of lines) {
        const u = Number(l.units??0);
        const isFoc = SKUS_PROMO.has(l.sku??"") || Number(l.price??-1)===0;
        if (isFoc) { focUnits+=u; continue; }
        allUnits+=u;
        const rawName = (l.name??l.sku??"").trim();
        const key = normName(rawName);
        if (key) { if (!byProduct[key]) byProduct[key]={displayName:rawName,units:0}; byProduct[key].units+=u; }
      }
    }
    const grossMargin = costPerUnit>0 ? revenue-allUnits*costPerUnit-revenue*((sim?.estructura_pct??0)/100)-revenue*((sim?.logistics_pct??0)/100) : 0;
    return { allUnits, focUnits, revenue, grossMargin, activeClients:clients.size, newClients, count:invs.length, byProduct };
  }

  const { start: curStart, end: curEnd } = monthRange(year, month);
  const cur = computeMonth(curStart, curEnd);

  // 12-month history (oldest→newest ending at current month)
  const history = Array.from({length:12},(_,i)=>{
    const d = new Date(Date.UTC(year,month-11+i,1)); const y=d.getUTCFullYear(),m=d.getUTCMonth();
    const {start,end} = monthRange(y,m);
    const data = computeMonth(start,end);
    return { label:ML[m], year:y, month:m+1, ...data };
  });

  // Delegates stats
  const delegateIds = new Set(profiles.map(d=>d.id));
  const kolCount = profiles.filter(d=>d.is_kol||d.role==="KOL").length;
  const coordCount = profiles.filter(d=>d.is_coordinator||d.role==="COORDINATOR").length;
  const totalDelegates = delegateIds.size;
  const totalClientsInCartera = new Set(cdRows.map(r=>r.contact_id)).size;
  const curContactIds = new Set(allInv.filter(i=>i.date>=curStart&&i.date<=curEnd).map(i=>i.contact_id));
  const delegateContactMap: Record<string,Set<string>> = {};
  for (const {delegate_id,contact_id} of cdRows) {
    if (!delegateContactMap[delegate_id]) delegateContactMap[delegate_id]=new Set();
    delegateContactMap[delegate_id].add(contact_id);
  }
  const activeDelegates = profiles.filter(d=>{
    const cids = delegateContactMap[d.id]??new Set();
    return [...cids].some(cid=>curContactIds.has(cid));
  }).length;

  // SKU breakdown (current month) – sorted by units
  const skuBreakdown = Object.entries(cur.byProduct)
    .sort((a,b)=>b[1].units-a[1].units)
    .map(([normalizedName,{displayName,units}])=>({normalizedName,name:displayName,units}));

  // Per-product delegate rankings (top 5 per product)
  const delegateByProduct: Record<string,{id:string;name:string;units:number;byProduct:Record<string,number>}> = {};
  for (const inv of allInv.filter(i=>i.date>=curStart&&i.date<=curEnd)) {
    const delegId = cdRows.find(r=>r.contact_id===inv.contact_id)?.delegate_id;
    if (!delegId) continue;
    if (!delegateByProduct[delegId]) {
      const p = profiles.find(p=>p.id===delegId);
      delegateByProduct[delegId]={id:delegId,name:p?.delegate_name??p?.full_name??"—",units:0,byProduct:{}};
    }
    const lines = inv.raw?.products??inv.raw?.items??[];
    for (const l of lines) {
      const u = Number(l.units??0);
      const isFoc = SKUS_PROMO.has(l.sku??"") || Number(l.price??-1)===0;
      if (isFoc) continue;
      delegateByProduct[delegId].units += u;
      const key = normName((l.name??l.sku??"").trim());
      if (key) delegateByProduct[delegId].byProduct[key]=(delegateByProduct[delegId].byProduct[key]??0)+u;
    }
  }
  const topDelegates = Object.values(delegateByProduct).sort((a,b)=>b.units-a.units).slice(0,12);

  // Annual evolution: all 12 months of current year (history already covers this)
  const yearHistory = history.filter(h=>h.year===year);

  // Max values for bar charts
  const maxRev = Math.max(...history.map(h=>h.revenue),1);
  const maxUnits = Math.max(...history.map(h=>h.allUnits),1);
  const maxNew = Math.max(...history.map(h=>h.newClients),1);

  const periodLabel = new Date(year,month).toLocaleDateString("es-ES",{month:"long",year:"numeric"});

  return (
    <div className="max-w-[1400px] mx-auto px-5 pt-5 pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A]">Brúixola — Quadre de Comandament</h1>
          <p className="text-xs text-[#9CA3AF] capitalize">{periodLabel}{isNow?" · En Curs":""}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BruixolaPeriodNav mesStr={mesStr} basePath="/dashboard/bruixola" />
          {[
            {href:"/dashboard/bruixola/objectius",label:"Objectius"},
            {href:"/dashboard/bruixola/rendiment",label:"Rendiment"},
            {href:"/dashboard/bruixola/financier",label:"Motor Econòmic"},
            {href:"/dashboard/bruixola/rendibilitat",label:"Rendibilitat"},
          ].map(n=>(
            <Link key={n.href} href={n.href}
              className="h-8 px-3 rounded-lg text-[12px] font-medium text-[#8E0E1A] border border-[#FECACA] hover:bg-[#FEF2F2] transition-colors flex items-center">
              {n.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* Objectius */}
      <ObjectiusDashboard objectius={objectius} currentYear={year} userId={profile.id} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label:"Ud. facturades", value:String(cur.allUnits), sub:`${cur.count} factures`, accent:false },
          { label:"Facturació", value:fmtK(cur.revenue), sub:`Marge ${fmtK(cur.grossMargin)}`, accent:true },
          { label:"Delegats actius", value:String(activeDelegates), sub:`de ${totalDelegates}`, accent:false },
          { label:"Clients actius", value:String(cur.activeClients), sub:`de ${totalClientsInCartera}`, accent:false },
          { label:"Clients nous", value:`+${cur.newClients}`, sub:"aquest mes", accent:false },
          { label:"FOC", value:String(cur.focUnits), sub:"unitats promocionals", accent:false },
        ].map(k=>(
          <div key={k.label} className={`rounded-xl border px-4 py-3 ${k.accent?"bg-[#8E0E1A] border-[#6B0A14]":"bg-white border-[#E5E7EB]"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${k.accent?"text-white/60":"text-[#9CA3AF]"}`}>{k.label}</p>
            <p className={`text-xl font-bold tabular-nums leading-tight mt-0.5 ${k.accent?"text-white":"text-[#0A0A0A]"}`}>{k.value}</p>
            {k.sub&&<p className={`text-[11px] mt-0.5 ${k.accent?"text-white/60":"text-[#9CA3AF]"}`}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* 3 bar charts — 12m */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {title:"Unitats · 12m",sub:`${cur.allUnits} ud`,vals:history.map(h=>h.allUnits),max:maxUnits,color:"#8E0E1A"},
          {title:"Facturació · 12m",sub:fmtEur(cur.revenue),vals:history.map(h=>h.revenue),max:maxRev,color:"#8E0E1A"},
          {title:"Clients nous · 12m",sub:`+${cur.newClients}`,vals:history.map(h=>h.newClients),max:maxNew,color:"#6366F1"},
        ].map(chart=>(
          <div key={chart.title} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-sm font-bold text-[#0A0A0A]">{chart.title}</p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{chart.sub}</p>
            <svg viewBox={`0 0 100 44`} className="w-full h-16 mt-2" preserveAspectRatio="none">
              {chart.vals.map((v,i)=>{
                const H=44,barW=100/chart.vals.length-1;
                const h=Math.max(2,(v/chart.max)*H);
                const x=i*(100/chart.vals.length);
                const isCur=history[i].year===year&&history[i].month===month+1;
                return <g key={i}>
                  <rect x={x+0.5} y={H-h} width={barW} height={h} rx="1.5" fill={isCur?chart.color:"#E5E7EB"}/>
                  {(i===0||i===chart.vals.length-1||isCur)&&<text x={x+barW/2} y={52} textAnchor="middle" fontSize="5" fill="#9CA3AF" fontFamily="sans-serif">{history[i].label}</text>}
                </g>;
              })}
            </svg>
          </div>
        ))}
      </div>

      {/* SKU breakdown */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-0.5">Unitats per producte · <span className="font-normal capitalize text-[#6B7280]">{periodLabel}</span></p>
        <p className="text-[11px] text-[#9CA3AF] mb-3">Línies de factura del mes · SKUs agrupats per nom</p>
        {skuBreakdown.length===0
          ? <p className="text-sm text-[#9CA3AF]">Sense dades</p>
          : <div className="divide-y divide-[#F9FAFB]">
              {skuBreakdown.map(r=>(
                <div key={r.normalizedName} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#0A0A0A] truncate capitalize">{r.name}</p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#8E0E1A]" style={{width:`${Math.round((r.units/(skuBreakdown[0].units||1))*100)}%`}}/>
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[#0A0A0A] w-10 text-right">{r.units}</span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Per-product delegate rankings */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-0.5">Top delegats per producte · <span className="font-normal capitalize text-[#6B7280]">{periodLabel}</span></p>
        <p className="text-[11px] text-[#9CA3AF] mb-4">Rànquing individual top 5 per cada producte</p>
        {skuBreakdown.length===0
          ? <p className="text-sm text-[#9CA3AF]">Sense vendes registrades</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {skuBreakdown.filter(p=>topDelegates.some(d=>(d.byProduct[p.normalizedName]??0)>0)).map(p=>{
                const ranked = [...topDelegates]
                  .filter(d=>(d.byProduct[p.normalizedName]??0)>0)
                  .sort((a,b)=>(b.byProduct[p.normalizedName]??0)-(a.byProduct[p.normalizedName]??0))
                  .slice(0,5);
                const maxU = ranked[0]?.byProduct[p.normalizedName]??1;
                return (
                  <div key={p.normalizedName} className="space-y-2">
                    <p className="text-xs font-bold text-[#0A0A0A] capitalize">{p.name}</p>
                    <div className="space-y-2">
                      {ranked.map((d,i)=>{
                        const u = d.byProduct[p.normalizedName]??0;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5">
                                <span className="text-[#D1D5DB] w-4 shrink-0">{i+1}</span>
                                <span className="font-medium text-[#0A0A0A] truncate max-w-[130px]">{d.name}</span>
                              </span>
                              <span className="font-semibold tabular-nums text-[#8E0E1A] shrink-0 ml-2">{u} ud</span>
                            </div>
                            <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden mt-1.5 ml-5">
                              <div className="h-full rounded-full bg-[#8E0E1A]" style={{width:`${Math.round((u/maxU)*100)}%`}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        }
        <div className="pt-3 border-t border-[#F3F4F6] text-center mt-4">
          <Link href="/dashboard/bruixola/rendiment" className="text-xs text-[#8E0E1A] hover:underline font-medium">
            Veure Rendiment complet →
          </Link>
        </div>
      </div>

      {/* Annual evolution table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-0.5">Evolució {year}</p>
        <p className="text-[11px] text-[#9CA3AF] mb-3">Gener–Desembre · per producte</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-2 pr-4 text-[#9CA3AF] font-semibold w-40">Producte</th>
                {Array.from({length:12},(_,i)=>{
                  const isFuture = year===now.getFullYear()&&i>month;
                  const isCur = i===month&&year===now.getFullYear();
                  return <th key={i} className={`text-right py-2 px-2 font-semibold w-12 ${isFuture?"text-[#D1D5DB]":isCur?"text-[#8E0E1A]":"text-[#9CA3AF]"}`}>{ML[i]}</th>;
                })}
                <th className="text-right py-2 pl-3 text-[#9CA3AF] font-semibold border-l border-[#E5E7EB] w-14">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {skuBreakdown.slice(0,10).map(p=>{
                // Find units for each month of current year
                const monthUnits = Array.from({length:12},(_,i)=>{
                  const found = history.find(h=>h.year===year&&h.month===i+1);
                  return found?.byProduct?.[p.normalizedName]?.units??0;
                });
                const total = monthUnits.reduce((s,v)=>s+v,0);
                return (
                  <tr key={p.normalizedName} className="hover:bg-[#FAFAFA]">
                    <td className="py-1.5 pr-4 font-medium text-[#374151] truncate max-w-[150px] capitalize">{p.name}</td>
                    {monthUnits.map((u,i)=>{
                      const isFuture = year===now.getFullYear()&&i>month;
                      return (
                        <td key={i} className={`text-right py-1.5 px-2 tabular-nums ${isFuture?"text-[#D1D5DB]":""}`}>
                          {isFuture?"—":u>0?u:<span className="text-[#D1D5DB]">0</span>}
                        </td>
                      );
                    })}
                    <td className="text-right py-1.5 pl-3 font-bold text-[#0A0A0A] border-l border-[#E5E7EB]">{total}</td>
                  </tr>
                );
              })}
              {/* FOC row */}
              <tr className="hover:bg-[#FAFAFA] border-t border-[#E5E7EB]">
                <td className="py-1.5 pr-4 text-[#9CA3AF] italic">FOC</td>
                {Array.from({length:12},(_,i)=>{
                  const isFuture = year===now.getFullYear()&&i>month;
                  const found = history.find(h=>h.year===year&&h.month===i+1);
                  const v = found?.focUnits??0;
                  return <td key={i} className={`text-right py-1.5 px-2 tabular-nums text-[#9CA3AF] ${isFuture?"text-[#D1D5DB]":""}`}>
                    {isFuture?"—":v>0?v:<span className="text-[#D1D5DB]">0</span>}
                  </td>;
                })}
                <td className="text-right py-1.5 pl-3 text-[#9CA3AF] border-l border-[#E5E7EB]">
                  {history.filter(h=>h.year===year).reduce((s,h)=>s+h.focUnits,0)}
                </td>
              </tr>
              {/* Revenue row */}
              <tr className="hover:bg-[#FAFAFA]">
                <td className="py-1.5 pr-4 font-semibold text-[#374151]">Facturació</td>
                {Array.from({length:12},(_,i)=>{
                  const isFuture = year===now.getFullYear()&&i>month;
                  const found = history.find(h=>h.year===year&&h.month===i+1);
                  const v = found?.revenue??0;
                  return <td key={i} className={`text-right py-1.5 px-2 tabular-nums ${isFuture?"text-[#D1D5DB]":""}`}>
                    {isFuture?"—":v>0?fmtK(v):<span className="text-[#D1D5DB]">—</span>}
                  </td>;
                })}
                <td className="text-right py-1.5 pl-3 font-bold text-[#8E0E1A] border-l border-[#E5E7EB]">
                  {fmtK(history.filter(h=>h.year===year).reduce((s,h)=>s+h.revenue,0))}
                </td>
              </tr>
              {/* New clients row */}
              <tr className="hover:bg-[#FAFAFA]">
                <td className="py-1.5 pr-4 text-[#374151]">Clients nous</td>
                {Array.from({length:12},(_,i)=>{
                  const isFuture = year===now.getFullYear()&&i>month;
                  const found = history.find(h=>h.year===year&&h.month===i+1);
                  const v = found?.newClients??0;
                  return <td key={i} className={`text-right py-1.5 px-2 tabular-nums text-[#6B7280] ${isFuture?"text-[#D1D5DB]":""}`}>
                    {isFuture?"—":v>0?`+${v}`:<span className="text-[#D1D5DB]">0</span>}
                  </td>;
                })}
                <td className="text-right py-1.5 pl-3 text-[#6B7280] border-l border-[#E5E7EB]">
                  +{history.filter(h=>h.year===year).reduce((s,h)=>s+h.newClients,0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Red Prospectia */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-3">Xarxa Prospectia</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {label:"DELEGATS",value:String(totalDelegates),sub:"en xarxa"},
            {label:"CLIENTS CARTERA",value:String(totalClientsInCartera),sub:"assignats"},
            {label:"ACTIUS AQUEST MES",value:String(cur.activeClients),sub:undefined},
            {label:"NOUS AQUEST MES",value:`+${cur.newClients}`,sub:"incorporats",green:true},
          ].map(({label,value,sub,green})=>(
            <div key={label}>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 leading-none ${green?"text-emerald-600":"text-[#0A0A0A]"}`}>{value}</p>
              {sub&&<p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-[#F3F4F6] flex gap-4 text-xs text-[#6B7280] mt-3">
          <span><strong className="text-[#0A0A0A]">{kolCount}</strong> KOLs</span>
          <span><strong className="text-[#0A0A0A]">{coordCount}</strong> Coordinadors</span>
          <span><strong className="text-[#0A0A0A]">{activeDelegates}</strong> delegats actius</span>
        </div>
      </div>

    </div>
  );
}
