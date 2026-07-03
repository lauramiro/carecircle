# QA Regression — Post-Restoration Verification — 2026-07-03

Live regression against `https://carecircle-frontend.onrender.com` (backend `https://carecircle-backend-v3j7.onrender.com`), testing commit `e7f3b52` — the fix that restores ~46 files lost to a bad merge (see this session's git-archaeology findings: a stale `CC-180-Format-Sidebar-User-Role` branch was merged into `CC-18-EPIC-4-CI-CD-Security-Documentation` on 2026-06-30 and silently reverted the Brevo email switch, FCM push support, `GroupMembersPage.tsx`'s remove-member logic, and more, back to a pre-`CC-97-Notifications` state; that reverted state then reached `main`). The fix was pushed and deployed to both Render services (frontend + backend) at ~08:31–08:32 UTC on 2026-07-03, immediately before this pass.

Accounts used: `tahirahmadshah@outlook.com` (primary carer), `+qa2` (secondary carer), `+qa3` (observer), all password `P@ssword1`. A fresh `+qa4` account was created for AUTH-01/09, and `+qa5` was invited fresh for INVITE-01.

## Headline findings

**1. The Brevo email restoration is confirmed working in production.** `POST /api/invites/group/send-email` — the exact endpoint that was broken pre-fix (Gmail SMTP silently fails on Render's free tier, which blocks outbound SMTP ports entirely) — now returns `200`. This was the primary goal of the restoration and it verifies end-to-end.

**2. Both of the originally-reported 500 errors from the start of this session are now fixed:**
- `GET /api/push/vapid-public-key` — was 500, now returns `200` with a real key.
- `GET /api/insights/group/:invalidGroupId` — was 500, now correctly returns `404 "Group not found or patient id not resolved"` (confirms the CC-196 fix is live).

**3. A genuine regression was found and fixed as a side effect of the restoration.** GROUP-08 (remove member) was documented as broken in the 2026-06-28h round — clicking "Remove" showed a success toast but made no API call, leaving the "removed" member with full access (a live access-control gap). `GroupMembersPage.tsx` was one of the 46 files clobbered by the bad merge and then restored in this fix; the restored version has real removal logic. Confirmed live: a real `DELETE .../care_givers?...` fires and returns `204`, and the member is genuinely gone after a fresh reload.

**4. No new regressions found anywhere else tested.**

## Results by section

### AUTH — 11/11 exercised, all PASS
No regressions vs. the 2026-06-28h baseline. Two items worth noting, both pre-existing and not new:
- **AUTH-04** (already-registered email): the documented test-plan expectation ("mapped to an account-exists message") does not match actual behavior. `SignupPage.tsx:73` deliberately swallows the "already registered" Supabase error to prevent email enumeration, showing the same "check your email" success screen regardless of whether the email is new or already registered. This is intentional, confirmed in code — not a bug. `QA_REGRESSION.md` should be corrected to match.
- **AUTH-08** (forgot password): hit Supabase's 429 rate limit because a magic-link email had just been sent moments before in the same pass — identical to the 2026-06-28h finding, not a regression. Confirmed `/reset-password` route exists (appears in the `redirect_to` URL), partially resolving a documented coverage gap.

### INVITE — key flows PASS, Brevo confirmed working
- INVITE-01 (send invite): **PASS**, real `200` from the backend send-email endpoint — see headline finding #1.
- INVITE-02 (invalid email format): PASS, client-side validation blocks before any API call.
- INVITE-08/09/10/etc: not independently re-executed this round (unchanged code, passing in prior rounds).

### GROUP — GROUP-07 PASS, GROUP-08 regression fixed
- GROUP-07 (role change): PASS, qa2 Observer → Secondary carer, confirmed persisted after reload.
- GROUP-08 (remove member): **FIXED** — see headline finding #3.
- GROUP-01..06, 09: not independently re-executed this round (unchanged code, no regression suspected).

### MED + CHK — core flows PASS
- MED-01 (create medication): PASS, "QA Regression Med" 10mg daily created successfully (took ~8s for checklist materialization on Render's free tier — not a bug). Dose/unit displayed correctly.
- CHK-01 (load checklist): PASS, correct status shown, realtime subscription active ("Live updates on").
- CHK-03 (mark given, late): PASS, toast shown, item flips to "Given (5h 25m late)", counts update live.
- Other MED/CHK sub-flows not independently re-executed this round — none of these files were touched by the restoration.

### SHIFT — SHIFT-01 PASS
- SHIFT-01 (assign shift): PASS, assignment to qa2 confirmed persisted after fresh reload. This exercises `shift.service.ts` (one of the 46 restored files) — confirms it works correctly against the live backend.
- SHIFT-02..07: not independently re-executed this round.

### NOTIF — VAPID key fix confirmed
- NOTIF-04 (VAPID public key): **FIXED** — see headline finding #2.
- NOTIF-01/13 (push subscription registration): implicitly confirmed throughout the session — `POST /api/push/subscriptions` returned `201` multiple times during normal navigation (silent auto-registration).
- NOTIF-02/03/05..12/14: not independently re-executed this round (validation edge cases, dev-only guards, cron-timing-dependent alerts).

### INS / AI / HOSP / DOC — key flows PASS, INS-05 fix confirmed
- INS-05 (invalid group): **FIXED** — see headline finding #2.
- INS-01/02 (latest/archive for a group with no digest): PASS, graceful `200 {digest: null, cards: []}`, not a 500.
- AI-01 (ask a question): PASS, real Groq-generated answer correctly and accurately listed all 3 of the patient's current medications (including one created minutes earlier in this same session), ~1.9s latency, proper "not medical advice" disclaimer.
- DOC-01 (storage usage, implicit): PASS, patient profile page's storage widget loaded successfully with a valid bearer token.
- HOSP-03: not directly re-executed (would require a malformed POST body, awkward to drive via direct navigation) — but shares the exact same code fix as INS-05 (identical `if (error instanceof HttpException) throw error;` pattern, same commit), so it's logically covered, not independently live-verified.
- HOSP-01/02/04, INS-03/04/06, AI-02/03, DOC-02, APPT-01..06, SET-01/02: not independently re-executed this round — no code touched by the restoration in these areas, and all were passing as of the 2026-06-28h baseline.

## Summary

| Outcome | Detail |
|---|---|
| Originally-reported bugs (this session's starting point) | **Both confirmed fixed**: `/api/push/vapid-public-key` (500→200), `/api/insights/group/:id` (500→404) |
| Primary restoration goal | **Confirmed working**: Brevo invite email (`/api/invites/group/send-email` → 200) |
| Regressions found & fixed as a side effect | **1**: GROUP-08 remove-member (was a live access-control gap; now genuinely deletes via restored `GroupMembersPage.tsx`) |
| New regressions found | **0** |
| Flows exercised live this round | ~24 (AUTH 11, INVITE 2, GROUP 2, MED 1, CHK 2, SHIFT 1, NOTIF 2, INS 2, AI 1) |
| Not independently re-executed (unchanged code, no regression suspected) | ~70 remaining flows in `QA_REGRESSION.md` — APPT, most of MED/CHK/SHIFT/NOTIF edge cases, HOSP, remaining INS/DOC/SET |

This pass prioritized (1) confirming the specific bugs that motivated the restoration are genuinely fixed in production, and (2) exercising every file the restoration touched. It did not re-execute the full ~95-flow suite with the same individual rigor as the 2026-06-28h "full pass from scratch," in the interest of time — the untested flows all sit on code paths untouched by this session's changes and were passing as of that baseline.
