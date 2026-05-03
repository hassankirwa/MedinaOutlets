The main idea is:

Admins create and manage census campaigns. Field collectors submit outlet records from the mobile app. Supervisors validate the records. Approved submissions become the official outlet master database.

1. The product story

Imagine a pharma distributor wants to run an outlet census in Kiambu County.

The admin logs into the React admin dashboard and creates:

Campaign: Kiambu County Outlet Census
County: Kiambu
Target outlets: Pharmacies, hospitals, clinics, dispensaries, agrovets
Field collectors: 15
Campaign period: 1 May 2026 - 15 May 2026

The system loads all wards in Kiambu County.

Because there may be more wards than field collectors, the admin does not assign one ward per collector. Instead, the admin creates zones/routes, where one route may contain several wards.

Example:

Route 1: Ward A + Ward B + Ward C
Route 2: Ward D + Ward E
Route 3: Ward F + Ward G + Ward H + Ward I

Each field collector receives one or more routes on the React Native mobile app.

The collector goes to the field, opens the mobile app, captures outlet details, GPS, photo, contact person, outlet category, and whether the outlet is serviced by the distributor.

When the phone has internet, submissions sync to the Laravel backend.

The supervisor reviews each submission in the React admin dashboard. They can approve, reject, request correction, merge duplicates, or flag suspicious records.

Approved submissions then become the official outlet master database.

2. Overall system architecture

I would split the product into three main applications:

React Admin Dashboard
        ↓
Laravel API Backend
        ↓
PostgreSQL/PostGIS Database
        ↓
React Native Field App

A more complete view:

                    ┌───────────────────────────┐
                    │   React Admin Frontend     │
                    │   Admin + Supervisor UI    │
                    └─────────────┬─────────────┘
                                  │
                                  │ HTTPS / JSON API
                                  │
┌─────────────────────────────────▼─────────────────────────────────┐
│                         Laravel API Backend                        │
│                                                                    │
│ Auth, Campaigns, Assignments, Forms, Submissions, Reviews, Reports │
│                                                                    │
│ Queues, Validation, Duplicate Detection, Photo Processing, Exports  │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
 PostgreSQL + PostGIS        Object Storage              Redis
 outlet data, GPS,           facility photos,            queues, cache,
 wards, polygons             attachment(firebase)              background jobs

                                  ▲
                                  │ HTTPS / JSON API
                                  │
                    ┌─────────────┴─────────────┐
                    │ React Native Mobile App    │
                    │ Field collector app        │
                    │ Offline-first data capture │
                    └───────────────────────────┘

For a new build in April 2026, I would use Laravel 12.x as the backend foundation;

For location-heavy work, I would use PostgreSQL + PostGIS because PostGIS adds spatial storage, indexing, and querying to PostgreSQL, which is useful for ward boundaries, GPS checks, proximity searches, and duplicate detection by distance.

1. Recommended technology stack
Backend
Laravel 12
PHP 8.3+
PostgreSQL
PostGIS
Redis
Laravel Queues
Laravel Horizon
Laravel Sanctum
firebase

Laravel should act primarily as an API backend. Laravel’s API routing can install Sanctum, and Sanctum is suitable for SPAs, mobile applications, and API token authentication.

Laravel queues should handle background work such as photo compression, duplicate detection, large imports, report generation, and exports. Laravel’s queue system supports moving time-intensive tasks into background jobs, and Horizon can monitor Redis queue throughput, runtime, and failures.

Laravel file storage should handle facility photos. The Laravel filesystem supports local storage, SFTP, and S3-compatible object storage, so you can start locally and move to cloud object storage later.

React admin frontend
React
TypeScript
React Router
TanStack Query or similar API cache
Map library
Chart library
Role-based UI

React is appropriate for the admin dashboard because it lets you build the interface from reusable components, which fits modules like campaigns, assignments, maps, review queues, and reports.

The React admin should be used by:

Super Admin
Distributor Admin
Supervisor
QA Officer
React Native mobile app
React Native
TypeScript
SQLite local database
Camera integration
GPS/location integration
Offline sync engine
Secure token storage

For offline storage, I would use SQLite rather than simple key-value storage because field submissions, photos, sync queues, corrections, form definitions, and ward assignments need relational structure. Expo SQLite provides a SQLite-backed local database API for React Native/Expo apps.

The mobile app should also monitor connectivity and foreground/background state so it knows when to sync. React Native’s AppState API tells whether the app is in the foreground or background, and the community NetInfo package provides network information for Android, iOS, web, and other platforms.

4. Core modules of the Laravel backend

I would organize the Laravel backend around business modules, not just controllers.

Auth & Users
Companies / Distributors
Geography
Campaigns
Routes / Zones / Assignments
Form Templates
Mobile Sync
Outlet Submissions
Validation & QA
Supervisor Review
Master Outlet Database
Reports & Exports
Audit Logs
Notifications

A clean Laravel structure could look like this:

app/
  Models/
    User.php
    Company.php
    Campaign.php
    Ward.php
    CampaignZone.php
    OutletSubmission.php
    Outlet.php

  Http/
    Controllers/
      Admin/
      Supervisor/
      Mobile/
      Reports/

    Requests/
      Campaign/
      Assignment/
      Submission/
      Review/

    Resources/
      CampaignResource.php
      SubmissionResource.php
      OutletResource.php

  Services/
    AssignmentPlanner/
    Sync/
    Validation/
    DuplicateDetection/
    Reporting/
    Geo/

  Actions/
    Campaigns/
    Submissions/
    Reviews/
    Outlets/

  Jobs/
    ProcessSubmissionPhoto.php
    DetectDuplicateSubmission.php
    ValidateSubmissionLocation.php
    GenerateCampaignExport.php

  Policies/
    CampaignPolicy.php
    SubmissionPolicy.php
    OutletPolicy.php

Laravel Eloquent models are suitable here because each database table can have a corresponding model for retrieving, inserting, updating, and deleting records. Laravel API Resources are also useful for transforming models into consistent JSON responses for React and React Native.

5. Main database design

You should not directly store every field from your current dataset as-is. Your dataset has duplicates such as:

FACILITY_NAME
Facility_Name

PHYSICAL_LOCATION
Physical_Location_Address

EMAIL_ADDRESS
Email_Address

FACILITY_PHOTO
Facility_Photo

Instead, create a clean canonical schema and preserve the original payload separately.

Main tables
companies
users
roles
counties
sub_counties
wards
campaigns
campaign_wards
campaign_zones
campaign_zone_wards
campaign_assignments
form_templates
form_fields
outlet_submissions
submission_locations
submission_photos
submission_answers
validation_flags
duplicate_candidates
review_actions
outlets
outlet_contacts
outlet_service_profiles
sync_logs
audit_logs
devices
6. Core entity relationships

The main relationship should be:

Company
  has many Users
  has many Campaigns

Campaign
  belongs to Company
  belongs to County
  has many Campaign Zones
  has many Assignments
  has many Outlet Submissions

Campaign Zone
  belongs to Campaign
  has many Wards
  has many Assignments

Assignment
  belongs to Campaign
  belongs to Fieldworker
  belongs to Supervisor
  belongs to Campaign Zone

Outlet Submission
  belongs to Campaign
  belongs to Fieldworker
  belongs to Assignment
  has many Locations
  has many Photos
  has many Validation Flags
  may become one Outlet

Outlet
  belongs to Company
  may be created from an approved Outlet Submission

Important distinction:

outlet_submissions = raw data from the field
outlets = approved official outlet database

Do not let raw field submissions immediately become official outlets.

7. Campaign/project design

The campaigns table should store each census exercise.

campaigns/projects
- id
- company_id
- name
- county_id
- description
- start_date
- end_date
- status
- form_template_id
- gps_required
- photo_required
- created_by
- published_at
- closed_at
- created_at
- updated_at

Campaign/project statuses:

draft
ready_for_launch
active
paused
completed
validated
closed
archived

Admin flow:

Create campaign/project
    ↓
Select county
    ↓
Select target outlet categories
    ↓
Attach form template
    ↓
Create zones/routes
    ↓
Assign field collectors
    ↓
Publish campaign/project
8. Ward, zone, and assignment design

Because collectors may be fewer than wards, assignments should happen at the zone/route level.

Geography tables
counties
- id
- name
- code
- boundary_geometry

sub_counties
- id
- county_id
- name
- boundary_geometry

wards
- id
- county_id
- sub_county_id
- name
- boundary_geometry
- estimated_outlets
- priority
- urban_rural_class

The boundary_geometry fields should use PostGIS geometry/geography types so the backend can check whether a GPS point is inside a ward or near an existing outlet.

Campaign zones
campaign_zones
- id
- campaign_id
- name
- expected_outlets
- priority
- status
- notes
campaign_zone_wards
- id
- campaign_zone_id
- ward_id
- sequence_order

Example:

Zone: Ruiru East Route
Wards:
- Gitothua
- Biashara
- Gatongora
Expected outlets: 220
Assigned collector: Jane
Campaign assignments
campaign_assignments
- id
- campaign_id
- campaign_zone_id
- fieldworker_id
- supervisor_id
- status
- assigned_by
- assigned_at
- started_at
- completed_at

Assignment statuses:

not_started
in_progress
partially_covered
completed_by_collector
under_review
needs_revisit
approved
closed

This lets one collector cover several wards and lets one ward be split into smaller zones if it is too large.

9. Assignment logic when collectors are fewer than wards

The admin should not assign by equal ward count. They should assign by estimated workload.

The system should consider:

Estimated outlet count
Ward size
Distance between market centers
Urban/rural density
Campaign duration
Collector daily capacity
Priority level
Collector experience

Example:

County has 40 wards
Collectors available: 10
Campaign duration: 10 days
Expected collector capacity: 20 outlets/day

One collector capacity:
20 × 10 = 200 outlets

So each route should target roughly 150–220 expected outlets.

Assignment example:

Collector	Assigned wards	Expected outlets	Logic
Jane	2 urban wards	210	Dense area
Kevin	4 rural wards	160	Fewer outlets, more travel
Mary	3 mixed wards	190	Balanced
Brian	1 large ward split-zone	230	High-density ward
Amina	Floating	Variable	Supports delayed zones

The admin dashboard should show:

Total wards
Assigned wards
Unassigned wards
Expected outlets
Collector capacity
Coverage gap
Overloaded collectors
Underloaded collectors

If the team is too small, the system should warn:

Your current field team may not complete the campaign within the selected period.
Recommended actions:
- Extend campaign duration
- Add collectors
- Use campaign waves
- Prioritize high-value wards first
- Add floating collectors
10. Mobile app user story

The React Native field collector app should behave like this:

1. Field collector logs in.
2. App downloads assigned campaign.
3. App downloads form template.
4. App downloads assigned zones and wards.
5. App downloads any correction requests.
6. Collector starts a new outlet visit.
7. App captures start time and GPS.
8. Collector fills outlet details.
9. Collector captures facility photo.
10. Collector reviews the form.
11. Collector saves as draft or submits.
12. If offline, app queues the submission locally.
13. When online, app syncs to Laravel.
14. Server validates and returns status.
15. Collector can see submitted, synced, rejected, and correction records.

The mobile home screen should show:

Active Campaign
Assigned Route
Assigned Wards
Today’s Submissions
Drafts
Pending Sync
Rejected / Needs Correction
Sync Status
11. Mobile app screens

Minimum screens:

Login
Campaign List
Campaign Details
Assigned Route / Wards
Map View
New Outlet Form
Drafts
Pending Sync
Submitted Records
Needs Correction
Profile
Sync Center

Outlet form screens:

1. Start Visit
2. Capture GPS
3. Outlet Classification
4. Facility Details
5. Owner / Contact Details
6. Distribution / Servicing Details
7. Facility Photo
8. Remarks
9. Review & Submit
12. Canonical outlet form

Your original dataset should be reorganized into clean form sections.

A. System metadata

Captured automatically:

start_time
end_time
fieldworker_id
campaign_id
assignment_id
device_id
local_uuid
server_uuid
submitted_at
app_version
form_version

From your dataset, these map to:

start
end
_uuid
_submission_time
_submitted_by
__version__
_id
_index
B. GPS data
start_latitude
start_longitude
start_altitude
start_precision
outlet_latitude
outlet_longitude
outlet_altitude
outlet_precision
location_flag

From your dataset:

start-geopoint
_start-geopoint_latitude
_start-geopoint_longitude
_start-geopoint_altitude
_start-geopoint_precision
LOCATION
GEOPOINT
GEOPOINT_001
location_flag
C. Outlet classification
type_of_account
outlet_type
outlet_category
medical_facility_type
pharmacy_category
hospital_category
clinic_dispensary_category
agrovet_category

From your dataset:

Type_of_Account
MEDICAL_FACILITY
AGROVET_CATEGORIES
AGROVET_CAT
PHARMACY_CATEGORIES
HOSPITAL_CATEGORIES
CLINIC_DISPENSARY_CATEGORIES
D. Facility details
facility_name
physical_location_address
nearest_known_landmark

From your dataset:

FACILITY_NAME
Facility_Name
PHYSICAL_LOCATION
Physical_Location_Address
NEAREST_KNOWN_LANDMARK
Nearest_Known_Landmark
E. Owner/contact details
owner_director_name
business_phone
email_address
business_registration_number

From your dataset:

OWNER_S_DIRECTOR_S_NAME
Owner_Director_s_Name
BUSINESS_OFFICE_LINE
Business_Office_Line
EMAIL_ADDRESS
Email_Address
Company_Business_Registration_Number
F. Servicing/distribution details
is_outlet_serviced
serviced_by
serviced_by_medolab
serviced_by_medina
products_stocked
competitor_brands_present
service_frequency

From your dataset:

OUTLET_SERVICED
OUTLET_SERVICED_BY_MEDOLAB_MEDINA
OUTLET_SERVICED_BY_MEDOLAB
G. Photos and remarks
facility_photo_path
facility_photo_url
photo_captured_at
photo_latitude
photo_longitude
collector_remarks
supervisor_notes
tags

From your dataset:

FACILITY_PHOTO
FACILITY_PHOTO_URL
Facility_Photo
Facility_Photo_URL
REMARK
_notes
_tags
13. Submission lifecycle

Each outlet submission should move through a clear lifecycle.

Draft on Device
    ↓
Ready to Sync
    ↓
Syncing
    ↓
Synced to Server
    ↓
Submitted
    ↓
Under Review
    ↓
Approved / Rejected / Needs Correction / Merged
    ↓
Published to Master Outlet Database

Database statuses:

draft
pending_sync
synced
submitted
under_review
needs_correction
corrected
approved
rejected
merged
published_to_master

The collector should only be able to edit:

draft records
sync-failed records
records returned as needs_correction

They should not edit approved records.

14. Offline-first mobile sync design

The field app must work without internet.

Local mobile database tables:

local_campaigns
local_assignments
local_zones
local_wards
local_form_templates
local_form_fields
local_submissions
local_submission_answers
local_submission_photos
sync_queue
corrections
sync_metadata

Every mobile submission should have:

local_uuid
server_uuid
campaign_id
fieldworker_id
assignment_id
sync_status
last_sync_attempt_at
sync_attempt_count

The most important field is local_uuid.

It prevents duplicate records when a collector taps submit twice or loses internet during upload.

Sync flow
Mobile app starts
    ↓
Checks auth token
    ↓
Pulls assigned campaigns, forms, zones, corrections
    ↓
Collector works offline
    ↓
Submissions saved locally
    ↓
Photos saved locally
    ↓
When online, app pushes queued records
    ↓
Laravel stores submission
    ↓
Laravel returns server_uuid and status
    ↓
Mobile marks record as synced

Recommended sync endpoints:

GET  /api/mobile/bootstrap
GET  /api/mobile/sync/pull?since=timestamp
POST /api/mobile/sync/push
POST /api/mobile/submissions
POST /api/mobile/submissions/{uuid}/photos
GET  /api/mobile/corrections
POST /api/mobile/corrections/{id}/resubmit

The server response should include:

{
  "local_uuid": "mobile-generated-id",
  "server_uuid": "server-generated-id",
  "status": "submitted",
  "message": "Submission received successfully"
}
15. Backend validation flow

When a submission reaches Laravel, do not just store it and stop.

Laravel should trigger a validation pipeline:

Receive submission
    ↓
Validate required fields
    ↓
Store raw submission
    ↓
Queue photo upload/processing
    ↓
Check GPS precision
    ↓
Check if GPS is inside assigned ward/zone
    ↓
Check possible duplicates
    ↓
Check suspicious time patterns
    ↓
Create validation flags
    ↓
Send to supervisor review queue

Validation flags:

missing_required_field
missing_photo
low_gps_precision
outside_assigned_area
possible_duplicate
same_phone_as_existing_outlet
similar_name_nearby
same_registration_number
photo_reused
unrealistic_form_duration
submitted_outside_campaign_period

For GPS checks, PostGIS can store and query points and polygons, and functions like distance checks are suitable for proximity-based duplicate detection.

16. Duplicate detection design

Duplicate detection should not automatically delete records. It should create duplicate candidates for supervisor review.

Use:

facility_name similarity
business_phone
business_registration_number
owner_name
GPS distance
photo hash
same collector / same day pattern

Example rule:

Possible duplicate if:
- Same business phone, or
- Same registration number, or
- Similar facility name within 100 meters, or
- Same facility photo hash

Table:

duplicate_candidates
- id
- campaign_id
- submission_id
- possible_match_type
- matched_submission_id
- matched_outlet_id
- score
- reason
- status
- reviewed_by
- reviewed_at

Supervisor actions:

Approve as new outlet
Reject as duplicate
Merge with existing outlet
Request correction
17. Supervisor review flow

In the React admin dashboard, the supervisor sees:

Pending Review
Flagged Submissions
Possible Duplicates
Needs Correction
Approved Today
Rejected Today

For each submission, the review screen should show:

Facility details
Outlet category
Collector name
Submission date/time
Map location
Assigned ward/zone
GPS precision
Facility photo
Duplicate warnings
Validation flags
Previous review notes

Supervisor actions:

Approve
Reject
Request Correction
Merge
Edit Minor Details
Add Internal Note

When approved:

outlet_submissions.status = approved
new outlet record is created or existing outlet is updated
review action is logged
audit log is created

When correction is requested:

submission.status = needs_correction
correction message is sent to mobile app
collector edits required fields
collector resubmits
18. Master outlet database

The outlets table should contain only verified records.

outlets
- id
- company_id
- campaign_id
- created_from_submission_id
- canonical_name
- outlet_type
- outlet_category
- county_id
- sub_county_id
- ward_id
- latitude
- longitude
- physical_location_address
- nearest_known_landmark
- owner_director_name
- business_phone
- email_address
- business_registration_number
- servicing_status
- serviced_by
- verification_status
- last_verified_at
- status
- created_at
- updated_at

Over time, this becomes more than a census list. It becomes a commercial distribution database:

Outlet profile
Visit history
Servicing status
Products stocked
Sales rep assigned
Last order date
Last verification date
Competitor presence
19. React admin dashboard modules

The React admin frontend should have these modules:

Dashboard
Campaigns
Assignments
Fieldworkers
Map View
Submissions
Review Queue
Duplicate Resolution
Master Outlets
Reports
Exports
Settings
Audit Logs
Admin dashboard

Show:

Total submissions
Approved outlets
Pending review
Rejected submissions
Needs correction
Duplicate candidates
GPS-flagged submissions
Collectors active today
Coverage by ward
Coverage by outlet type
Campaign screen

Admin can:

Create campaign
Edit campaign
Select county
Attach form
Assign supervisors
Create zones/routes
Publish campaign
Pause campaign
Close campaign
Export campaign data
Assignment planner

Admin can:

View county wards
Group wards into zones
Assign zones to collectors
See expected workload
See overloaded collectors
See unassigned wards
Rebalance assignments
Create campaign waves
Map view

Map should show:

Ward boundaries
Assigned zones
Outlet pins
Submission status
Collector coverage
GPS flags
Duplicate clusters
Uncovered wards
20. API structure

I would separate API routes by audience:

/api/admin/...
/api/supervisor/...
/api/mobile/...
/api/reports/...
Authentication
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh

Use Sanctum differently for the two clients:

React admin: cookie/session-based Sanctum authentication
React Native app: token-based Sanctum authentication

Sanctum supports SPA authentication using Laravel’s cookie-based session services and can also authenticate requests using API tokens.

Campaign APIs
GET    /api/admin/campaigns
POST   /api/admin/campaigns
GET    /api/admin/campaigns/{id}
PUT    /api/admin/campaigns/{id}
POST   /api/admin/campaigns/{id}/publish
POST   /api/admin/campaigns/{id}/pause
POST   /api/admin/campaigns/{id}/close
Assignment APIs
GET    /api/admin/campaigns/{id}/wards
POST   /api/admin/campaigns/{id}/zones
PUT    /api/admin/zones/{id}
POST   /api/admin/zones/{id}/wards
POST   /api/admin/assignments
PUT    /api/admin/assignments/{id}/reassign
GET    /api/admin/campaigns/{id}/assignment-summary
Mobile APIs
GET    /api/mobile/bootstrap
GET    /api/mobile/campaigns
GET    /api/mobile/assignments
GET    /api/mobile/forms/{id}
POST   /api/mobile/submissions
POST   /api/mobile/submissions/{uuid}/photos
GET    /api/mobile/submissions/status
GET    /api/mobile/corrections
POST   /api/mobile/corrections/{id}/resubmit
POST   /api/mobile/sync/push
GET    /api/mobile/sync/pull
Review APIs
GET    /api/supervisor/submissions/pending
GET    /api/supervisor/submissions/flagged
GET    /api/supervisor/submissions/{id}
POST   /api/supervisor/submissions/{id}/approve
POST   /api/supervisor/submissions/{id}/reject
POST   /api/supervisor/submissions/{id}/request-correction
POST   /api/supervisor/submissions/{id}/merge
Reports APIs
GET    /api/reports/campaigns/{id}/summary
GET    /api/reports/campaigns/{id}/fieldworker-performance
GET    /api/reports/campaigns/{id}/coverage
GET    /api/reports/campaigns/{id}/outlet-types
POST   /api/reports/campaigns/{id}/export
21. Form design

Because outlet census forms may change, do not hard-code every form forever.

Use a hybrid model:

Core fields as database columns
Dynamic form answers as JSON / answer rows
Raw payload preserved for audit
Form template tables
form_templates
- id
- company_id
- name
- version
- status
- created_by
- published_at

form_fields
- id
- form_template_id
- key
- label
- type
- required
- options
- validation_rules
- visibility_condition
- sort_order

Example dynamic behavior:

Question: Outlet Type
Options: Pharmacy, Hospital, Clinic, Dispensary, Agrovet

If Pharmacy:
  show pharmacy_category

If Hospital:
  show hospital_category

If Agrovet:
  show agrovet_category

On mobile, the React Native app downloads the form template and renders the correct fields.

22. How the mobile app talks to the backend
First login
Collector enters phone/email + password
    ↓
Laravel authenticates
    ↓
Laravel returns token
    ↓
Mobile securely stores token
    ↓
Mobile calls /api/mobile/bootstrap

Bootstrap response:

{
  "user": {
    "id": 15,
    "name": "Jane Wanjiku",
    "role": "field_collector"
  },
  "campaigns": [
    {
      "id": 7,
      "name": "Kiambu County Outlet Census",
      "status": "active"
    }
  ],
  "assignments": [
    {
      "id": 33,
      "campaign_id": 7,
      "zone_name": "Ruiru East Route",
      "wards": ["Gitothua", "Biashara", "Gatongora"]
    }
  ],
  "forms": [
    {
      "id": 4,
      "version": "1.0.0"
    }
  ]
}
Submission upload

Mobile sends:

{
  "local_uuid": "9d79a5e2-collector-local-id",
  "campaign_id": 7,
  "assignment_id": 33,
  "started_at": "2026-05-01T08:10:00+03:00",
  "ended_at": "2026-05-01T08:24:00+03:00",
  "outlet_type": "Pharmacy",
  "facility_name": "Ruiru Health Pharmacy",
  "physical_location_address": "Ruiru Town, near main stage",
  "nearest_known_landmark": "Ruiru Bus Stage",
  "owner_director_name": "John Mwangi",
  "business_phone": "07XXXXXXXX",
  "email_address": "example@example.com",
  "is_outlet_serviced": true,
  "serviced_by": "Medolab",
  "gps": {
    "latitude": -1.1452,
    "longitude": 36.9611,
    "precision": 6.5
  },
  "answers": {
    "pharmacy_category": "Retail Pharmacy",
    "collector_remarks": "Outlet active and stocks fast-moving products"
  }
}

Laravel responds:

{
  "local_uuid": "9d79a5e2-collector-local-id",
  "server_uuid": "server-generated-uuid",
  "status": "submitted",
  "requires_photo_upload": true
}

Then the app uploads the photo separately.

23. Security and permissions

Use role-based access.

Roles:

super_admin
company_admin
campaign_manager
supervisor
qa_officer
field_collector
viewer

Permissions:

create_campaign
publish_campaign
assign_collectors
view_all_submissions
review_submissions
approve_submissions
export_data
manage_users
manage_forms
view_reports

Security rules:

Field collectors can only access their assigned campaigns.
Supervisors can only review assigned campaigns.
Company admins can only see their company data.
Super admins can see all companies.
Approved outlets cannot be edited by field collectors.
Every approval, rejection, merge, and correction must be audited.
24. Quality assurance rules

The app should automatically flag risky data.

GPS rules
GPS missing
GPS precision too low
GPS outside assigned ward
GPS outside campaign county
Same GPS used for many outlets
Outlet too far from selected ward
Time rules
Form completed too quickly
Form left open too long
Submission made outside working hours
Many submissions submitted from one place
Photo rules
Photo missing
Photo reused
Photo uploaded later without GPS
Photo does not match outlet visit time
Duplicate rules
Same phone number
Same business registration number
Similar facility name nearby
Same owner name nearby
Same photo hash

Important: most of these should create flags, not hard blocks. Fieldwork is messy, and supervisors should make the final decision.

25. Reporting and exports

Reports should answer business questions, not just technical questions.

Campaign reports
How many outlets were found?
How many are pharmacies, hospitals, clinics, agrovets?
Which wards are fully covered?
Which wards are under-covered?
How many outlets are serviced by us?
How many outlets are serviced by competitors?
How many potential new outlets exist?
Which collectors are performing well?
Which submissions are suspicious?
Export formats
CSV
Excel
PDF summary
GeoJSON
KML
API integration

Exports should be generated in background jobs because large exports can take time. Laravel queues are appropriate for that kind of time-intensive work.

26. Development roadmap
Phase 1: Foundation

Build:

Laravel API project
React admin project
React Native mobile project
Authentication
Roles and permissions
Company/distributor setup
County/sub-county/ward data model
Basic dashboard shell

Deliverable:

Users can log in.
Admins can manage fieldworkers.
Backend has geography and company structure.
Phase 2: Campaign management

Build:

Create campaign
Edit campaign
Select county
Attach form template
Set start/end dates
Set GPS/photo requirements
Campaign status flow

Deliverable:

Admin can create a census campaign and prepare it for launch.
Phase 3: Assignment planner

Build:

Ward listing
Zone/route creation
Assign multiple wards to one zone
Assign zone to fieldworker
Assignment status tracking
Unassigned ward warnings
Workload summary

Deliverable:

Admin can assign fewer collectors across many wards using routes/zones.
Phase 4: Mobile data collection MVP

Build:

Mobile login
Download assigned campaigns
Download assigned routes/wards
Render outlet form
Capture GPS
Capture facility photo
Save draft
Submit online
Store offline submissions locally

Deliverable:

Field collectors can collect outlet data in the field.
Phase 5: Offline sync engine

Build:

Local SQLite tables
Sync queue
Retry logic
Submission upload
Photo upload
Pull corrections
Pull status updates
Conflict handling

Deliverable:

Collectors can work offline and sync later without losing records.
Phase 6: Supervisor review

Build:

Pending review queue
Submission detail page
Map + photo review
Approve
Reject
Request correction
Correction comments
Review history

Deliverable:

Supervisors can validate field submissions before they enter the master outlet database.
Phase 7: Validation and duplicate detection

Build:

GPS precision checks
Outside-assigned-area flags
Duplicate phone checks
Duplicate name-near-location checks
Duplicate registration number checks
Photo missing/reused checks
Validation flags dashboard
Duplicate resolution screen

Deliverable:

The system protects the outlet database from poor-quality and duplicate records.
Phase 8: Master outlet database

Build:

Approved outlet creation
Outlet profile page
Outlet search/filter
Outlet map
Outlet servicing status
Outlet edit history
Merge history

Deliverable:

Approved submissions become a clean official outlet database.
Phase 9: Reports and exports

Build:

Campaign summary dashboard
Fieldworker performance report
Ward coverage report
Outlet category report
Servicing coverage report
CSV/Excel export
Map export

Deliverable:

Admins can see campaign progress and export final census results.
Phase 10: Hardening and deployment

Build:

Audit logs
API rate limiting
Backups
Error logging
Queue monitoring
Photo storage cleanup
Automated tests
Staging environment
Production deployment

Deliverable:

The system is ready for real field operations.
27. MVP scope

For the first production-ready MVP, I would keep the scope focused.

Admin MVP
Login
User/fieldworker management
Create campaign
Create zones/routes
Assign collectors
View submissions
Review submissions
Approve/reject/request correction
View campaign dashboard
Export CSV/Excel
Mobile MVP
Login
View assigned campaign
View assigned wards/routes
Fill outlet form
Capture GPS
Capture photo
Save draft
Submit/sync
View correction requests
Backend MVP
Auth
Roles
Campaigns
Assignments
Submissions
Photos
Review workflow
Basic duplicate checks
Basic GPS flags
Exports

Do not start with advanced AI, complex routing, CRM integration, or sales order management. Build a strong census workflow first.

28. The final system flow

The complete flow should look like this:

Company Admin logs into React dashboard
    ↓
Creates county outlet census campaign
    ↓
Selects outlet types and form template
    ↓
Groups wards into zones/routes
    ↓
Assigns zones to field collectors
    ↓
Publishes campaign
    ↓
React Native app downloads campaign, form, and assignments
    ↓
Collector visits outlets
    ↓
App captures GPS, photo, facility details, owner details, servicing data
    ↓
Submission is saved locally if offline
    ↓
Submission syncs to Laravel when online
    ↓
Laravel stores raw submission
    ↓
Laravel queues validation, photo processing, duplicate detection
    ↓
Supervisor reviews submission in React dashboard
    ↓
Supervisor approves, rejects, requests correction, or merges duplicate
    ↓
Approved submission becomes official outlet record
    ↓
Admin monitors progress, coverage, and fieldworker performance
    ↓
Campaign is completed, validated, exported, and archived
29. The most important design principle

Do not design this as a simple survey app.

Design it as a campaign-based field operations system.

The correct structure is:

Campaign
  → Assignment zones/routes
  → Mobile submissions
  → Validation flags
  → Supervisor review
  → Approved outlet master database
  → Reports and exports

That structure will support your real-world problem:

Many wards
Few collectors
Offline fieldwork
Photos and GPS
Pharma outlet classification
Distributor servicing visibility
Supervisor validation
Clean final outlet database
30. Local development environment

Postgres (local dev):
- Host: 127.0.0.1
- Port: 5433
- Database: medina-outlets
- User: postgres
- Password: openpgpwd

Laravel `.env` equivalent (once the backend is scaffolded):

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5433
DB_DATABASE=medina-outlets
DB_USERNAME=postgres
DB_PASSWORD=openpgpwd

Note: PostGIS extension must be enabled in this database
(CREATE EXTENSION IF NOT EXISTS postgis;) per section 5
of this plan.

Security note: this password is recorded here for local
development only. Once `Kobo-Backend/` exists, move the real
secrets into `Kobo-Backend/.env` (git-ignored) and keep
only a `.env.example` with placeholder values in version
control.