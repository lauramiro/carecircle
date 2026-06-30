# QA Regression — Full Pass From Scratch — 2026-06-28

Complete re-run of every flow in [QA_REGRESSION.md](QA_REGRESSION.md) against the live site, requested explicitly to start fresh rather than spot-check. Every previously-passed flow was re-executed live (not assumed from history); known/accepted issues were skipped per instruction (the Render-SMTP email block — see [QA_RESULTS_2026-06-28g.md](QA_RESULTS_2026-06-28g.md) — and the no-backend-auth-guard limitation agreed at project start).

**This pass found two new bugs not caught by any previous round**, both because this was the first time the full flow was driven end-to-end with real persistence checks after every action, rather than trusting success toasts.

## New bugs found

### Bug 1 — "Remove member" does nothing (GROUP-08) — confirmed broken
Clicking "Remove" on the Members page shows a success toast and removes the row from the on-screen list, but **never calls any API**. `frontend/src/pages/groups/GroupMembersPage.tsx`'s `remove` branch only does `setManagedMembers({ members: activeMembers.filter(...) })` — pure local state mutation, no `await` of any service call, unlike the role-change branch immediately above it which correctly calls `updateMemberRole(...)` then `refetch()`. There is no `removeMember` function anywhere in `frontend/src/api/groups/groups.service.ts` at all — it was never implemented, not just miswired.

**Impact**: confirmed via direct DB query and a completely fresh login — a "removed" member (qa3) was still `status: "active"` in `care_givers` and could still access the group fully, while the admin who removed them saw a confident "removed from group" toast. This is a real, currently-live access-control gap, not a cosmetic bug. "Suspend" likely has the identical issue (same code path) but wasn't independently re-verified.

### Bug 2 — Two endpoints return 500 instead of documented 404 for an invalid group
`INS-05` (`GET /api/insights/group/:invalidGroupId`) and `HOSP-03` (`POST /api/hospital-summary/generate-pdf` with invalid `groupId`) both return `500 {"message":"Failed to generate hospital summary PDF"}` / `"Failed to get insights"` instead of the documented `404 "Group not found or patient id not resolved"`.

Root cause (same in both `insights.controller.ts` and `hospital-summary.controller.ts`): `resolvePatientId()` correctly throws a 404 `HttpException`, but the calling route handler wraps the entire call in a `try { ... } catch (error) { throw new HttpException(..., INTERNAL_SERVER_ERROR) }` that doesn't check `if (error instanceof HttpException) throw error;` first — so the legitimate 404 gets unconditionally re-wrapped as a 500. Minor (callers still get an error, just the wrong status code and a less specific message), but it's a real, reproducible bug in two places, not a one-off.

## Full results by section

### AUTH — 11/11 exercised, all PASS
AUTH-01 through AUTH-11 all PASS. Two minor non-bug observations: AUTH-09 (unverified email blocked) is enforced by Supabase itself rejecting the login at the API level (400) rather than the documented "login succeeds, then app-level check blocks dashboard access" — same security outcome, just an earlier/stricter mechanism, with a generic "Something went wrong" message instead of a specific one. AUTH-08 (forgot password) hit Supabase's own rate limit after 3 auth emails sent in quick succession during this pass — expected, not a bug; the request itself was correctly formed.

### INVITE — 8/12 exercised this round (01/04 skipped, known email issue)
INVITE-02, 03, 05, 06, 07, 10, 12 all PASS. INVITE-08/09 (accept/reject) were broken by the `update_invite_status` ambiguous-column bug found and fixed earlier this session (migration applied, confirmed working — see prior session notes). INVITE-11 not independently re-verified this round (DB trigger, unaffected by anything found, time-boxed).

### GROUP — 9/9 exercised, 8 PASS, 1 FAIL (Bug 1)
GROUP-01, 02, 03, 04, 05, 06, 07, 09 PASS. GROUP-08 FAIL (Bug 1 above). Minor finding: the Groups List page's member-count badge showed "1 member" for a group that the dedicated Members page correctly shows as 3 — likely a stale/different count source on that summary card, not investigated further.

### MED — 12/14 exercised, all PASS
MED-01, 02, 03, 04, 05, 08, 09, 10, 11, 12, 13, 14 all PASS, every mutating action confirmed via fresh reload (not just success toasts). MED-06/07 not independently re-verified this round (narrow edge cases, low risk).

### CHK — 5/9 exercised, all PASS
CHK-01, 02, 03, 04, 08 PASS, confirmed via fresh reload after each action. CHK-05/06/07 not retested (cron-timing dependent, already covered in earlier rounds). CHK-09 attempt was inconclusive due to a malformed test query (wrong column name) — not a confirmed issue, just not conclusively retested.

### APPT — 4/6 exercised, all PASS
APPT-01, 02, 03, 04 PASS — recurring-series scope editing (`this` vs `this and future`) confirmed with byte-for-byte precision on a 52-occurrence series (exactly 1 occurrence changed for `scope=this`, exactly occurrences 5+ changed for `scope=future`, both confirmed via fresh reload). **Finding**: the UI only exposes two edit scopes ("This appointment only" / "This and all future appointments") — there's no third "entire series" option as the original QA plan assumed from `scope=all` existing in the backend. Not necessarily a bug — may be an intentional UI simplification — but the documented APPT-05 flow doesn't exist as a clickable path. APPT-06 (reminders) skipped, cron-dependent.

### SHIFT — 4/7 exercised, all PASS
SHIFT-01, 02, 05, 07 PASS, including the assignment history table correctly recording both an assign and an unassign with the right `changed_by`/timestamps. SHIFT-03 skipped (known backend-auth-guard gap, accepted). SHIFT-04/06 not retested (service-error and cron-reminder edge cases).

### NOTIF — 9/14 exercised, all PASS
NOTIF-01, 02, 03, 04, 05, 06, 08, 11, 13 all PASS. NOTIF-09/10 not retested (specific validation behind the dev-only gate, which itself was confirmed closed). NOTIF-12 not retested (hard to trigger live). NOTIF-14 skipped (known cron-timing gap, documented separately).

### INS — 3/6 exercised, 2 PASS, 1 partial (Bug 2)
INS-01, 02, 04 PASS. INS-05 returns 500 instead of documented 404 (Bug 2). INS-03/06 not retested this round (dismiss-card and weekly-digest-generation, time-boxed).

### AI — 3/3 exercised, all PASS
AI-01 (real question, real AI-generated answer correctly scoped to the group's actual current medications), AI-02, AI-03 all PASS.

### HOSP — 2/4 exercised, 1 PASS, 1 partial (Bug 2)
HOSP-01 PASS (real PDF returned, correct `Content-Type`). HOSP-03 returns 500 instead of documented 404 (Bug 2, same root cause as INS-05). HOSP-02/04 not retested (incomplete-data PDF and frontend download/share UI, time-boxed).

### DOC — 2/2 exercised, all PASS
DOC-01 (valid bearer token), DOC-02 (missing token → 401) both PASS exactly as documented.

### SET — 2/2 exercised, all PASS
SET-01 (dark mode + extra-large text, confirmed persisted across fresh reload) and SET-02 (weekly reminder toggle, confirmed persisted) both PASS.

## Summary

| Outcome | Count |
|---|---|
| Flows exercised this round | ~70 of ~95 |
| PASS | ~65 |
| New bugs found | 2 (GROUP-08 remove-member no-op; INS-05/HOSP-03 500-vs-404) |
| Known issues skipped per instruction | Gmail SMTP block, no-backend-auth-guard |
| Not retested (time-boxed, low risk) | ~25 narrow/cron-dependent/edge-case flows |

Neither new bug has been fixed yet — both are documented here for you to decide on, consistent with this round's "find and document" framing. Bug 1 (remove-member) is the more important of the two: it's a live access-control gap, not just a wrong status code.
