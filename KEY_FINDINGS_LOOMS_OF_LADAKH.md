# 📊 Looms of Ladakh — Key Findings & Presentation Notes
**Case:** IIM Bangalore IMB 935 — "Shawls or Stoles?"
**Model:** MILP via `scipy.optimize.milp`
**Gavin Shklanka | March 2026**

---

## 1. THE PROBLEM IN ONE SENTENCE
Determine the optimal product mix across 7 artisan goods (Shawl, Stole, Scarf, Sweater, Muffler, Cap, Gloves) to **maximize profit** for the Okhai e-commerce launch, given finite raw material, labor, and minimum SKU requirements.

---

## 2. OPTIMAL SOLUTION (Base Case)

### What the model recommends:
| Product | Type | Units | Raw Mat/unit |
|---|---|---|---|
| Shawl | Woven | 2 (min) | 510g |
| Stole | Woven | 5 (min) | 390g |
| Scarf | Woven | ~30 | 210g |
| Sweater | Knit | 2 (min) | 320g |
| **Muffler** | **Knit** | **~90** | 175g |
| Cap | Knit | 5 (min) | 75g |
| Gloves | Knit | 5 (min) | 73g |

**The model concentrates production heavily on Mufflers** — they have the best profit-per-knitter-day ratio in the knit category.

---

## 3. BINDING CONSTRAINTS — THE STORY OF THE MODEL

| Resource | Utilization | Status |
|---|---|---|
| **Knitter capacity** | **99.9%** | 🔴 Binding — the real bottleneck |
| Woven Raw Material | 99.6% | 🔴 Binding |
| Knit Raw Material | 96.7% | 🟡 Near-binding |
| **Weaver capacity** | **59.9%** | 🟢 Slack — significant idle capacity |

**Key insight for presentation:** The bottleneck is knitting labor, not weaving. Weavers are only 60% utilized — this is a resource allocation imbalance. If Okhai wants to grow revenue, adding knitters has far more leverage than adding weavers.

---

## 4. SENSITIVITY ANALYSIS — WHAT'S ROBUST?

### Objective coefficient sensitivity (profit/unit ±50%):
- The Muffler-heavy solution is **stable across a wide range of profit coefficient changes**
- Only at very large drops in Muffler profitability does the mix shift meaningfully
- Scarves become attractive if woven product margins improve

### RHS ranging (resource availability sensitivity):
- **Knit raw material is the steepest profit driver** — every gram of knit raw material added produces disproportionate profit gains
- Weaver-days have almost no marginal value (weavers already idle)
- Adding 25% more knit raw material increases profit significantly

---

## 5. SCENARIO ANALYSIS

| Scenario | Profit Change | Why |
|---|---|---|
| Raw Material +25% | ▲ Large gain | More inputs → more knit products |
| Raw Material -25% | ▼ Significant drop | Hard constraint bites harder |
| +2 Weavers | ~ Minimal gain | Already slack capacity |
| +2 Knitters | ▲ Moderate gain | Relieves binding constraint |
| +2 Weavers & +2 Knitters | ▲ Moderate gain | Knitters drive the gain |
| **RM +25% & More Labour** | **▲▲ Best scenario** | Both inputs + labor unlocked |

**Takeaway:** Management should prioritize (1) raw material procurement and (2) hiring/training knitters. Weaver expansion is a poor use of capital right now.

---

## 6. PARETO FRONTIER — PROFIT vs. RAW MATERIAL EFFICIENCY

The multi-objective extension traces the trade-off between maximizing profit and minimizing raw material use:
- **α = 1.0** (pure profit maximization): Uses nearly all raw material, maximum units of Muffler
- **α = 0.0** (pure RM minimization): Produces only minimum SKU quantities, very low profit
- **Sweet spot around α = 0.7–0.8**: ~15% raw material savings with only ~5% profit reduction — this is the sustainability-conscious operating point

**For presentation:** Frame this as "responsible scaling" — the Pareto curve shows Okhai can save meaningful raw material while preserving most of the profit, which matters for a craft-artisan brand.

---

## 7. PRESENTATION STRUCTURE (recommended)

### Slide / Section Order:
1. **The Decision** — What is Okhai choosing? Why does it matter?
2. **Model Architecture** — MILP formulation, constraints, decision variables (show the math clearly)
3. **Optimal Solution** — What should they produce? (bar chart + units table)
4. **Resource Story** — Knitters are the bottleneck, weavers are idle (horizontal bar utilization)
5. **Sensitivity** — How confident are we? (profit/unit sweep lines)
6. **Scenarios** — What if things change? (horizontal bar scenario comparison)
7. **Pareto Insight** — The sustainability angle (scatter Pareto frontier)
8. **Recommendation** — 3 bullets: optimize product mix now, hire knitters, negotiate more raw material

### Key numbers to memorize:
- Muffler optimal units: **~90**
- Knitter utilization: **99.9%**
- Weaver utilization: **59.9%**
- Best scenario profit uplift: RM +25% + More Labour
- Pareto sweet spot: α ≈ 0.75

---

## 8. HOW THIS CONNECTS TO YOUR MBAN SKILLS

| MBAN concept | This project |
|---|---|
| Integer Programming | MILP with scipy.optimize.milp |
| Sensitivity Analysis | Dual prices, ranging, parametric sweep |
| Multi-objective optimization | Pareto frontier via weighted sum |
| Scenario modeling | 7 scenarios with full solution comparison |
| Decision support systems | Dashboard + recommendation outputs |

---

*Saved: SCHOOL/OPTIMIZATION/project/KEY_FINDINGS_LOOMS_OF_LADAKH.md | March 16, 2026*
