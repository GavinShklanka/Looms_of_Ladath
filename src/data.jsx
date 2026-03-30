import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid, ReferenceLine } from "recharts";

const PRODUCTS = ["Shawl","Stole","Scarf","Sweater","Muffler","Cap","Gloves"];
const WOVEN = ["Shawl","Stole","Scarf"];
const KNIT = ["Sweater","Muffler","Cap","Gloves"];
const TYPE = {Shawl:"Woven",Stole:"Woven",Scarf:"Woven",Sweater:"Knit",Muffler:"Knit",Cap:"Knit",Gloves:"Knit"};
const RM_G = {Shawl:510,Stole:390,Scarf:210,Sweater:320,Muffler:175,Cap:75,Gloves:73};
const UNIT_COST = {Shawl:8638.10,Stole:6734.60,Scarf:3880.50,Sweater:5880.00,Muffler:3233.75,Cap:1385.75,Gloves:1349.05};
const SELL_PRICE = {Shawl:17276.20,Stole:13469.20,Scarf:7761.00,Sweater:11760.00,Muffler:6467.50,Cap:2771.50,Gloves:2698.10};
const PROFIT = {Shawl:4319.05,Stole:3367.30,Scarf:1940.25,Sweater:2940.00,Muffler:1616.88,Cap:554.30,Gloves:539.62};
const MARGIN = {Shawl:0.25,Stole:0.25,Scarf:0.25,Sweater:0.25,Muffler:0.25,Cap:0.20,Gloves:0.20};
const MIN_SKU = {Shawl:2,Stole:5,Scarf:10,Sweater:2,Muffler:4,Cap:5,Gloves:5};
const WEAVING_RATE = 500;
const KNITTING_RATE = 50;
const LABOR_DAYS = {};
WOVEN.forEach(p => LABOR_DAYS[p] = RM_G[p] / WEAVING_RATE);
KNIT.forEach(p => LABOR_DAYS[p] = RM_G[p] / KNITTING_RATE);
const WOVEN_RM_LIMIT = 15000;
const KNIT_RM_LIMIT = 23000;
const NUM_WEAVERS = 5;
const NUM_KNITTERS = 13;
const PLANNING_DAYS = 30;
const WEAVER_DAYS_LIMIT = NUM_WEAVERS * PLANNING_DAYS;
const KNITTER_DAYS_LIMIT = NUM_KNITTERS * PLANNING_DAYS;
const COLORS = ["#2E86AB","#A23B72","#F18F01","#C73E1D","#3B1F2B","#44BBA4","#E94F37"];

function solve(minSku = MIN_SKU) {
  let bestWoven = null, bestWovenProfit = -Infinity;
  const shaMax = Math.min(Math.floor(WOVEN_RM_LIMIT / RM_G.Shawl), Math.floor(WEAVER_DAYS_LIMIT / LABOR_DAYS.Shawl));
  const stoMax = Math.min(Math.floor(WOVEN_RM_LIMIT / RM_G.Stole), Math.floor(WEAVER_DAYS_LIMIT / LABOR_DAYS.Stole));
  for (let sha = (minSku.Shawl||0); sha <= shaMax; sha++) {
    for (let sto = (minSku.Stole||0); sto <= stoMax; sto++) {
      const rmLeft = WOVEN_RM_LIMIT - RM_G.Shawl*sha - RM_G.Stole*sto;
      const ldLeft = WEAVER_DAYS_LIMIT - LABOR_DAYS.Shawl*sha - LABOR_DAYS.Stole*sto;
      if (rmLeft < 0 || ldLeft < 0) continue;
      const scaMax = Math.min(Math.floor(rmLeft/RM_G.Scarf), Math.floor(ldLeft/LABOR_DAYS.Scarf));
      if (scaMax < (minSku.Scarf||0)) continue;
      const p = PROFIT.Shawl*sha + PROFIT.Stole*sto + PROFIT.Scarf*scaMax;
      if (p > bestWovenProfit) { bestWovenProfit = p; bestWoven = {Shawl:sha,Stole:sto,Scarf:scaMax}; }
    }
  }
  let bestKnit = null, bestKnitProfit = -Infinity;
  const sweMax = Math.min(40, Math.floor(KNIT_RM_LIMIT/RM_G.Sweater));
  const capMax = Math.min(20, Math.floor(KNIT_RM_LIMIT/RM_G.Cap));
  const gloMax = Math.min(20, Math.floor(KNIT_RM_LIMIT/RM_G.Gloves));
  for (let swe = (minSku.Sweater||0); swe <= sweMax; swe++) {
    for (let cap = (minSku.Cap||0); cap <= capMax; cap++) {
      for (let glo = (minSku.Gloves||0); glo <= gloMax; glo++) {
        const rmLeft = KNIT_RM_LIMIT - RM_G.Sweater*swe - RM_G.Cap*cap - RM_G.Gloves*glo;
        const ldLeft = KNITTER_DAYS_LIMIT - LABOR_DAYS.Sweater*swe - LABOR_DAYS.Cap*cap - LABOR_DAYS.Gloves*glo;
        if (rmLeft < 0 || ldLeft < 0) continue;
        const mufMax = Math.min(Math.floor(rmLeft/RM_G.Muffler), Math.floor(ldLeft/LABOR_DAYS.Muffler));
        if (mufMax < (minSku.Muffler||0)) continue;
        const p = PROFIT.Sweater*swe + PROFIT.Muffler*mufMax + PROFIT.Cap*cap + PROFIT.Gloves*glo;
        if (p > bestKnitProfit) { bestKnitProfit = p; bestKnit = {Sweater:swe,Muffler:mufMax,Cap:cap,Gloves:glo}; }
      }
    }
  }
  if (!bestWoven || !bestKnit) return null;
  return buildResult({...bestWoven,...bestKnit});
}

function buildResult(units) {
  const wovenRMUsed = WOVEN.reduce((s,p) => s + RM_G[p]*(units[p]||0), 0);
  const knitRMUsed = KNIT.reduce((s,p) => s + RM_G[p]*(units[p]||0), 0);
  const weaverUsed = WOVEN.reduce((s,p) => s + LABOR_DAYS[p]*(units[p]||0), 0);
  const knitterUsed = KNIT.reduce((s,p) => s + LABOR_DAYS[p]*(units[p]||0), 0);
  const totalProfit = PRODUCTS.reduce((s,p) => s + PROFIT[p]*(units[p]||0), 0);
  const totalRevenue = PRODUCTS.reduce((s,p) => s + SELL_PRICE[p]*(units[p]||0), 0);
  const totalUnits = PRODUCTS.reduce((s,p) => s + (units[p]||0), 0);
  return {
    units, profit: totalProfit, revenue: totalRevenue, totalUnits,
    wovenRM: { used:wovenRMUsed, limit:WOVEN_RM_LIMIT, pct:wovenRMUsed/WOVEN_RM_LIMIT*100 },
    knitRM: { used:knitRMUsed, limit:KNIT_RM_LIMIT, pct:knitRMUsed/KNIT_RM_LIMIT*100 },
    weaverDays: { used:weaverUsed, limit:WEAVER_DAYS_LIMIT, pct:weaverUsed/WEAVER_DAYS_LIMIT*100 },
    knitterDays: { used:knitterUsed, limit:KNITTER_DAYS_LIMIT, pct:knitterUsed/KNITTER_DAYS_LIMIT*100 },
    feasible: wovenRMUsed <= WOVEN_RM_LIMIT && knitRMUsed <= KNIT_RM_LIMIT && weaverUsed <= WEAVER_DAYS_LIMIT && knitterUsed <= KNITTER_DAYS_LIMIT,
  };
}

const SENS_DELTAS = [-50,-40,-30,-20,-10,0,10,20,30,40,50];
const SENS_DATA = {Shawl:[310373.15,311236.96,312100.77,312964.58,313828.39,314692.20,316772.00,325642.66,334712.66,343782.67,352852.68],Stole:[306273.95,307957.60,309641.25,311324.90,313008.55,314692.20,318843.67,328165.04,337988.65,348090.55,358192.45],Scarf:[298933.45,300873.70,302813.95,304842.60,306976.88,314692.20,325751.63,336811.05,347870.48,358929.90,369989.33],Sweater:[311570.88,312158.88,312746.88,313334.88,313922.88,314692.20,329649.57,346128.25,362592.25,379056.25,395520.25],Muffler:[309966.50,310613.25,311260.00,311906.75,312553.50,314692.20,331164.69,347818.50,364472.31,381126.12,397779.94],Cap:[313306.45,313583.60,313860.75,314137.90,314415.05,314692.20,314969.35,315260.89,321951.92,335031.19,348168.10],Gloves:[313343.15,313612.96,313882.77,314152.58,314422.39,314692.20,314962.01,315231.82,321867.67,334872.51,347879.34]};
const RHS_FACTORS = [0.5,0.75,1.0,1.25,1.5,1.75,2.0];
const RHS_DATA = {"Woven RM":[245282,280206,314692,349617,384541,418953,453364],"Knit RM":[240903,293967,314692,314692,314692,314692,314692],"Weaver-Days":[314692,314692,314692,314692,314692,314692,314692],"Knitter-Days":[217680,259229,314692,347030,347030,347030,347030]};
const SCENARIOS = [{name:"Base Case",units:{Shawl:2,Stole:5,Scarf:57,Sweater:5,Muffler:98,Cap:5,Gloves:5},profit:314692.20,revenue:1264238.40},{name:"Raw Material +25%",units:{Shawl:2,Stole:5,Scarf:75,Sweater:5,Muffler:98,Cap:5,Gloves:5},profit:349616.70,revenue:1403936.40},{name:"Raw Material −25%",units:{Shawl:3,Stole:5,Scarf:37,Sweater:4,Muffler:87,Cap:5,Gloves:5},profit:259480.62,revenue:1043392.10},{name:"+2 Weavers",units:{Shawl:2,Stole:5,Scarf:57,Sweater:5,Muffler:98,Cap:5,Gloves:5},profit:314692.20,revenue:1264238.40},{name:"+2 Knitters",units:{Shawl:2,Stole:5,Scarf:57,Sweater:4,Muffler:117,Cap:5,Gloves:5},profit:342472.82,revenue:1375360.90},{name:"+2 Weavers & Knitters",units:{Shawl:2,Stole:5,Scarf:57,Sweater:4,Muffler:117,Cap:5,Gloves:5},profit:342472.82,revenue:1375360.90},{name:"RM +25% & More Labour",units:{Shawl:2,Stole:5,Scarf:75,Sweater:4,Muffler:117,Cap:5,Gloves:5},profit:377397.32,revenue:1515058.90}];
const PARETO = [{alpha:0.00,profit:62694.20,rm:7150},{alpha:0.05,profit:62694.20,rm:7150},{alpha:0.10,profit:313956.57,rm:34345},{alpha:0.15,profit:314692.20,rm:34430},{alpha:0.20,profit:314692.20,rm:34430},{alpha:0.25,profit:314692.20,rm:34430},{alpha:0.30,profit:314692.20,rm:34430},{alpha:0.35,profit:314692.20,rm:34430},{alpha:0.40,profit:314692.20,rm:34430},{alpha:0.45,profit:314692.20,rm:34430},{alpha:0.50,profit:314692.20,rm:34430},{alpha:0.55,profit:314692.20,rm:34430},{alpha:0.60,profit:314692.20,rm:34430},{alpha:0.65,profit:314692.20,rm:34430},{alpha:0.70,profit:314692.20,rm:34430},{alpha:0.75,profit:314692.20,rm:34430},{alpha:0.80,profit:314692.20,rm:34430},{alpha:0.85,profit:314692.20,rm:34430},{alpha:0.90,profit:314692.20,rm:34430},{alpha:0.95,profit:314692.20,rm:34430},{alpha:1.00,profit:314692.20,rm:34430}];

const fmt = (v,d=0) => `₹${v.toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d})}`;
const fmtK = (v) => `₹${(v/1000).toFixed(0)}K`;
const pct = (v) => `${v.toFixed(1)}%`;
const num = (v) => v.toLocaleString('en-IN');
const TT = ({active,payload,label,formatter}) => {
  if (!active||!payload?.length) return null;
  return (<div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
    <p className="text-gray-300 font-semibold mb-1">{label}</p>
    {payload.map((e,i) => <p key={i} style={{color:e.color||e.stroke||e.fill}}>{e.name}: {formatter?formatter(e.value):e.value?.toLocaleString()}</p>)}
  </div>);
};
const KPI = ({label,value,sub,color="text-cyan-400"}) => (
  <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
    <div className={`text-2xl font-black tracking-tight ${color}`}>{value}</div>
    <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1 font-bold">{label}</div>
    {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
  </div>
);
const ResBar = ({label,used,limit,unit=""}) => {
  const p = used/limit*100;
  const over = used > limit * 1.001;
  const c = over?"bg-red-600":p>95?"bg-red-500":p>70?"bg-amber-500":p>30?"bg-cyan-500":"bg-gray-600";
  const tc = over?"text-red-400 font-bold":p>95?"text-red-400":p>70?"text-amber-400":"text-gray-400";
  return (<div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-gray-300 font-semibold">{label}</span><span className={tc}>{num(Math.round(used))}{unit} / {num(limit)}{unit} ({pct(p)}){over?" ⛔":""}</span></div><div className="h-3 bg-gray-700 rounded-full overflow-hidden relative"><div className={`h-full ${c} rounded-full transition-all duration-300`} style={{width:`${Math.min(p,100)}%`}}/>{over && <div className="absolute inset-0 bg-red-500/20 animate-pulse rounded-full"/>}</div></div>);
};

export { solve, buildResult, PRODUCTS, WOVEN, KNIT, TYPE, RM_G, UNIT_COST, SELL_PRICE, PROFIT, MARGIN, MIN_SKU, LABOR_DAYS, WEAVING_RATE, KNITTING_RATE, WOVEN_RM_LIMIT, KNIT_RM_LIMIT, NUM_WEAVERS, NUM_KNITTERS, PLANNING_DAYS, WEAVER_DAYS_LIMIT, KNITTER_DAYS_LIMIT, COLORS, SENS_DELTAS, SENS_DATA, RHS_FACTORS, RHS_DATA, SCENARIOS, PARETO, fmt, fmtK, pct, num, TT, KPI, ResBar };
