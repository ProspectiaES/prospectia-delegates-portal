import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { delegateStatus, STATUS_BADGE, roiBadgeCls } from "@/lib/skus";
import { BruixolaPeriodNav } from "@/components/BruixolaPeriodNav";

export const metadata = { title: "Brúixola — Rendiment Delegats" };

type CommType = "percent" | "amount";
const MEDALS = ["🥇","🥈","🥉"];
const AFFILIATE_RATE = 0.20;

function monthRange(y: number, m: number) {
  return { start: new Date(Date.UTC(y,m,1)).toISOString(), end: new Date(Date.UTC(y,m+1,0,23,59,59,999)).toISOString() };
}
function fmtEuro(n: number) {
  return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}
function fmtPct(n: number) { return `${n>=0?"+":""}${n.toFixed(1)}%`; }

function calcLine(units: number, price: number, disc: number, rate: number|null, type: CommType) {
  if (!rate) return 0;
  const net = units * price * (1 - disc/100);
  return type === "amount" ? units * rate : (net * rate) / 100;
}

interface ProductInfo {
  sku: string|null; cost: number|null;
  commission_delegate: number|null; commission_delegate_type: CommType;
  commission_4: number|null; commission_4_type: CommType;
  commission_5: number|null; commission_5_type: CommType;
}
interface ContactMeta { kol_id: string|null; affiliate_id: string|null; coordinator_id: string|null; recommender_id: string|null; recommender_rate: number|null; }
interface ContactAgg { subtotal: number; count: number; sprayUnits: number; focUnits: number; cogs: number; focCogs: number; commDelegate: number; commRec: number; commKol: number; commAffiliate: number; commCoord: number; }

export default async function RendimentPage({ searchParams }: { searchParams: Promise<{mes?:string}> }) {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) notFound();

  const sp  = await searchParams;
  const now = new Date();
  let pYear = now.getFullYear(), pMonth = now.getMonth();
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) { const [y,m]=sp.mes.split("-").map(Number); pYear=y; pMonth=m-1; }
  const mesStr = `${pYear}-${String(pMonth+1).padStart(2,"0")}`;
  const isNow  = mesStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  const { start: curStart, end: curEnd } = monthRange(pYear, pMonth);
  const prevD = pMonth===0 ? {y:pYear-1,m:11} : {y:pYear,m:pMonth-1};
  const { start: prevStart, end: prevEnd } = monthRange(prevD.y, prevD.m);
  const { start: yoyStart, end: yoyEnd }   = monthRange(pYear-1, pMonth);
  const ninetyDaysAgo = new Date(Date.now()-90*86400000).toISOString();
  const yearAgo       = new Date(Date.UTC(pYear-1, pMonth+1, 1)).toISOString();

  const admin = createAdminClient();
  const [delegatesRes, cdRes, curInvRes, prevInvRes, yoyInvRes, productsRes, contactsRes, yearInvRes, overdueRes] = await Promise.all([
    admin.from("profiles").select("id,full_name,delegate_name,email,is_kol").in("role",["DELEGATE","KOL","COORDINATOR"]).order("full_name"),
    admin.from("contact_delegates").select("delegate_id,contact_id,assigned_at"),
    admin.from("holded_invoices").select("id,contact_id,subtotal,raw").eq("status",3).eq("is_credit_note",false).gte("date_paid",curStart).lte("date_paid",curEnd),
    admin.from("holded_invoices").select("contact_id,subtotal,raw").eq("status",3).eq("is_credit_note",false).gte("date_paid",prevStart).lte("date_paid",prevEnd),
    admin.from("holded_invoices").select("contact_id,subtotal").eq("status",3).eq("is_credit_note",false).gte("date_paid",yoyStart).lte("date_paid",yoyEnd),
    admin.from("holded_products").select("id,sku,cost,purchase_price,commission_delegate,commission_delegate_type,commission_4,commission_4_type,commission_5,commission_5_type"),
    admin.from("holded_contacts").select("id,kol_id,affiliate_id,coordinator_id,recommender_id,recommender_rate"),
    admin.from("holded_invoices").select("contact_id").eq("status",3).eq("is_credit_note",false).gte("date_paid",yearAgo),
    admin.from("holded_invoices").select("contact_id").eq("status",2),
  ]);

  type RawLine = { productId?:string; units?:number|string; price?:number|string; discount?:number|string };
  type InvWithRaw = { id:string; contact_id:string; subtotal:number|null; raw: Record<string,unknown> };
  type InvPrev    = { contact_id:string; subtotal:number|null; raw: Record<string,unknown> };
  type InvYoy     = { contact_id:string; subtotal:number|null };

  const delegates   = (delegatesRes.data??[]) as {id:string;full_name:string;delegate_name:string|null;email:string|null;is_kol:boolean}[];
  const cdRows      = (cdRes.data??[]) as {delegate_id:string;contact_id:string;assigned_at:string}[];
  const curInvs     = (curInvRes.data??[]) as InvWithRaw[];
  const prevInvs    = (prevInvRes.data??[]) as InvPrev[];
  const yoyInvs     = (yoyInvRes.data??[]) as InvYoy[];
  const yearInvs    = (yearInvRes.data??[]) as {contact_id:string}[];
  const overdueInvs = (overdueRes.data??[]) as {contact_id:string}[];

  // Product map
  const productMap: Record<string,ProductInfo> = {};
  let sprayCost = 6;
  for (const p of (productsRes.data??[]) as {id:string;sku:string|null;cost:number|null;purchase_price:number|null;commission_delegate:number|null;commission_delegate_type:string;commission_4:number|null;commission_4_type:string;commission_5:number|null;commission_5_type:string}[]) {
    const cost = p.cost??p.purchase_price??null;
    productMap[p.id] = { sku:p.sku, cost, commission_delegate:p.commission_delegate, commission_delegate_type:(p.commission_delegate_type??"percent") as CommType, commission_4:p.commission_4, commission_4_type:(p.commission_4_type??"percent") as CommType, commission_5:p.commission_5, commission_5_type:(p.commission_5_type??"percent") as CommType };
    if (p.sku==="VIHO-OBE-SPRAY-002" && cost!=null) sprayCost=cost;
  }

  const contactMeta: Record<string,ContactMeta> = {};
  for (const c of (contactsRes.data??[]) as (ContactMeta&{id:string})[]) contactMeta[c.id]=c;

  const yearActiveIds   = new Set(yearInvs.map(i=>i.contact_id));
  const overdueContactIds = new Set(overdueInvs.map(i=>i.contact_id));

  const invoiceIds          = curInvs.map(i=>i.id).filter(Boolean);
  const curActiveContactIds = [...new Set(curInvs.map(i=>i.contact_id))];

  const [bixgrowRes, priorRes] = await Promise.all([
    invoiceIds.length>0 ? admin.from("bixgrow_orders").select("invoice_id,commission").in("invoice_id",invoiceIds) : {data:[]},
    curActiveContactIds.length>0 ? admin.from("holded_invoices").select("contact_id").in("contact_id",curActiveContactIds).eq("status",3).eq("is_credit_note",false).lt("date_paid",curStart).limit(500) : {data:[]},
  ]);

  const bixgrowMap: Record<string,number> = {};
  for (const bo of (bixgrowRes.data??[]) as {invoice_id:string|null;commission:number}[]) {
    if (bo.invoice_id) bixgrowMap[bo.invoice_id]=(bixgrowMap[bo.invoice_id]??0)+bo.commission;
  }
  const priorContactIds = new Set((priorRes.data??[]).map(r=>(r as {contact_id:string}).contact_id));
  const newClientIds    = new Set(curActiveContactIds.filter(id=>!priorContactIds.has(id)));

  // Build contact aggregates
  function buildContactAgg(invs: (InvWithRaw|InvPrev)[], withId=false): Record<string,ContactAgg> {
    const agg: Record<string,ContactAgg> = {};
    for (const inv of invs) {
      const cid  = inv.contact_id;
      const meta = contactMeta[cid]??{kol_id:null,affiliate_id:null,coordinator_id:null,recommender_id:null,recommender_rate:null};
      if (!agg[cid]) agg[cid]={subtotal:0,count:0,sprayUnits:0,focUnits:0,cogs:0,focCogs:0,commDelegate:0,commRec:0,commKol:0,commAffiliate:0,commCoord:0};
      const invSub = (inv.subtotal??0);
      agg[cid].subtotal+=invSub; agg[cid].count++;
      if (meta.recommender_id) { const recRate=contactMeta[meta.recommender_id]?.recommender_rate??0; if(recRate>0) agg[cid].commRec+=invSub*(recRate/100); }
      const invId = withId ? (inv as InvWithRaw).id : null;
      if (invId&&bixgrowMap[invId]!=null) agg[cid].commAffiliate+=bixgrowMap[invId];
      else if (meta.affiliate_id) agg[cid].commAffiliate+=invSub*AFFILIATE_RATE;
      for (const rp of ((inv.raw?.products??[]) as RawLine[])) {
        if (!rp.productId) continue;
        const prod = productMap[rp.productId]; if (!prod) continue;
        const units=Number(rp.units)||0, price=Number(rp.price)||0, disc=Number(rp.discount)||0, isFoc=price===0;
        if (isFoc) { agg[cid].focUnits+=units; agg[cid].focCogs+=units*sprayCost; }
        else {
          agg[cid].sprayUnits+=units; agg[cid].cogs+=units*sprayCost;
          agg[cid].commDelegate+=calcLine(units,price,disc,prod.commission_delegate,prod.commission_delegate_type);
          if (meta.kol_id)         agg[cid].commKol  +=calcLine(units,price,disc,prod.commission_4,prod.commission_4_type);
          if (meta.coordinator_id) agg[cid].commCoord+=calcLine(units,price,disc,prod.commission_5,prod.commission_5_type);
        }
      }
    }
    return agg;
  }

  const curAgg  = buildContactAgg(curInvs, true);
  const prevAgg = buildContactAgg(prevInvs);
  const yoySubByContact: Record<string,number> = {};
  for (const inv of yoyInvs) yoySubByContact[inv.contact_id]=(yoySubByContact[inv.contact_id]??0)+(inv.subtotal??0);

  const delegateContacts: Record<string,Set<string>> = {};
  for (const cd of cdRows) { if (!delegateContacts[cd.delegate_id]) delegateContacts[cd.delegate_id]=new Set(); delegateContacts[cd.delegate_id].add(cd.contact_id); }

  interface DelegateRow {
    id:string; name:string; email:string|null; is_kol:boolean;
    sprayUnits:number; focUnits:number; prevSprayUnits:number;
    deltaUnits:number|null; deltaYoy:number|null;
    ingresos:number; prevIngresos:number;
    cogs:number; grossMargin:number;
    commDelegate:number; commRec:number; commKol:number; commAffiliate:number; commCoord:number; totalChain:number;
    netContribution:number; netMarginPct:number|null; roi:number|null;
    invoiceCount:number;
    totalClients:number; activeClients:number; newClients:number; dormantClients:number;
    status: ReturnType<typeof delegateStatus>;
  }

  const rows: DelegateRow[] = delegates.map(d=>{
    const contacts = delegateContacts[d.id]??new Set<string>();
    let ingresos=0,prevIngresos=0,yoyIngresos=0,sprayUnits=0,focUnits=0,prevSprayUnits=0;
    let cogs=0,focCogs=0,commDelegate=0,commRec=0,commKol=0,commAffiliate=0,commCoord=0,invoiceCount=0;
    const activeSet=new Set<string>(); let newClients=0,dormantClients=0;
    for (const cid of contacts) {
      const cur=curAgg[cid], prev=prevAgg[cid];
      if (cur) { ingresos+=cur.subtotal; sprayUnits+=cur.sprayUnits; focUnits+=cur.focUnits; cogs+=cur.cogs; focCogs+=cur.focCogs; commDelegate+=cur.commDelegate; commRec+=cur.commRec; commKol+=cur.commKol; commAffiliate+=cur.commAffiliate; commCoord+=cur.commCoord; invoiceCount+=cur.count; activeSet.add(cid); }
      prevIngresos+=prev?.subtotal??0; prevSprayUnits+=prev?.sprayUnits??0;
      yoyIngresos+=yoySubByContact[cid]??0;
      if (newClientIds.has(cid)) newClients++;
      if (yearActiveIds.has(cid)&&!activeSet.has(cid)) dormantClients++;
    }
    const grossMargin=ingresos-cogs-focCogs;
    const totalChain=commDelegate+commKol+commAffiliate+commCoord;
    const netContribution=grossMargin-totalChain;
    const netMarginPct=ingresos>0?(netContribution/ingresos)*100:null;
    const roi=totalChain>0?ingresos/totalChain:null;
    const deltaUnits=prevSprayUnits>0?((sprayUnits-prevSprayUnits)/prevSprayUnits)*100:null;
    const deltaYoy=yoyIngresos>0?((ingresos-yoyIngresos)/yoyIngresos)*100:null;
    return { id:d.id, name:d.delegate_name??d.full_name, email:d.email, is_kol:d.is_kol, sprayUnits, focUnits, prevSprayUnits, deltaUnits, deltaYoy, ingresos, prevIngresos, cogs:cogs+focCogs, grossMargin, commDelegate, commRec, commKol, commAffiliate, commCoord, totalChain, netContribution, netMarginPct, roi, invoiceCount, totalClients:contacts.size, activeClients:activeSet.size, newClients, dormantClients, status:delegateStatus(sprayUnits) };
  });
  rows.sort((a,b)=>b.sprayUnits-a.sprayUnits);

  const total = {
    ingresos:rows.reduce((s,r)=>s+r.ingresos,0), prev:rows.reduce((s,r)=>s+r.prevIngresos,0),
    sprayUnits:rows.reduce((s,r)=>s+r.sprayUnits,0), commChain:rows.reduce((s,r)=>s+r.totalChain,0),
    netContrib:rows.reduce((s,r)=>s+r.netContribution,0), grossMargin:rows.reduce((s,r)=>s+r.grossMargin,0),
    newClients:rows.reduce((s,r)=>s+r.newClients,0), invoices:rows.reduce((s,r)=>s+r.invoiceCount,0),
    active:rows.filter(r=>r.sprayUnits>0).length, dormant:rows.reduce((s,r)=>s+r.dormantClients,0), overdueContacts:overdueContactIds.size,
  };
  const totalDeltaRev = total.prev>0?((total.ingresos-total.prev)/total.prev)*100:null;
  const totalRoi = total.commChain>0?total.ingresos/total.commChain:null;

  const statusCount = { top:rows.filter(r=>r.status==="top").length, activo:rows.filter(r=>r.status==="activo").length, bajo:rows.filter(r=>r.status==="bajo").length, "sin-ventas":rows.filter(r=>r.status==="sin-ventas").length };

  const byUnits  = rows.filter(r=>r.sprayUnits>0).slice(0,5);
  const byGrowth = rows.filter(r=>r.deltaUnits!==null).sort((a,b)=>(b.deltaUnits??0)-(a.deltaUnits??0)).slice(0,5);
  const byRoi    = rows.filter(r=>r.roi!==null&&r.roi>0).sort((a,b)=>(b.roi??0)-(a.roi??0)).slice(0,5);
  const byNew    = rows.filter(r=>r.newClients>0).sort((a,b)=>b.newClients-a.newClients).slice(0,5);

  const periodLabel = new Date(pYear,pMonth).toLocaleDateString("es-ES",{month:"long",year:"numeric"});
  const prevLabel   = new Date(prevD.y,prevD.m).toLocaleDateString("es-ES",{month:"long",year:"numeric"});

  return (
    <div className="max-w-screen-xl mx-auto px-5 py-6 space-y-5" style={{background:"#FAF9F7"}}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/bruixola" className="text-[12px] text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">← Brúixola</Link>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mt-0.5">Rendiment de delegats</h1>
          <p className="mt-0.5 text-sm text-[#6B7280] capitalize">
            {periodLabel} · vs {prevLabel}
            {!isNow&&<span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">històric</span>}
          </p>
        </div>
        <BruixolaPeriodNav mesStr={mesStr} basePath="/dashboard/bruixola/rendiment" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label:"Delegats actius", accent:"#5A2E3A", value:`${total.active} / ${rows.length}`,
            sub:<span className="text-[#6B7280]">{statusCount.top} top · {statusCount.activo} actius · {statusCount.bajo} baix · {statusCount["sin-ventas"]} sense vendes</span> },
          { label:"Unitats venudes", accent:"#059669", value:total.sprayUnits.toString(),
            sub:totalDeltaRev!==null?<span className={totalDeltaRev>=0?"text-emerald-600":"text-red-600"}>{fmtPct(totalDeltaRev)} vs {prevLabel}</span>:<span className="text-[#9CA3AF]">sense dades anteriors</span> },
          { label:"Base imposable total", accent:"#2563EB", value:fmtEuro(total.ingresos),
            sub:<span className="text-[#6B7280]">{total.invoices} factures cobrades · {total.newClients} clients nous</span> },
          { label:"Comissions pagades", accent:"#7C3AED", value:fmtEuro(total.commChain),
            sub:<span className="text-[#6B7280]">cadena completa: delegat + KOL + afiliat + coord.</span> },
          { label:"ROI global", accent:totalRoi!=null&&totalRoi>=10?"#059669":"#D97706", value:totalRoi!=null?`${totalRoi.toFixed(1)}x`:"—",
            sub:<span className={total.netContrib>=0?"text-emerald-600":"text-red-600"}>Contrib. neta: {fmtEuro(total.netContrib)}</span> },
        ].map(({label,accent,value,sub})=>(
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div style={{backgroundColor:accent,height:3}}/>
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
              <p className="mt-1 text-xl font-bold text-[#0A0A0A] tabular-nums">{value}</p>
              <p className="mt-1 text-xs">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status + alerts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Distribució:</span>
        {(["top","activo","bajo","sin-ventas"] as const).map(s=>statusCount[s]>0&&(
          <span key={s} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[s].cls}`}>{STATUS_BADGE[s].label} · {statusCount[s]}</span>
        ))}
        {total.dormant>0&&<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">{total.dormant} clients dormits</span>}
        {total.overdueContacts>0&&<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">{total.overdueContacts} factures vençudes</span>}
      </div>

      {/* Main delegate table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {[
                  {h:"Delegat",w:"text-left",t:"Nom del delegat"},
                  {h:"Ud.",w:"text-right",t:"Unitats de spray venudes (preu > 0)"},
                  {h:"Δ mes ant.",w:"text-center",t:"Variació % en unitats vs mes anterior"},
                  {h:"Ingressos",w:"text-right",t:"Base imposable facturada (sense IVA)"},
                  {h:"Com. bruta",w:"text-right",t:"Comissió bruta del delegat"},
                  {h:"Com. rec.",w:"text-right",t:"Comissió per al recomanador"},
                  {h:"Com. neta del.",w:"text-right",t:"Comissió neta que rep el delegat"},
                  {h:"ROI",w:"text-center",t:"Ingressos / total comissions. ≥15x excel·lent"},
                  {h:"Fact.",w:"text-center",t:"Factures cobrades al període"},
                  {h:"Actius",w:"text-center",t:"Clients amb factura al període / total"},
                  {h:"Nous",w:"text-center",t:"Clients sense factura prèvia"},
                  {h:"Dormits",w:"text-center",t:"Clients amb historial però inactius 90 dies"},
                  {h:"Estat",w:"text-left",t:"Sin ventas=0, Bajo=<25, Activo=25-99, Top=100+"},
                ].map(({h,w,t})=>(
                  <th key={h} title={t} className={`px-3 py-3 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap cursor-help ${w}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map(r=>{
                const sb=STATUS_BADGE[r.status]; const rcb=roiBadgeCls(r.roi); const commNeta=r.commDelegate-r.commRec;
                return (
                  <tr key={r.id} className={`hover:bg-[#F9FAFB] transition-colors ${r.status==="sin-ventas"?"opacity-60":""}`}>
                    <td className="px-3 py-3 whitespace-nowrap sticky left-0 z-10 bg-white">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/dashboard/performance/${r.id}`} className="font-medium text-[#0A0A0A] hover:text-[#5A2E3A] transition-colors">{r.name}</Link>
                        {r.is_kol&&<span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-purple-50 text-purple-700">KOL</span>}
                        <Link href={`/dashboard/delegados/${r.id}`} className="text-[10px] text-[#9CA3AF] hover:text-[#5A2E3A]" title="Dashboard delegat">↗</Link>
                      </div>
                      {r.email&&<p className="text-[10px] text-[#9CA3AF] mt-0.5">{r.email}</p>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-right font-semibold text-[#0A0A0A]">
                      {r.sprayUnits>0?r.sprayUnits:<span className="text-[#D1D5DB] font-normal">—</span>}
                      {r.focUnits>0&&<p className="text-[9px] text-amber-600 font-normal">+{r.focUnits} FOC</p>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-center">
                      {r.deltaUnits!==null?<span className={`text-xs font-semibold ${r.deltaUnits>=0?"text-emerald-600":"text-red-600"}`}>{fmtPct(r.deltaUnits)}</span>:<span className="text-[#D1D5DB] text-xs">n/d</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-right font-semibold text-[#0A0A0A] whitespace-nowrap">
                      {r.ingresos>0?fmtEuro(r.ingresos):<span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.commDelegate>0?<span className="text-[#7C3AED] font-semibold">{fmtEuro(r.commDelegate)}</span>:<span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.commRec>0?<span className="text-amber-600 text-xs">{fmtEuro(r.commRec)}</span>:<span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.commDelegate>0?<span className="font-semibold text-[#0A0A0A]">{fmtEuro(commNeta)}</span>:<span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.roi!==null?<span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${rcb}`}>{r.roi.toFixed(1)}x</span>:<span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-center text-[#374151] text-xs">{r.invoiceCount||"—"}</td>
                    <td className="px-3 py-3 tabular-nums text-center text-[#374151] text-xs">
                      {r.activeClients>0?`${r.activeClients}/${r.totalClients}`:<span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-center">
                      {r.newClients>0?<span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">+{r.newClients}</span>:<span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-center">
                      {r.dormantClients>0?<span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{r.dormantClients}</span>:<span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${sb.cls}`}>{sb.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#0A0A0A] text-white">
                <td className="px-3 py-3 text-xs font-semibold">{rows.length} delegats</td>
                <td className="px-3 py-3 tabular-nums text-right font-bold">{total.sprayUnits}</td>
                <td/>
                <td className="px-3 py-3 tabular-nums text-right font-bold">{fmtEuro(total.ingresos)}</td>
                <td className="px-3 py-3 tabular-nums text-right text-purple-300">{fmtEuro(rows.reduce((s,r)=>s+r.commDelegate,0))}</td>
                <td className="px-3 py-3 tabular-nums text-right text-amber-300 text-xs">{fmtEuro(rows.reduce((s,r)=>s+r.commRec,0))}</td>
                <td className="px-3 py-3 tabular-nums text-right font-semibold">{fmtEuro(rows.reduce((s,r)=>s+r.commDelegate-r.commRec,0))}</td>
                <td className="px-3 py-3 tabular-nums text-center text-xs">{totalRoi!==null?`${totalRoi.toFixed(1)}x`:"—"}</td>
                <td className="px-3 py-3 tabular-nums text-center text-xs">{total.invoices}</td>
                <td className="px-3 py-3 tabular-nums text-center text-xs">{rows.reduce((s,r)=>s+r.activeClients,0)}/{rows.reduce((s,r)=>s+r.totalClients,0)}</td>
                <td className="px-3 py-3 tabular-nums text-center text-xs text-blue-300">+{total.newClients}</td>
                <td className="px-3 py-3 tabular-nums text-center text-xs text-orange-300">{total.dormant}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rankings */}
      {(byUnits.length>0||byGrowth.length>0||byRoi.length>0||byNew.length>0)&&(
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A] mb-3">Rànquings del període</h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[
              { title:"Per unitats venudes", items:byUnits.map((r,i)=>({medal:MEDALS[i]??`${i+1}.`,name:r.name,main:`${r.sprayUnits} ud`,sub1:r.deltaUnits!==null?`${fmtPct(r.deltaUnits)} vs mes ant.`:null,sub2:r.deltaYoy!==null?`${fmtPct(r.deltaYoy)} vs any ant.`:null,href:`/dashboard/performance/${r.id}`})) },
              { title:"Major creixement",    items:byGrowth.map((r,i)=>({medal:MEDALS[i]??`${i+1}.`,name:r.name,main:r.deltaUnits!==null?fmtPct(r.deltaUnits):"—",sub1:`${r.prevSprayUnits} → ${r.sprayUnits} ud`,sub2:null,href:`/dashboard/performance/${r.id}`})) },
              { title:"Millor ROI",          items:byRoi.map((r,i)=>({medal:MEDALS[i]??`${i+1}.`,name:r.name,main:r.roi!==null?`${r.roi.toFixed(1)}x`:"—",sub1:fmtEuro(r.ingresos),sub2:r.commDelegate>0?`Com.: ${fmtEuro(r.commDelegate)}`:null,href:`/dashboard/performance/${r.id}`})) },
              { title:"Més clients nous",    items:byNew.map((r,i)=>({medal:MEDALS[i]??`${i+1}.`,name:r.name,main:`+${r.newClients} nous`,sub1:`Total: ${r.totalClients}`,sub2:null,href:`/dashboard/performance/${r.id}`})) },
            ].map(section=>(
              <div key={section.title} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
                <p className="text-xs font-bold text-[#0A0A0A] mb-3">{section.title}</p>
                <div className="space-y-3">
                  {section.items.map((item,i)=>(
                    <div key={i}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="text-[13px] shrink-0 w-5">{item.medal}</span>
                          <div className="min-w-0">
                            <Link href={item.href} className="text-xs font-medium text-[#0A0A0A] hover:text-[#5A2E3A] truncate block">{item.name}</Link>
                            {item.sub1&&<p className="text-[10px] text-[#9CA3AF]">{item.sub1}</p>}
                            {item.sub2&&<p className="text-[10px] text-[#9CA3AF]">{item.sub2}</p>}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#8E0E1A] shrink-0">{item.main}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
