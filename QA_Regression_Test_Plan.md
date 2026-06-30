# CareCircle Manual QA Regression Test Plan

This document outlines the manual regression testing flows for the CareCircle platform. These tests ensure that core functionality, Role-Based Access Control (RBAC), and critical user journeys remain intact across updates.

---

## Flow 1: Authentication & Onboarding

### 1.1 Magic Link Login / Signup
- **Pre-condition:** User has access to their email inbox.
- **Steps:**
  1. Navigate to the login page.
  2. Enter a valid email address and submit.
  3. Check the email inbox for the magic link.
  4. Click the magic link.
- **Expected Result:** User is successfully authenticated and redirected to the main dashboard. If a new user, they are prompted to complete their profile (e.g., set an avatar and display name).

### 1.2 Care Group Invitation & Acceptance
- **Pre-condition:** A Primary Carer has invited a new user via email.
- **Steps:**
  1. Open the secure invitation magic link from the email inbox.
  2. Review the care circle details on the landing page.
  3. Click "Accept Invitation".
  4. Complete profile setup (if a new user).
- **Expected Result:** User is added to the Care Group with the assigned role and redirected to the group dashboard.

---

## Flow 2: Care Group Management & RBAC

### 2.1 Managing Members (Primary Carer)
- **Pre-condition:** Logged in as a Primary Carer.
- **Steps:**
  1. Navigate to the Members Management screen.
  2. Invite a new user as a `secondary_carer`.
  3. Change an existing member's role from `observer` to `secondary_carer`.
  4. Remove a member from the care group.
- **Expected Result:** Invites are sent successfully. Role changes reflect immediately. Removed members immediately lose access to the group dashboard.

### 2.2 RBAC Restrictions (Secondary Carer / Observer)
- **Pre-condition:** Logged in as an Observer or Secondary Carer.
- **Steps:**
  1. Navigate to the Members Management screen.
  2. Attempt to invite a user, change a role, or remove a member.
- **Expected Result:** Controls for inviting, changing roles, and deleting members are disabled or hidden. Any API bypass attempts result in a permission denied error (blocked by RLS).

---

## Flow 3: Patient Profile Management

### 3.1 Updating Patient Profile
- **Pre-condition:** Logged in as a Primary Carer.
- **Steps:**
  1. Navigate to the Patient Profile page.
  2. Update patient details (e.g., medical conditions, avatar).
  3. Save changes.
- **Expected Result:** Changes are saved successfully and visible to all care group members.

### 3.2 Read-Only Profile Access
- **Pre-condition:** Logged in as a Secondary Carer or Observer.
- **Steps:**
  1. Navigate to the Patient Profile page.
  2. Attempt to edit patient details.
- **Expected Result:** Edit buttons are hidden or disabled.

---

## Flow 4: Medication Management & Logging

### 4.1 Adding a New Medication
- **Pre-condition:** Logged in as a Primary or Secondary Carer.
- **Steps:**
  1. Navigate to the Medications tab.
  2. Add a new medication with a specific dosage and schedule (e.g., daily at 8:00 AM).
  3. Save the medication.
- **Expected Result:** The medication appears in the active medication list and populates the daily checklist for the corresponding time slots.

### 4.2 Logging Daily Medications (Checklist)
- **Pre-condition:** Logged in as a Primary or Secondary Carer. A medication is scheduled for today.
- **Steps:**
  1. Navigate to the Daily Checklist.
  2. Mark a scheduled medication as "given".
- **Expected Result:** The medication is marked as complete. The system logs the `carer_id` and the timestamp of the confirmation.

### 4.3 Observer Medication Restrictions
- **Pre-condition:** Logged in as an Observer.
- **Steps:**
  1. Navigate to the Daily Checklist.
  2. Attempt to check off a medication.
- **Expected Result:** The checkboxes are disabled. Observers can view the confirmation history but cannot log medications themselves.

---

## Flow 5: Handover Journal

### 5.1 Creating a Journal Entry
- **Pre-condition:** Logged in as a Primary or Secondary Carer.
- **Steps:**
  1. Navigate to the Handover Journal.
  2. Write a new entry and submit.
- **Expected Result:** The entry appears in the chronological journal feed, visible to all members (including observers).

### 5.2 Editing a Journal Entry (Within 60 Minutes)
- **Pre-condition:** Logged in as the author of a recent journal entry (created < 60 mins ago).
- **Steps:**
  1. Locate the entry in the journal.
  2. Click Edit, modify the text, and save.
- **Expected Result:** The entry is updated successfully.

### 5.3 Edit Expiry Validation
- **Pre-condition:** Logged in as the author of a journal entry created > 60 mins ago.
- **Steps:**
  1. Locate the older entry.
- **Expected Result:** The Edit button is no longer available. Attempting to bypass the UI results in a database rejection.

---

## Flow 6: Shift Assignments

### 6.1 Assigning Shifts
- **Pre-condition:** Logged in as a Primary Carer.
- **Steps:**
  1. Navigate to the Weekly Shift schedule.
  2. Assign an open shift block to a Secondary Carer.
  3. Clear an existing shift assignment.
- **Expected Result:** Shifts are assigned and unassigned successfully. The shift history log is updated.

### 6.2 Shift View for Non-Admins
- **Pre-condition:** Logged in as a Secondary Carer or Observer.
- **Steps:**
  1. Navigate to the Weekly Shift schedule.
  2. Attempt to assign or unassign a shift.
- **Expected Result:** The schedule is strictly read-only. Assignment controls are hidden.

---

## Flow 7: AI Features & Push Notifications

### 7.1 AI Patient Q&A
- **Pre-condition:** Logged in as any active group member. Patient profile contains some baseline medical data.
- **Steps:**
  1. Open the AI Q&A interface.
  2. Ask a question about the patient's existing data (e.g., "What is [Name]'s primary condition?").
  3. Ask a question about data that does not exist in the profile.
- **Expected Result:**
  - Valid question: Returns an accurate answer within 8 seconds without hallucinations.
  - Missing data question: Returns a standard refusal/fallback response indicating the data is not available.

### 7.2 AI Hospital Summary Generation
- **Pre-condition:** Logged in as a Primary Carer.
- **Steps:**
  1. Trigger the "Generate Hospital Summary" action.
- **Expected Result:** A complete PDF or structured summary is generated containing patient details, current medications, and recent handover notes.

### 7.3 Push Notifications (Optional depending on environment)
- **Pre-condition:** User has opted into browser push notifications.
- **Steps:**
  1. Have another user assign a shift to the current user OR send an urgent message.
- **Expected Result:** A VAPID/Web Push notification is received on the user's device.
