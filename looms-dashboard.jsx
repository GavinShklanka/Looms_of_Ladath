import { useState } from "react";
import { WOVEN_RM_LIMIT, KNIT_RM_LIMIT, NUM_WEAVERS, NUM_KNITTERS, PLANNING_DAYS, num } from "./src/data.jsx";
import { UnitEconomicsTab, AllocationTab, BaselineTab, SensitivityTab, RHSTab, ScenarioTab, ParetoTab } from "./src/tabs.jsx";
import { ModelTab } from "./src/ModelTab.jsx";

const TABS = [
  {id:"unit",label:"Unit Economics",icon:"💰"},{id:"allocation",label:"Beat the Optimizer",icon:"🎯"},
  {id:"baseline",label:"Optimal Solution",icon:"◎"},{id:"sensitivity",label:"Sensitivity",icon:"〰"},
  {id:"rhs",label:"Constraint Ranging",icon:"↕"},{id:"scenarios",label:"Scenarios",icon:"⬡"},
  {id:"pareto",label:"Pareto Frontier",icon:"◈"},{id:"model",label:"Model Reference",icon:"📋"},
];

export default function LoomsDashboard() {
  const [tab,setTab] = useState("unit");
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" style={{fontFamily:"'Segoe UI','Helvetica Neue',system-ui,sans-serif"}}>
      <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'}}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{background:'radial-gradient(circle, #F18F01 0%, transparent 70%)',transform:'translate(30%,-50%)'}}/>
        <div className="px-6 py-8 max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[3px] text-amber-500 font-bold">IIM Bangalore IMB 935</span>
            <span className="text-gray-600">·</span>
            <span className="text-[10px] uppercase tracking-[3px] text-gray-500 font-bold">MILP Optimization</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Looms of Ladakh <span className="text-lg font-medium text-gray-400 ml-2">Strategy Simulator</span></h1>
          <p className="text-sm text-gray-400 max-w-2xl">Optimal product mix for the Okhai e-commerce launch — 7 artisan products competing for 4 fixed resource pools.</p>
        </div>
      </div>
      <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6"><div className="flex gap-1 overflow-x-auto py-1" style={{scrollbarWidth:'none'}}>
          {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${tab===t.id?'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30':'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent'}`}><span className="text-sm">{t.icon}</span>{t.label}</button>))}
        </div></div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab==="unit"&&<UnitEconomicsTab/>}{tab==="allocation"&&<AllocationTab/>}{tab==="baseline"&&<BaselineTab/>}
        {tab==="sensitivity"&&<SensitivityTab/>}{tab==="rhs"&&<RHSTab/>}{tab==="scenarios"&&<ScenarioTab/>}
        {tab==="pareto"&&<ParetoTab/>}{tab==="model"&&<ModelTab/>}
      </div>
      <div className="border-t border-gray-800 mt-8"><div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-gray-600">
        <span>Source: looms_of_ladakh_optimization.py</span><span>Fixed: {num(WOVEN_RM_LIMIT)}g woven · {num(KNIT_RM_LIMIT)}g knit · {NUM_WEAVERS} weavers · {NUM_KNITTERS} knitters · {PLANNING_DAYS}d</span><span>Gavin Shklanka · MBAN 2026</span>
      </div></div>
    </div>
  );
}
