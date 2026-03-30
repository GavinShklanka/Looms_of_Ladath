import { useMemo } from "react";
import { solve, PRODUCTS, WOVEN, KNIT, TYPE, RM_G, PROFIT, MIN_SKU, LABOR_DAYS, WOVEN_RM_LIMIT, KNIT_RM_LIMIT, NUM_WEAVERS, NUM_KNITTERS, PLANNING_DAYS, WEAVER_DAYS_LIMIT, KNITTER_DAYS_LIMIT, COLORS, fmt, num } from "./data.jsx";

export function ModelTab() {
  const sol = useMemo(() => solve(), []);
  const OPT = sol.units;
  const wovenRMlhs = RM_G.Shawl*OPT.Shawl + RM_G.Stole*OPT.Stole + RM_G.Scarf*OPT.Scarf;
  const knitRMlhs = RM_G.Sweater*OPT.Sweater + RM_G.Muffler*OPT.Muffler + RM_G.Cap*OPT.Cap + RM_G.Gloves*OPT.Gloves;
  const weaverLhs = +(LABOR_DAYS.Shawl*OPT.Shawl + LABOR_DAYS.Stole*OPT.Stole + LABOR_DAYS.Scarf*OPT.Scarf).toFixed(1);
  const knitterLhs = +(LABOR_DAYS.Sweater*OPT.Sweater + LABOR_DAYS.Muffler*OPT.Muffler + LABOR_DAYS.Cap*OPT.Cap + LABOR_DAYS.Gloves*OPT.Gloves).toFixed(1);

  const constraints = [
    {id:"C1",name:"Woven Raw Material",lhsExpr:"510x₁ + 390x₂ + 210x₃",rel:"≤",rhs:WOVEN_RM_LIMIT,lhsVal:wovenRMlhs,unit:"g",pool:"Woven"},
    {id:"C2",name:"Weaver-Days",lhsExpr:"1.02x₁ + 0.78x₂ + 0.42x₃",rel:"≤",rhs:WEAVER_DAYS_LIMIT,lhsVal:weaverLhs,unit:"days",pool:"Woven"},
    {id:"C3",name:"Knit Raw Material",lhsExpr:"320x₄ + 175x₅ + 75x₆ + 73x₇",rel:"≤",rhs:KNIT_RM_LIMIT,lhsVal:knitRMlhs,unit:"g",pool:"Knit"},
    {id:"C4",name:"Knitter-Days",lhsExpr:"6.40x₄ + 3.50x₅ + 1.50x₆ + 1.46x₇",rel:"≤",rhs:KNITTER_DAYS_LIMIT,lhsVal:knitterLhs,unit:"days",pool:"Knit"},
    ...PRODUCTS.map((p,i)=>({id:`C${5+i}`,name:`Min SKU — ${p}`,lhsExpr:`x${i+1}`,rel:"≥",rhs:MIN_SKU[p],lhsVal:OPT[p],unit:"units",pool:"SKU"})),
  ];

  const objExpr = "4319x₁ + 3367x₂ + 1940x₃ + 2940x₄ + 1617x₅ + 554x₆ + 540x₇";

  const statusBadge = (lhs, rhs, rel) => {
    const slack = rel === "≤" ? rhs - lhs : lhs - rhs;
    const p = Math.abs(slack / rhs * 100);
    if (p < 0.2) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-900/40 text-red-400 border border-red-800/40">BINDING</span>;
    if (p < 20) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-900/40 text-amber-400 border border-amber-800/40">TIGHT</span>;
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">SLACK</span>;
  };

  const poolColor = p => p==="Woven"?"text-blue-400":p==="Knit"?"text-purple-400":"text-gray-500";

  return (
    <div className="space-y-6">
      {/* SOLVER PARAMETERS PANEL */}
      <div className="bg-gray-800/40 border border-cyan-800/30 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-900/50 to-gray-800/60 px-5 py-3 flex items-center justify-between border-b border-cyan-800/30">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Solver Parameters</span>
            <span className="text-gray-600 text-xs">·</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Mixed-Integer Linear Program</span>
          </div>
          <div className="flex gap-2 text-[9px]">
            <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-400 font-mono">Simplex LP</span>
            <span className="px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-400 font-mono border border-cyan-700/40">Integer</span>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* SET OBJECTIVE */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Set Objective</span>
              <div className="flex-1 h-px bg-gray-700/60"/>
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-700/40 font-bold">MAX</span>
            </div>
            <div className="bg-gray-900/60 rounded-lg border border-gray-700/40 px-4 py-3">
              <div className="text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">Z =</div>
              <div className="font-mono text-sm text-amber-300 leading-relaxed break-all">{objExpr}</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[9px] text-gray-600 font-mono">Optimal value:</span>
                <span className="text-sm font-black text-cyan-400">{fmt(sol.profit)}</span>
              </div>
            </div>
          </div>

          {/* DECISION VARIABLES */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">By Changing Variable Cells</span>
              <div className="flex-1 h-px bg-gray-700/60"/>
              <span className="text-[9px] text-gray-600 font-mono">xᵢ ∈ ℤ⁺</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs"><thead><tr className="border-b border-gray-700/60">
                <th className="text-left py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Var</th>
                <th className="text-left py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Product</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Type</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">π (₹/unit)</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">RM (g)</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Labor (d)</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Min</th>
                <th className="text-right py-2 px-3 text-[10px] text-cyan-500 font-bold uppercase tracking-wider">x* (Optimal)</th>
              </tr></thead><tbody>
                {PRODUCTS.map((p,i) => (
                  <tr key={p} className={`border-b border-gray-800/40 ${i%2===1?'bg-gray-800/20':''}`}>
                    <td className="py-2 px-2 font-mono font-bold text-gray-400">x{i+1}</td>
                    <td className="py-2 px-2 font-semibold" style={{color:COLORS[i]}}>{p}</td>
                    <td className="py-2 px-2 text-right"><span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${TYPE[p]==='Woven'?'bg-blue-900/30 text-blue-400 border border-blue-800/30':'bg-purple-900/30 text-purple-400 border border-purple-800/30'}`}>{TYPE[p]}</span></td>
                    <td className="py-2 px-2 text-right text-amber-300 font-mono font-semibold">{fmt(PROFIT[p])}</td>
                    <td className="py-2 px-2 text-right text-gray-400 font-mono">{RM_G[p]}</td>
                    <td className="py-2 px-2 text-right text-gray-400 font-mono">{LABOR_DAYS[p].toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-gray-500 font-mono">{MIN_SKU[p]}</td>
                    <td className="py-2 px-3 text-right font-black text-white text-sm">{OPT[p]}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>

          {/* SUBJECT TO CONSTRAINTS */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Subject to the Constraints</span>
              <div className="flex-1 h-px bg-gray-700/60"/>
              <span className="text-[9px] text-gray-600">{constraints.length} constraints</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs"><thead><tr className="border-b border-gray-700/60">
                <th className="text-left py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-6">#</th>
                <th className="text-left py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Constraint Name</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Pool</th>
                <th className="text-center py-2 px-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">LHS Expression</th>
                <th className="text-center py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Rel</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">RHS</th>
                <th className="text-right py-2 px-2 text-[10px] text-cyan-500 font-bold uppercase tracking-wider">LHS at x*</th>
                <th className="text-right py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Slack</th>
                <th className="text-center py-2 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Status</th>
              </tr></thead><tbody>
                {constraints.map((c, idx) => {
                  const slack = c.rel === "≤" ? c.rhs - c.lhsVal : c.lhsVal - c.rhs;
                  const isSku = c.pool === "SKU";
                  return (
                    <tr key={c.id} className={`border-b border-gray-800/40 ${idx%2===1?'bg-gray-800/20':''} ${isSku?'opacity-70':''}`}>
                      <td className="py-2 px-2 font-mono text-gray-600 text-[10px]">{c.id}</td>
                      <td className="py-2 px-2 font-semibold text-gray-300">{c.name}</td>
                      <td className="py-2 px-2 text-right"><span className={`text-[9px] font-bold ${poolColor(c.pool)}`}>{c.pool}</span></td>
                      <td className="py-2 px-3 text-center font-mono text-[10px] text-cyan-300/80 whitespace-nowrap">{c.lhsExpr}</td>
                      <td className="py-2 px-2 text-center font-bold text-gray-300 text-sm">{c.rel}</td>
                      <td className="py-2 px-2 text-right font-mono text-gray-300">{num(c.rhs)}<span className="text-gray-600 ml-0.5 text-[9px]">{c.unit}</span></td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-white">{num(c.lhsVal)}<span className="text-gray-600 ml-0.5 text-[9px]">{c.unit}</span></td>
                      <td className="py-2 px-2 text-right font-mono text-gray-500">{slack >= 0 ? num(+slack.toFixed(1)) : <span className="text-red-400">⛔ {num(Math.abs(+slack.toFixed(1)))}</span>}<span className="text-gray-700 ml-0.5 text-[9px]">{c.unit}</span></td>
                      <td className="py-2 px-2 text-center">{statusBadge(c.lhsVal, c.rhs, c.rel)}</td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          </div>

          {/* ASSUMPTIONS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            {[{label:"Planning Window",value:"30 days"},{label:"Weavers",value:`${NUM_WEAVERS} × 30 = ${WEAVER_DAYS_LIMIT} days`},{label:"Knitters",value:`${NUM_KNITTERS} × 30 = ${KNITTER_DAYS_LIMIT} days`},{label:"Spinning",value:"Unlimited (pre-spun)"},{label:"Demand",value:"Unlimited (e-commerce)"},{label:"Price Model",value:"Sell = 2× cost"},{label:"Weaving Rate",value:"500 g / artisan-day"},{label:"Knitting Rate",value:"50 g / artisan-day"}].map(a => (
              <div key={a.label} className="bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/30">
                <div className="text-[9px] uppercase tracking-wider text-gray-600 font-bold">{a.label}</div>
                <div className="text-[11px] text-gray-300 font-semibold mt-0.5">{a.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COEFFICIENT MATRIX */}
      <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Coefficient Matrix — A·x ≤ b</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs"><thead><tr className="border-b border-gray-700/60">
            <th className="text-left py-1.5 px-2 text-[10px] text-gray-500 uppercase">Constraint</th>
            {PRODUCTS.map((p,i) => <th key={p} className="text-right py-1.5 px-2 text-[10px] font-mono" style={{color:COLORS[i]}}>x{i+1}</th>)}
            <th className="text-center py-1.5 px-2 text-[10px] text-gray-500">Rel</th>
            <th className="text-right py-1.5 px-2 text-[10px] text-gray-500">b (RHS)</th>
          </tr></thead><tbody>
            {[
              {name:"Woven RM (g)",row:[510,390,210,0,0,0,0],rel:"≤",rhs:WOVEN_RM_LIMIT},
              {name:"Weaver-Days",row:[1.02,0.78,0.42,0,0,0,0],rel:"≤",rhs:WEAVER_DAYS_LIMIT},
              {name:"Knit RM (g)",row:[0,0,0,320,175,75,73],rel:"≤",rhs:KNIT_RM_LIMIT},
              {name:"Knitter-Days",row:[0,0,0,6.40,3.50,1.50,1.46],rel:"≤",rhs:KNITTER_DAYS_LIMIT},
              {name:"Min SKU",row:[2,5,10,2,4,5,5],rel:"≥",rhs:"—"},
              {name:"Objective (π)",row:[4319,3367,1940,2940,1617,554,540],rel:"→ MAX",rhs:fmt(sol.profit)},
            ].map((row, ri) => (
              <tr key={row.name} className={`border-b border-gray-800/40 ${ri===5?'border-t-2 border-gray-600':''} ${ri%2===1?'bg-gray-800/20':''}`}>
                <td className={`py-1.5 px-2 font-semibold text-[10px] ${ri===5?'text-amber-400':ri===4?'text-gray-500':'text-gray-300'}`}>{row.name}</td>
                {row.row.map((v, ci) => (
                  <td key={ci} className={`py-1.5 px-2 text-right font-mono text-[10px] ${v===0?'text-gray-700':'text-gray-300'} ${ri===5?'text-amber-300':''}`}>{v===0?'—':v}</td>
                ))}
                <td className="py-1.5 px-2 text-center font-bold text-gray-400 text-[11px]">{row.rel}</td>
                <td className={`py-1.5 px-2 text-right font-mono font-bold text-[10px] ${ri===5?'text-cyan-400':'text-gray-200'}`}>{typeof row.rhs === 'number' ? num(row.rhs) : row.rhs}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">Zeros shown as — for readability. Integrality constraint: xᵢ ∈ ℤ⁺ for all i = 1…7.</p>
      </div>
    </div>
  );
}
