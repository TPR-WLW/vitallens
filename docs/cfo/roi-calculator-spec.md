# MiruCare ROI Calculator -- Financial Specification

## Purpose
Provide Japanese HR managers with defensible ROI numbers for 稟議書 (budget approval).

## Key Assumptions & Data Sources

| Assumption | Value | Source |
|---|---|---|
| Average annual salary (Japanese mid-size) | 5,000,000 JPY | Ministry of Health, Labour and Welfare 2024 |
| Mental health leave (休職) rate | 1.2% of workforce/year | MHLW 2023 Worker Survey |
| Average leave duration | 6 months | Japan Productivity Center |
| Turnover rate (mental health related) | 2.5%/year | Recruit Works Institute |
| Replacement cost | 50% of annual salary | Japan HR Association estimate |
| Presenteeism productivity loss | 15% for stressed workers | WHO-HPQ adapted for Japan |
| Stressed worker ratio (no intervention) | 20% | MHLW Stress Check aggregate |
| Stress reduction with continuous monitoring | 30% reduction in high-stress | Estimated from rPPG pilot + literature |
| 健康経営 certification brand value | 3,000,000 JPY/year | Recruit brand survey, DBJ premium |

## Formulas

### Direct Cost Comparison (年間コスト比較)
- MiruCare: employees * 500 * 12
- Wearable: employees * 3,500 * 12 + employees * 20,000 (devices, amortized 2yr = *10,000/yr)
- Questionnaire: employees * 1,000

### Hidden Cost Savings (潜在コスト削減)
- 休職 cost avoided = employees * leave_rate * reduction_rate * avg_salary * 0.5 * leave_months/12
- 離職 cost avoided = employees * turnover_rate * reduction_rate * avg_salary * replacement_cost_ratio
- Presenteeism recovery = employees * stressed_ratio * reduction_rate * avg_salary * presenteeism_loss

### ROI
- Total savings = 休職 + 離職 + presenteeism + 健康経営
- Net benefit = Total savings - MiruCare annual cost
- ROI% = (Net benefit / MiruCare annual cost) * 100
- Payback period (months) = MiruCare annual cost / (Total savings / 12)
