# EventOps Phase 3 Manual Testing Walkthrough

This guide provides a structured, step-by-step walkthrough to thoroughly test all features delivered across Phase 3 (Core Event Operations Platform) before promoting to `main`.

---

## 1. Environment & Prerequisites

### A. Start Backend Server
Ensure PostgreSQL is running locally, activate the virtual environment, and start the Django REST Framework server:
```powershell
# In terminal 1:
cd "c:\Users\Aashish Kumar Singh\Desktop\Projects\EventOps\backend"
.\.venv\Scripts\Activate.ps1
python manage.py runserver 8000
```

### B. Start Frontend Dev Server
```powershell
# In terminal 2:
cd "c:\Users\Aashish Kumar Singh\Desktop\Projects\EventOps\frontend"
npm run dev
```
Open your browser to: **`http://localhost:5173`**

### C. Seed Data Confirmation
The database has already been seeded with realistic demo data linked to your account:
- **Linked Account**: `aashish.singh@adypu.edu.in`
- **Role**: `owner`
- **Flagship Organization**: `Apex Global Experiences` (slug: `apex-global`)
*(Note: If you ever want to re-seed or reset, run `python manage.py seed_demo_data --email "aashish.singh@adypu.edu.in"` in `backend/`)*

---

## 2. Authentication & Organization Selection

1. **Sign In**:
   - Navigate to `http://localhost:5173/login`.
   - Log in with your Supabase credentials (`aashish.singh@adypu.edu.in`).
2. **Organization Context**:
   - Check the top navigation bar or organization dropdown.
   - Ensure the active organization is **Apex Global Experiences**.
   - Verify that your user role is displayed as `Owner`.

---

## 3. Step-by-Step Feature Test Matrix

### Test 1: Events Dashboard (Epic 3.1 & 3.2)
- [ ] **Navigate**: Click **Events** in the main sidebar / navigation bar (`/events`).
- [ ] **Verify Seeded Cards**:
  - `Global AI & Innovation Summit 2026` (Status: `PLANNING`, Planner: `Marcus Vance`).
  - `Lumina Charity Gala & Auction` (Status: `ACTIVE`, Planner: `Elena Rostova`).
- [ ] **Create New Event**:
  - Click **Create Event** button.
  - Fill in Name: `Tech Showcase 2026`, Dates: Next month, Status: `Draft`.
  - Submit and verify the new card appears immediately in the grid without page refresh.
- [ ] **Open Flagship Event**:
  - Click on the card for **`Global AI & Innovation Summit 2026`** to enter the workspace (`/events/:id`).

---

### Test 2: Overview Tab (Epic 3.2)
- [ ] **Event Header**:
  - Verify event title, planning status badge (`PLANNING`), dates, and assigned planner (`Marcus Vance`).
- [ ] **KPI Summary Cards**:
  - Verify **Tasks Completed**: Shows `2/6 Completed` with accurate percentage progress bar.
  - Verify **Budget Spent**: Shows accurate total allocated vs actual spent.
  - Verify **RSVP Acceptance**: Displays total guests attending vs pending.
  - Verify **Vendors Booked**: Displays confirmed vendors count.
- [ ] **Quick Tab Navigation**:
  - Click any tab or metric card to navigate into deep tabs.

---

### Test 3: Timeline & Tasks Tab (Epic 3.3)
- [ ] **View Modes**:
  - Switch between **Kanban Board** and **List View** using the toggle controls.
- [ ] **Kanban Columns**:
  - Verify three columns: **To Do (2)**, **In Progress (2)**, **Done (2)**.
  - Check task cards display assignee names, titles, and due dates.
- [ ] **Create Task**:
  - Click **Add Task** button.
  - Enter Title: `Order speaker gift hampers`, Assignee: `Elena Rostova`, Status: `To Do`.
  - Save and verify the card appears in the **To Do** column.
- [ ] **Update Task / Drag & Drop or Status Transition**:
  - Edit or move a task from **To Do** to **In Progress**.
  - Verify the status updates optimistically and persists on refresh.
- [ ] **Delete Task**:
  - Delete a task and confirm removal from the board.

---

### Test 4: Budget Tracker Tab (Epic 3.4)
- [ ] **Budget Metrics Header**:
  - Verify **Total Allocated**: `$70,000.00`.
  - Verify **Total Actual Spent**: Sum of actual costs across all line items.
  - Verify **Remaining Variance / Health Indicator**: Shows positive/negative delta with color coding.
- [ ] **Categories & Accordions**:
  - Verify 3 categories: `Venue & Production`, `Food & Beverage`, `Marketing & Swag`.
  - Expand and collapse each category accordion.
- [ ] **Line Items & Paid Status Toggle**:
  - Inspect line items under `Venue & Production` (e.g. `Grand Ballroom 3-Day Rental`, `Main Stage 4K LED Screen`).
  - Click the **Paid / Unpaid** toggle button on an unpaid item.
  - Verify the status badge switches to **Paid** immediately.
- [ ] **Add Line Item**:
  - Click **Add Item** inside a category.
  - Add Description: `Podium Floral Centerpieces`, Estimated: `450`, Actual: `400`.
  - Verify totals recalculate dynamically.
- [ ] **Add Budget Category**:
  - Click **Add Category** at the top.
  - Create category `Transportation & Logistics` with allocated `$5,000.00`.

---

### Test 5: Guests & RSVPs Tab (Epic 3.5)
- [ ] **RSVP KPI Counters**:
  - Verify **Attending (4)**, **Pending (2)**, **Declined (1)** summary cards at the top.
- [ ] **Household Accordions**:
  - Verify households: `The Vance Keynote Delegation`, `DeepMind Research Fellows`, `Acme Venture Partners`.
  - Expand `The Vance Keynote Delegation`: verify members Marcus (Attending), Sophia (Attending, Gluten-Free), Leo (Pending, Severe Nut Allergy).
- [ ] **Add Household**:
  - Click **Add Household** button.
  - Enter Name: `Stanford Robotics Lab`, Address: `Stanford, CA`.
  - Verify new household accordion appears.
- [ ] **Add Guest to Household**:
  - Click **Add Guest** under the newly created household.
  - Enter First Name: `David`, Last Name: `Miller`, RSVP: `Attending`, Dietary: `Vegan`.
  - Verify the guest badge renders with dietary tags and the RSVP summary increments.
- [ ] **Delete Guest Confirmation**:
  - Click the delete icon on a guest, confirm the dialog, and verify household count updates.

---

### Test 6: Vendor Management Tab (Epic 3.6)
- [ ] **Bookings Summary**:
  - Verify KPI badges: `Booked (2)`, `Contract Sent (1)`, `Inquiry (1)`.
- [ ] **Booked Vendors Table**:
  - Verify bookings:
    - `Grand Horizon Palace` (Venue, Booked, $18,000.00).
    - `Artisan Culinary & Catering` (Catering, Contract Sent, $21,200.00).
    - `Lumina Visuals Studio` (Photography, Booked, $4,500.00).
    - `Pulse AV & Stage Lighting` (Entertainment/AV, Inquiry, $11,500.00).
- [ ] **Book New Vendor Modal**:
  - Click **Book Vendor** button.
  - Select `Petals & Bloom Florals` from the central directory dropdown.
  - Enter Agreed Price: `1500.00`, Status: `Contract Sent`, Notes: `Stage and entrance floral arches`.
  - Save and verify it appears in the table.
- [ ] **Duplicate Booking Guard**:
  - Click **Book Vendor** again and try selecting `Grand Horizon Palace` (already booked).
  - Verify either the dropdown excludes already booked vendors or the system prevents duplicate bookings.
- [ ] **Status Transition**:
  - Change `Pulse AV` status from `Inquiry` to `Contract Sent`.
  - Verify table badge updates.

---

### Test 7: Document Management Tab (Epic 3.7 & 3.8)
- [ ] **Documents List**:
  - Verify 4 seeded documents:
    - `Summit Main Stage Technical Rider v2.1` (`PDF`).
    - `Grand Horizon Ballroom Seating & Booth Map` (`PNG` / Image).
    - `Master VIP Plated Dinner Menu & Allergens` (`DOCX`).
    - `Master Event Operations Run of Show` (`Link` / Spreadsheet).
- [ ] **Search Filter**:
  - Type `Rider` in the search bar.
  - Verify only the Technical Rider remains visible.
  - Clear the search bar to restore all documents.
- [ ] **External Link Navigation**:
  - Click the open/download link icon on `Master Event Operations Run of Show`.
  - Verify it triggers open in a new tab.
- [ ] **Upload / Attach Document**:
  - Click **Attach Document** button.
  - Enter Title: `Security Evacuation Plan 2026`, URL: `https://storage.googleapis.com/eventops-assets/security_plan.pdf`.
  - Submit and verify the item appears in the list with `PDF` badge.
- [ ] **Delete Document Modal**:
  - Click delete on a document, review the confirmation prompt, and confirm deletion.

---

### Test 8: Multi-Tenant Security & Organization Isolation Check
- [ ] **Acme Corp Event Isolation**:
  - Notice the database contains a 3rd event: `Acme Corp Annual Stakeholders Keynote` belonging to `Acme Corp Brand Events`.
  - While logged in under **Apex Global Experiences**, verify that `Acme Corp Annual Stakeholders Keynote` **NEVER** appears in the events dashboard or anywhere in your views.
- [ ] **Directory Vendor Isolation**:
  - Verify that only vendors belonging to `Apex Global Experiences` appear in the vendor directory and booking dropdowns.

---

## 4. Test Sign-off Checklist

When you complete testing, confirm the following:
- [ ] Authentication & role resolution work seamlessly.
- [ ] Events listing and creation function without errors.
- [ ] Overview tab displays accurate live aggregated statistics.
- [ ] Timeline & Tasks Kanban and List views render and update state reliably.
- [ ] Budget Tracker calculates totals and line items accurately.
- [ ] Guest & Household hierarchy manages RSVPs and dietary alerts cleanly.
- [ ] Vendor directory links and booking status transitions function as intended.
- [ ] Document list filtering, attachment, and deletion operate smoothly.
- [ ] Multi-tenant isolation strictly hides out-of-tenant events and records.

Once you have verified these workflows, reply with your approval or any adjustments needed, and we will proceed to generate the release pull request into `main`!
