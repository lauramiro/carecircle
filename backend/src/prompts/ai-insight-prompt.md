# Weekly Insight Engine – Rule‑Based Pattern Matching (No LLM)

## Purpose

The dashboard’s AI Insight Widget is powered by the `WeeklyInsightGenerationService`, which runs every Monday (cron schedule: `0 0 * * 1`) and generates up to 5 deterministic insight cards per patient using **pattern matching**, not a language model.

## Why No LLM?

- **Deterministic output** – the same data always yields the same insight, making it fully testable and auditable.
- **No hallucination** – rules check for specific keywords, counts, and thresholds; they cannot invent observations.
- **Zero API cost** – all processing runs inside the NestJS backend.
- **Low latency** – < 100ms per patient, even with hundreds of patients.

## Insight Types & Detection Logic

| Insight Type | Detection Method | Severity |
|--------------|------------------|-----------|
| `pain_trend` | Counts journal entries containing pain keywords (pain, ache, hurt, etc.) in first half vs second half of the week. | high if increasing, medium if decreasing, low if stable |
| `medication_adherence` | Calculates adherence rate = (given / total scheduled) over last 7 days. | high if <70%, medium if 70‑89%, low if ≥90% |
| `appetite_change` | Searches journal entries for appetite keywords (appetite, hungry, eating, nausea, etc.) and classifies trend as reduced, improved, or changed. | medium if reduced, low otherwise |
| `journalling_gap` | Counts unique days with journal entries. If <4 days → insight; if 0 days → more urgent message. | always low |
| `shift_imbalance` | Analyses weekly shift assignments; if one caregiver covers >65% of shifts, an insight is generated. | medium |

## Data Sources (last 7 days)

- `handover_journal_entries` – content and created_at
- `medication_logs` – status (given/skipped/overdue) and scheduled_time
- `weekly_shift_assignments` – assigned_caregiver_id per shift slot

## Output

The service stores up to 4 insights per patient in the `ai_insights` table. The frontend widget fetches the most recent insight for each patient and displays it with a severity dot and suggested action.

## Future Enhancement

If more complex insights are needed (e.g., “correlation between appetite and pain”), a small fine‑tuned model could replace or augment the rule engine. However, the current design prioritises transparency and safety.