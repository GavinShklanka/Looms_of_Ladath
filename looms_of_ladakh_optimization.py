"""
===============================================================================
LOOMS OF LADAKH — RESOURCE OPTIMIZATION MODEL
===============================================================================
Case: "Shawls or Stoles? Resource Optimization Problem at Looms of Ladakh"
      Indian Institute of Management Bangalore (IMB 935)

Problem:  Determine the optimal product mix to MAXIMIZE PROFIT for the Okhai
          e-commerce launch, subject to raw-material, labor-capacity, and
          minimum-SKU constraints.

Solver:   scipy.optimize.milp  (Mixed-Integer Linear Program)
          (PuLP-compatible formulation is included as comments for reference)

Sections:
  1. Data & Parameter Setup
  2. Cost & Profit Calculations
  3. MILP Model – Maximize Profit
  4. Results & Resource Utilization
  5. Sensitivity Analysis  (objective coefficient & RHS ranging)
  6. Scenario Analysis     (raw-material ±25%, knitters +2, weavers +2)
  7. Multi-Objective Extension  (Profit vs. Raw-Material Use trade-off)
  8. Visualizations
===============================================================================
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy.optimize import milp, LinearConstraint, Bounds

# ─────────────────────────────────────────────────────────────────────────────
# 0.  GLOBAL DISPLAY SETTINGS
# ─────────────────────────────────────────────────────────────────────────────
pd.set_option("display.float_format", "{:,.2f}".format)
plt.rcParams.update({"figure.dpi": 130, "font.size": 10})

INR = "₹"       # Rupee symbol for print output

# ─────────────────────────────────────────────────────────────────────────────
# 1.  DATA & PARAMETER SETUP
# ─────────────────────────────────────────────────────────────────────────────

PRODUCTS       = ["Shawl", "Stole", "Scarf", "Sweater", "Muffler", "Cap", "Gloves"]
WOVEN_PRODUCTS = ["Shawl", "Stole", "Scarf"]
KNIT_PRODUCTS  = ["Sweater", "Muffler", "Cap", "Gloves"]

# --- Exhibit 4: Raw material per unit (grams) --------------------------------
RAW_MATERIAL_G = {
    "Shawl":   510, "Stole":  390, "Scarf":  210,
    "Sweater": 320, "Muffler":175, "Cap":     75, "Gloves": 73
}

# --- Exhibit 4: Work rate per artisan per day (grams/day) --------------------
SPINNING_RATE  = {p: 21.5 for p in WOVEN_PRODUCTS}          # g/spinner/day
SPINNING_RATE.update({p: 37.5 for p in KNIT_PRODUCTS})
WEAVING_RATE   = 500   # g/weaver/day   (woven products only)
KNITTING_RATE  = 50    # g/knitter/day  (knit products only)

# --- Exhibit 4: Labor cost per gram (INR/g) ----------------------------------
SPINNING_COST_PER_G  = {p: 3.00  for p in PRODUCTS}
WEAVING_COST_PER_G   = {"Shawl": 1.46, "Stole": 1.79, "Scarf": 3.00}
KNITTING_COST_PER_G  = {p: 3.00  for p in KNIT_PRODUCTS}
FINISHING_COST_PER_G = {p: 0.60  for p in PRODUCTS}

# --- Exhibit 4: Total dyeing cost per unit (INR/unit) ------------------------
DYEING_COST = {
    "Shawl": 830, "Stole": 635, "Scarf": 342,
    "Sweater": 488, "Muffler": 285, "Cap": 122, "Gloves": 119
}

# --- Raw material cost (INR/g) -----------------------------------------------
RAW_MATERIAL_COST_PER_G = 10.25

# --- Profit margin on selling price ------------------------------------------
# Case states selling price = 2 × production cost, yielding:
#   20% profit margin on Caps & Gloves
#   25% profit margin on all other products
PROFIT_MARGIN = {p: 0.25 for p in PRODUCTS}
PROFIT_MARGIN["Cap"]    = 0.20
PROFIT_MARGIN["Gloves"] = 0.20

# --- Exhibit 5: Available resources ------------------------------------------
RAW_MATERIAL_WOVEN_G = 15_000   # grams
RAW_MATERIAL_KNIT_G  = 23_000   # grams
NUM_WEAVERS          = 5
NUM_KNITTERS         = 13
PLANNING_DAYS        = 30       # production window (assumed)

# --- Exhibit 6: Minimum SKU requirements (Okhai launch) ---------------------
MIN_SKU = {
    "Shawl": 2, "Stole": 5, "Scarf": 10,
    "Sweater": 2, "Muffler": 4, "Cap": 5, "Gloves": 5
}

# ─────────────────────────────────────────────────────────────────────────────
# 2.  COST & PROFIT CALCULATIONS
# ─────────────────────────────────────────────────────────────────────────────

def unit_cost(product: str) -> float:
    """Total production cost per unit (INR)."""
    g = RAW_MATERIAL_G[product]
    rm_cost   = g * RAW_MATERIAL_COST_PER_G
    spin_cost = g * SPINNING_COST_PER_G[product]
    if product in WOVEN_PRODUCTS:
        process_cost = g * WEAVING_COST_PER_G[product]
    else:
        process_cost = g * KNITTING_COST_PER_G[product]
    finish_cost = g * FINISHING_COST_PER_G[product]
    dye_cost    = DYEING_COST[product]
    return rm_cost + spin_cost + process_cost + finish_cost + dye_cost

UNIT_COST     = {p: unit_cost(p)          for p in PRODUCTS}
SELLING_PRICE = {p: 2 * UNIT_COST[p]     for p in PRODUCTS}
PROFIT_PER_UNIT = {p: PROFIT_MARGIN[p] * SELLING_PRICE[p] for p in PRODUCTS}

# Print cost/price summary
print("\n" + "=" * 70)
print("  LOOMS OF LADAKH — UNIT ECONOMICS SUMMARY")
print("=" * 70)
df_econ = pd.DataFrame({
    "Raw Mat (g)":     RAW_MATERIAL_G,
    "Unit Cost (INR)": UNIT_COST,
    "Sell Price (INR)":SELLING_PRICE,
    "Profit/Unit(INR)":PROFIT_PER_UNIT,
    "Margin":          PROFIT_MARGIN,
})
print(df_econ.to_string())

# ─────────────────────────────────────────────────────────────────────────────
# 3.  MILP MODEL — MAXIMIZE PROFIT
# ─────────────────────────────────────────────────────────────────────────────
# Decision variables:  x[i] = integer units of product i produced
#
# Index order: [Shawl, Stole, Scarf, Sweater, Muffler, Cap, Gloves]
#              i=0      1      2      3        4        5    6
#
# Objective (maximise → scipy minimises, so negate):
#   max  Σ profit_i * x_i
#
# Constraints:
#   (C1) Woven raw material:   510·x0 + 390·x1 + 210·x2              ≤ 15000
#   (C2) Knit  raw material:   320·x3 + 175·x4 +  75·x5 + 73·x6     ≤ 23000
#   (C3) Weaving capacity:     (rm_i/500)·xi for i∈{0,1,2}           ≤ 5×30
#   (C4) Knitting capacity:    (rm_i/50)·xi  for i∈{3,4,5,6}         ≤ 13×30
#   (C5) Min SKU:              x_i ≥ min_sku_i   for all i
#   (C6) Integrality:          x_i ∈ Z+
# ─────────────────────────────────────────────────────────────────────────────

def build_and_solve(
    raw_woven   = RAW_MATERIAL_WOVEN_G,
    raw_knit    = RAW_MATERIAL_KNIT_G,
    n_weavers   = NUM_WEAVERS,
    n_knitters  = NUM_KNITTERS,
    plan_days   = PLANNING_DAYS,
    min_sku     = MIN_SKU,
    verbose     = True
):
    """
    Build and solve the MILP.  Returns dict with solution details.
    Parameters allow scenario analysis by overriding defaults.
    """
    n = len(PRODUCTS)
    idx = {p: i for i, p in enumerate(PRODUCTS)}

    # ── Objective coefficients (negated for minimisation) ─────────────────
    c = np.array([-PROFIT_PER_UNIT[p] for p in PRODUCTS], dtype=float)

    # ── Constraint matrix (A_ub @ x ≤ b_ub) ──────────────────────────────
    A_rows, b_vec = [], []

    # C1: Woven raw material
    row = np.zeros(n)
    for p in WOVEN_PRODUCTS:
        row[idx[p]] = RAW_MATERIAL_G[p]
    A_rows.append(row);  b_vec.append(raw_woven)

    # C2: Knit raw material
    row = np.zeros(n)
    for p in KNIT_PRODUCTS:
        row[idx[p]] = RAW_MATERIAL_G[p]
    A_rows.append(row);  b_vec.append(raw_knit)

    # C3: Weaving capacity (weaver-days available = n_weavers * plan_days)
    total_weaver_days = n_weavers * plan_days
    row = np.zeros(n)
    for p in WOVEN_PRODUCTS:
        row[idx[p]] = RAW_MATERIAL_G[p] / WEAVING_RATE   # days per unit
    A_rows.append(row);  b_vec.append(total_weaver_days)

    # C4: Knitting capacity (knitter-days available = n_knitters * plan_days)
    total_knitter_days = n_knitters * plan_days
    row = np.zeros(n)
    for p in KNIT_PRODUCTS:
        row[idx[p]] = RAW_MATERIAL_G[p] / KNITTING_RATE  # days per unit
    A_rows.append(row);  b_vec.append(total_knitter_days)

    A = np.array(A_rows, dtype=float)
    b = np.array(b_vec,  dtype=float)

    # ── Variable bounds: x_i ≥ min_sku_i (lower); no upper bound ──────────
    lb = np.array([min_sku[p] for p in PRODUCTS], dtype=float)
    ub = np.full(n, np.inf)
    bounds = Bounds(lb=lb, ub=ub)

    # ── Integer constraints: all variables are integers ────────────────────
    integrality = np.ones(n)   # 1 = integer

    # ── Linear constraints ─────────────────────────────────────────────────
    constraints = LinearConstraint(A, lb=-np.inf, ub=b)

    # ── Solve ──────────────────────────────────────────────────────────────
    result = milp(
        c           = c,
        constraints = constraints,
        integrality = integrality,
        bounds      = bounds,
    )

    if not result.success:
        return {"success": False, "message": result.message}

    x_opt    = np.round(result.x).astype(int)
    profit   = -result.fun

    # ── Resource utilisation ───────────────────────────────────────────────
    woven_rm_used   = sum(RAW_MATERIAL_G[p] * x_opt[idx[p]] for p in WOVEN_PRODUCTS)
    knit_rm_used    = sum(RAW_MATERIAL_G[p] * x_opt[idx[p]] for p in KNIT_PRODUCTS)
    weaver_days_used   = sum(RAW_MATERIAL_G[p]/WEAVING_RATE  * x_opt[idx[p]] for p in WOVEN_PRODUCTS)
    knitter_days_used  = sum(RAW_MATERIAL_G[p]/KNITTING_RATE * x_opt[idx[p]] for p in KNIT_PRODUCTS)

    sol = {
        "success":            True,
        "units":              {p: x_opt[idx[p]] for p in PRODUCTS},
        "profit":             profit,
        "woven_rm_used":      woven_rm_used,
        "knit_rm_used":       knit_rm_used,
        "woven_rm_avail":     raw_woven,
        "knit_rm_avail":      raw_knit,
        "weaver_days_used":   weaver_days_used,
        "weaver_days_avail":  n_weavers * plan_days,
        "knitter_days_used":  knitter_days_used,
        "knitter_days_avail": n_knitters * plan_days,
        "revenue":            sum(SELLING_PRICE[p]*x_opt[idx[p]] for p in PRODUCTS),
        "total_cost":         sum(UNIT_COST[p]*x_opt[idx[p]]     for p in PRODUCTS),
    }

    if verbose:
        _print_solution(sol)

    return sol


def _print_solution(sol):
    """Pretty-print a solution dictionary."""
    print("\n" + "=" * 70)
    print("  OPTIMAL SOLUTION")
    print("=" * 70)
    print(f"  {'Product':<12}  {'Units':>6}  {'Revenue':>14}  {'Profit':>12}")
    print("  " + "-" * 48)
    for p in PRODUCTS:
        units = sol["units"][p]
        rev   = SELLING_PRICE[p] * units
        prof  = PROFIT_PER_UNIT[p] * units
        print(f"  {p:<12}  {units:>6}  {INR}{rev:>13,.2f}  {INR}{prof:>11,.2f}")
    print("  " + "-" * 48)
    print(f"  {'TOTAL':<12}  {'':>6}  {INR}{sol['revenue']:>13,.2f}  {INR}{sol['profit']:>11,.2f}")

    print("\n  RESOURCE UTILISATION")
    print(f"  {'Resource':<28} {'Used':>10} {'Avail':>10} {'Util%':>8}")
    print("  " + "-" * 58)
    resources = [
        ("Woven Raw Material (g)",   sol["woven_rm_used"],    sol["woven_rm_avail"]),
        ("Knit Raw Material (g)",    sol["knit_rm_used"],     sol["knit_rm_avail"]),
        ("Weaver-Days",              sol["weaver_days_used"], sol["weaver_days_avail"]),
        ("Knitter-Days",             sol["knitter_days_used"],sol["knitter_days_avail"]),
    ]
    for name, used, avail in resources:
        pct = used / avail * 100
        print(f"  {name:<28} {used:>10.1f} {avail:>10.0f} {pct:>7.1f}%")
    print("=" * 70)


# ── SOLVE BASE MODEL ──────────────────────────────────────────────────────────
base_solution = build_and_solve()

# ─────────────────────────────────────────────────────────────────────────────
# 4.  SENSITIVITY ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────
# Approach: parametric sweep around the base case
#   (a) Objective coefficient ranging  – vary profit_per_unit[p] by ±50%
#       and record whether the optimal quantity changes.
#   (b) RHS ranging  – vary each resource bound from 50% to 200% of base
#       and record the change in objective value.
# ─────────────────────────────────────────────────────────────────────────────

print("\n\n" + "=" * 70)
print("  SENSITIVITY ANALYSIS — OBJECTIVE COEFFICIENTS (Profit/Unit ±50%)")
print("=" * 70)

sensitivity_rows = []
for p in PRODUCTS:
    base_profit = PROFIT_PER_UNIT[p]
    results = []
    for delta in np.linspace(-0.5, 0.5, 11):
        adjusted = {k: (v * (1 + delta) if k == p else v)
                    for k, v in PROFIT_PER_UNIT.items()}
        # Temporarily override global (rebuild c vector)
        c_tmp = np.array([-adjusted[pr] for pr in PRODUCTS], dtype=float)
        n = len(PRODUCTS)
        idx = {pr: i for i, pr in enumerate(PRODUCTS)}
        lb  = np.array([MIN_SKU[pr] for pr in PRODUCTS], dtype=float)
        A_rows, b_vec = [], []
        for row_def, rhs in [
            ({pr: RAW_MATERIAL_G[pr] for pr in WOVEN_PRODUCTS}, RAW_MATERIAL_WOVEN_G),
            ({pr: RAW_MATERIAL_G[pr] for pr in KNIT_PRODUCTS},  RAW_MATERIAL_KNIT_G),
            ({pr: RAW_MATERIAL_G[pr]/WEAVING_RATE  for pr in WOVEN_PRODUCTS}, NUM_WEAVERS*PLANNING_DAYS),
            ({pr: RAW_MATERIAL_G[pr]/KNITTING_RATE for pr in KNIT_PRODUCTS},  NUM_KNITTERS*PLANNING_DAYS),
        ]:
            row = np.zeros(n)
            for pr, coef in row_def.items():
                row[idx[pr]] = coef
            A_rows.append(row)
            b_vec.append(rhs)
        A = np.array(A_rows); b = np.array(b_vec)
        res = milp(c_tmp, constraints=LinearConstraint(A,-np.inf,b),
                   integrality=np.ones(n), bounds=Bounds(lb, np.full(n,np.inf)))
        if res.success:
            results.append(round(-res.fun, 2))
        else:
            results.append(None)
    sensitivity_rows.append([f"{p} (base {INR}{base_profit:,.0f})"] + results)

deltas = [f"{int(d*100)}%" for d in np.linspace(-50, 50, 11)]
df_sens = pd.DataFrame(sensitivity_rows, columns=["Product / Base Profit"] + deltas)
df_sens.set_index("Product / Base Profit", inplace=True)
print(df_sens.to_string())


print("\n\n" + "=" * 70)
print("  SENSITIVITY ANALYSIS — RHS RANGING (Resource Availability)")
print("=" * 70)

rhs_names   = ["Woven RM (g)", "Knit RM (g)", "Weaver-Days", "Knitter-Days"]
rhs_base    = [RAW_MATERIAL_WOVEN_G, RAW_MATERIAL_KNIT_G,
               NUM_WEAVERS*PLANNING_DAYS, NUM_KNITTERS*PLANNING_DAYS]
rhs_factors = np.linspace(0.5, 2.0, 7)

rhs_rows = []
for i, (name, base_val) in enumerate(zip(rhs_names, rhs_base)):
    profits = []
    for f in rhs_factors:
        rhs_mod = [r * f if j == i else r for j, r in enumerate(rhs_base)]
        raw_wov = rhs_mod[0]; raw_kni = rhs_mod[1]
        wvd = rhs_mod[2];     knd = rhs_mod[3]
        sol = build_and_solve(raw_woven=raw_wov, raw_knit=raw_kni,
                              n_weavers=int(wvd/PLANNING_DAYS),
                              n_knitters=int(knd/PLANNING_DAYS),
                              verbose=False)
        profits.append(round(sol["profit"],0) if sol["success"] else None)
    rhs_rows.append([name] + profits)

factor_labels = [f"×{f:.2f}" for f in rhs_factors]
df_rhs = pd.DataFrame(rhs_rows, columns=["Resource"] + factor_labels)
df_rhs.set_index("Resource", inplace=True)
print(df_rhs.to_string())

# ─────────────────────────────────────────────────────────────────────────────
# 5.  SCENARIO ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

scenarios = {
    "Base Case":                    {},
    "Raw Material +25%":            {"raw_woven": int(RAW_MATERIAL_WOVEN_G*1.25),
                                     "raw_knit":  int(RAW_MATERIAL_KNIT_G*1.25)},
    "Raw Material -25%":            {"raw_woven": int(RAW_MATERIAL_WOVEN_G*0.75),
                                     "raw_knit":  int(RAW_MATERIAL_KNIT_G*0.75)},
    "+2 Weavers":                   {"n_weavers":  NUM_WEAVERS  + 2},
    "+2 Knitters":                  {"n_knitters": NUM_KNITTERS + 2},
    "+2 Weavers & +2 Knitters":     {"n_weavers":  NUM_WEAVERS  + 2,
                                     "n_knitters": NUM_KNITTERS + 2},
    "RM +25% & More Labour":        {"raw_woven": int(RAW_MATERIAL_WOVEN_G*1.25),
                                     "raw_knit":  int(RAW_MATERIAL_KNIT_G*1.25),
                                     "n_weavers":  NUM_WEAVERS  + 2,
                                     "n_knitters": NUM_KNITTERS + 2},
}

print("\n\n" + "=" * 70)
print("  SCENARIO ANALYSIS")
print("=" * 70)
scenario_results = {}
for name, kwargs in scenarios.items():
    sol = build_and_solve(**kwargs, verbose=False)
    scenario_results[name] = sol
    units_str = ", ".join(f"{p[0:3]}={sol['units'][p]}" for p in PRODUCTS)
    print(f"\n  [{name}]")
    print(f"    Units    : {units_str}")
    print(f"    Profit   : {INR}{sol['profit']:>12,.2f}")
    print(f"    Revenue  : {INR}{sol['revenue']:>12,.2f}")

# ─────────────────────────────────────────────────────────────────────────────
# 6.  MULTI-OBJECTIVE EXTENSION  (Profit vs. Raw-Material Utilisation)
# ─────────────────────────────────────────────────────────────────────────────
# We trace the Pareto frontier by adding a penalty on total raw material used:
#   max  α·Profit  −  (1−α)·TotalRawMaterial
# for α ∈ [0, 1].
# ─────────────────────────────────────────────────────────────────────────────

print("\n\n" + "=" * 70)
print("  MULTI-OBJECTIVE EXTENSION — Profit vs. Raw-Material Efficiency")
print("=" * 70)

pareto_points = []
alphas = np.linspace(0, 1, 21)
n   = len(PRODUCTS)
idx = {p: i for i, pr in enumerate(PRODUCTS) for p in [pr]}   # rebuild clean

for a in alphas:
    # Combined objective: maximise a*profit - (1-a)*raw_material_used
    # (negate for minimisation)
    c_mo = np.array([
        -(a * PROFIT_PER_UNIT[p] - (1-a) * RAW_MATERIAL_G[p])
        for p in PRODUCTS
    ], dtype=float)

    lb  = np.array([MIN_SKU[p] for p in PRODUCTS], dtype=float)
    A_rows, b_vec = [], []
    for row_def, rhs in [
        ({p: RAW_MATERIAL_G[p] for p in WOVEN_PRODUCTS}, RAW_MATERIAL_WOVEN_G),
        ({p: RAW_MATERIAL_G[p] for p in KNIT_PRODUCTS},  RAW_MATERIAL_KNIT_G),
        ({p: RAW_MATERIAL_G[p]/WEAVING_RATE  for p in WOVEN_PRODUCTS}, NUM_WEAVERS*PLANNING_DAYS),
        ({p: RAW_MATERIAL_G[p]/KNITTING_RATE for p in KNIT_PRODUCTS},  NUM_KNITTERS*PLANNING_DAYS),
    ]:
        row = np.zeros(n)
        for p, coef in row_def.items():
            row[idx[p]] = coef
        A_rows.append(row)
        b_vec.append(rhs)

    A = np.array(A_rows); b = np.array(b_vec)
    res = milp(c_mo, constraints=LinearConstraint(A,-np.inf,b),
               integrality=np.ones(n), bounds=Bounds(lb, np.full(n,np.inf)))
    if res.success:
        xv  = np.round(res.x).astype(int)
        pf  = sum(PROFIT_PER_UNIT[p]  * xv[idx[p]] for p in PRODUCTS)
        rm  = sum(RAW_MATERIAL_G[p]   * xv[idx[p]] for p in PRODUCTS)
        pareto_points.append((a, pf, rm))
        print(f"  α={a:.2f}  → Profit={INR}{pf:>10,.0f}   RM Used={rm:>6,.0f}g")

# ─────────────────────────────────────────────────────────────────────────────
# 7.  VISUALIZATIONS
# ─────────────────────────────────────────────────────────────────────────────

fig = plt.figure(figsize=(18, 20))
fig.suptitle("Looms of Ladakh — Optimization Dashboard", fontsize=16, fontweight="bold", y=0.98)

COLORS = ["#2E86AB","#A23B72","#F18F01","#C73E1D","#3B1F2B","#44BBA4","#E94F37"]

# ── Plot 1: Optimal Product Mix (units) ──────────────────────────────────────
ax1 = fig.add_subplot(3, 3, 1)
units_vals = [base_solution["units"][p] for p in PRODUCTS]
bars = ax1.bar(PRODUCTS, units_vals, color=COLORS, edgecolor="white", linewidth=1.2)
ax1.bar_label(bars, padding=3, fontsize=9)
ax1.set_title("Optimal Product Mix (Units)", fontweight="bold")
ax1.set_ylabel("Units Produced")
ax1.set_xticklabels(PRODUCTS, rotation=25, ha="right")
ax1.set_ylim(0, max(units_vals) * 1.25)
ax1.grid(axis="y", alpha=0.4)

# ── Plot 2: Profit Contribution per Product ───────────────────────────────────
ax2 = fig.add_subplot(3, 3, 2)
profits = [PROFIT_PER_UNIT[p] * base_solution["units"][p] for p in PRODUCTS]
wedges, texts, autotexts = ax2.pie(
    profits, labels=PRODUCTS, autopct="%1.1f%%",
    colors=COLORS, startangle=90, pctdistance=0.80,
    wedgeprops={"edgecolor": "white", "linewidth": 1.5}
)
for at in autotexts:
    at.set_fontsize(8)
ax2.set_title("Profit Contribution by Product", fontweight="bold")

# ── Plot 3: Resource Utilisation ─────────────────────────────────────────────
ax3 = fig.add_subplot(3, 3, 3)
res_labels = ["Woven RM", "Knit RM", "Weaver-Days", "Knitter-Days"]
used  = [base_solution["woven_rm_used"],   base_solution["knit_rm_used"],
         base_solution["weaver_days_used"], base_solution["knitter_days_used"]]
avail = [base_solution["woven_rm_avail"],  base_solution["knit_rm_avail"],
         base_solution["weaver_days_avail"],base_solution["knitter_days_avail"]]
pcts  = [u/a*100 for u,a in zip(used, avail)]
bar_colors = ["#E94F37" if p > 90 else "#F18F01" if p > 70 else "#44BBA4" for p in pcts]
bars3 = ax3.barh(res_labels, pcts, color=bar_colors, edgecolor="white")
ax3.bar_label(bars3, labels=[f"{p:.1f}%" for p in pcts], padding=4, fontsize=9)
ax3.axvline(100, color="red", linestyle="--", alpha=0.5, label="100% capacity")
ax3.set_xlim(0, 115)
ax3.set_title("Resource Utilisation (%)", fontweight="bold")
ax3.set_xlabel("% of Available Capacity")
ax3.legend(fontsize=8)
ax3.grid(axis="x", alpha=0.4)

# ── Plot 4: Unit Economics (Cost vs. Price breakdown) ────────────────────────
ax4 = fig.add_subplot(3, 3, 4)
cost_vals  = [UNIT_COST[p]     for p in PRODUCTS]
price_vals = [SELLING_PRICE[p] for p in PRODUCTS]
x_pos = np.arange(len(PRODUCTS))
ax4.bar(x_pos - 0.2, cost_vals,  width=0.35, label="Unit Cost",     color="#2E86AB", alpha=0.85)
ax4.bar(x_pos + 0.2, price_vals, width=0.35, label="Selling Price", color="#F18F01", alpha=0.85)
ax4.set_xticks(x_pos)
ax4.set_xticklabels(PRODUCTS, rotation=25, ha="right")
ax4.set_title("Unit Cost vs. Selling Price (INR)", fontweight="bold")
ax4.set_ylabel("INR")
ax4.legend()
ax4.grid(axis="y", alpha=0.4)
ax4.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"₹{x:,.0f}"))

# ── Plot 5: Scenario Comparison (Total Profit) ───────────────────────────────
ax5 = fig.add_subplot(3, 3, 5)
scen_names   = list(scenario_results.keys())
scen_profits = [scenario_results[s]["profit"] for s in scen_names]
scen_colors  = ["#2E86AB" if s == "Base Case" else
                ("#44BBA4" if scenario_results[s]["profit"] > scenario_results["Base Case"]["profit"]
                 else "#C73E1D") for s in scen_names]
bv = ax5.barh(scen_names, scen_profits, color=scen_colors, edgecolor="white")
ax5.bar_label(bv, labels=[f"{INR}{v:,.0f}" for v in scen_profits], padding=4, fontsize=8)
ax5.set_title("Scenario Analysis — Total Profit (INR)", fontweight="bold")
ax5.set_xlabel("Total Profit (INR)")
ax5.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"₹{x/1000:.0f}K"))
ax5.grid(axis="x", alpha=0.4)
# legend patches
legend_patches = [
    mpatches.Patch(color="#2E86AB", label="Base"),
    mpatches.Patch(color="#44BBA4", label="Better"),
    mpatches.Patch(color="#C73E1D", label="Worse"),
]
ax5.legend(handles=legend_patches, fontsize=8, loc="lower right")

# ── Plot 6: Scenario Unit Mix Heatmap ────────────────────────────────────────
ax6 = fig.add_subplot(3, 3, 6)
scen_matrix = np.array([[scenario_results[s]["units"][p] for p in PRODUCTS]
                         for s in scen_names])
im = ax6.imshow(scen_matrix, cmap="YlOrRd", aspect="auto")
ax6.set_xticks(range(len(PRODUCTS)))
ax6.set_xticklabels(PRODUCTS, rotation=30, ha="right", fontsize=8)
ax6.set_yticks(range(len(scen_names)))
ax6.set_yticklabels([s[:22] for s in scen_names], fontsize=7)
for i in range(len(scen_names)):
    for j in range(len(PRODUCTS)):
        ax6.text(j, i, str(scen_matrix[i, j]), ha="center", va="center", fontsize=8, color="black")
plt.colorbar(im, ax=ax6, label="Units")
ax6.set_title("Unit Mix Heatmap — Scenarios", fontweight="bold")

# ── Plot 7: Sensitivity — Profit vs. Profit/Unit change for each product ─────
ax7 = fig.add_subplot(3, 3, 7)
delta_range = np.linspace(-50, 50, 11)
for i, p in enumerate(PRODUCTS):
    row_profits = df_sens.iloc[i].values.astype(float)
    ax7.plot(delta_range, row_profits/1000, marker="o", markersize=4,
             label=p, color=COLORS[i], linewidth=1.8)
ax7.set_xlabel("Change in Profit/Unit (%)")
ax7.set_ylabel("Total Profit (×1000 INR)")
ax7.set_title("Sensitivity: Profit vs. Unit Profit Coefficient", fontweight="bold")
ax7.legend(fontsize=7, ncol=2)
ax7.grid(alpha=0.4)
ax7.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"₹{x:.0f}K"))

# ── Plot 8: RHS Sensitivity ───────────────────────────────────────────────────
ax8 = fig.add_subplot(3, 3, 8)
factor_vals = rhs_factors
for i, name in enumerate(rhs_names):
    row_profits = df_rhs.iloc[i].values.astype(float)
    ax8.plot(factor_vals, row_profits/1000, marker="s", markersize=5,
             label=name, linewidth=1.8)
ax8.axvline(1.0, color="gray", linestyle="--", alpha=0.6, label="Base")
ax8.set_xlabel("Resource Multiplier (×)")
ax8.set_ylabel("Total Profit (×1000 INR)")
ax8.set_title("Sensitivity: Profit vs. Resource Availability", fontweight="bold")
ax8.legend(fontsize=7)
ax8.grid(alpha=0.4)
ax8.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"₹{x:.0f}K"))

# ── Plot 9: Pareto Frontier (Multi-Objective) ─────────────────────────────────
ax9 = fig.add_subplot(3, 3, 9)
if pareto_points:
    pf_vals = [pt[1] for pt in pareto_points]
    rm_vals = [pt[2] for pt in pareto_points]
    sc = ax9.scatter(rm_vals, [p/1000 for p in pf_vals],
                     c=[pt[0] for pt in pareto_points],
                     cmap="viridis", s=80, zorder=5, edgecolors="white")
    ax9.plot(rm_vals, [p/1000 for p in pf_vals], "k--", alpha=0.4, linewidth=1)
    plt.colorbar(sc, ax=ax9, label="α (profit weight)")
    # Annotate base case
    base_rm  = base_solution["woven_rm_used"] + base_solution["knit_rm_used"]
    base_prf = base_solution["profit"]
    ax9.annotate("Base (α=1)", xy=(base_rm, base_prf/1000),
                 xytext=(base_rm*0.92, base_prf/1000*1.02),
                 arrowprops=dict(arrowstyle="->", color="red"),
                 fontsize=8, color="red")
ax9.set_xlabel("Total Raw Material Used (g)")
ax9.set_ylabel("Total Profit (×1000 INR)")
ax9.set_title("Pareto Frontier: Profit vs. RM Efficiency", fontweight="bold")
ax9.grid(alpha=0.4)
ax9.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"₹{x:.0f}K"))

plt.tight_layout(rect=[0, 0, 1, 0.97])
plt.savefig("/mnt/user-data/outputs/looms_of_ladakh_dashboard.png", bbox_inches="tight")
print("\n\n[Dashboard saved → looms_of_ladakh_dashboard.png]")

# ─────────────────────────────────────────────────────────────────────────────
# 8.  FINAL SUMMARY TABLE
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("  FINAL SUMMARY — BASE CASE OPTIMAL SOLUTION")
print("=" * 70)
rows = []
for p in PRODUCTS:
    u   = base_solution["units"][p]
    tc  = UNIT_COST[p]
    sp  = SELLING_PRICE[p]
    pu  = PROFIT_PER_UNIT[p]
    rows.append({
        "Product":         p,
        "Units":           u,
        "Unit Cost (INR)": round(tc, 2),
        "Sell Price(INR)": round(sp, 2),
        "Profit/Unit(INR)":round(pu, 2),
        "Total Profit(INR)":round(pu*u, 2),
        "RM Used (g)":     RAW_MATERIAL_G[p] * u,
    })

df_final = pd.DataFrame(rows)
df_final.set_index("Product", inplace=True)
totals = pd.Series({
    "Units": df_final["Units"].sum(),
    "Unit Cost (INR)": "",
    "Sell Price(INR)": "",
    "Profit/Unit(INR)":"",
    "Total Profit(INR)": round(df_final["Total Profit(INR)"].sum(), 2),
    "RM Used (g)": df_final["RM Used (g)"].sum(),
}, name="TOTAL")
df_final = pd.concat([df_final, totals.to_frame().T])
print(df_final.to_string())
print("\n[Script completed successfully]")
