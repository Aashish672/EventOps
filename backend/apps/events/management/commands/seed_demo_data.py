import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from events.models import (
    BudgetCategory,
    BudgetLineItem,
    Document,
    Event,
    Guest,
    GuestHousehold,
    Task,
    VendorBooking,
)
from organizations.models import Membership, Organization
from vendors.models import Vendor

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with comprehensive Phase 3 demo data, personas, and cross-tenant scenarios."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default="aashish.singh@adypu.edu.in",
            help="Primary user email to link as owner of the flagship organization.",
        )

    def handle(self, *args, **options):
        primary_email = options["email"]
        self.stdout.write(self.style.SUCCESS(f"[SEED] Starting Phase 3 Demo Data Seeding for: {primary_email}"))

        # ----------------------------------------------------------------------
        # 1. PERSONAS CREATION
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Creating personas...")

        # Find or create primary user
        primary_user = User.objects.filter(email__iexact=primary_email).first()
        if not primary_user:
            primary_user = User.objects.create_user(
                username=primary_email.split("@")[0],
                email=primary_email,
                password="Password123!",
            )

        # Persona 1: Sarah Jenkins (Owner)
        sarah, _ = User.objects.get_or_create(
            email="sarah.owner@apexevents.com",
            defaults={"username": "sarah_owner"},
        )
        sarah.set_password("Password123!")
        sarah.save()

        # Persona 2: Marcus Chen (Staff Lead Planner)
        marcus, _ = User.objects.get_or_create(
            email="marcus.planner@apexevents.com",
            defaults={"username": "marcus_planner"},
        )
        marcus.set_password("Password123!")
        marcus.save()

        # Persona 3: Elena Rostova (Staff Planner)
        elena, _ = User.objects.get_or_create(
            email="elena.planner@apexevents.com",
            defaults={"username": "elena_planner"},
        )
        elena.set_password("Password123!")
        elena.save()

        # Persona 4: David Sterling (Freelancer / Member)
        david, _ = User.objects.get_or_create(
            email="david.freelancer@eventops.dev",
            defaults={"username": "david_freelancer"},
        )
        david.set_password("Password123!")
        david.save()

        # Persona 5: Audrey Vance (Cross-Tenant Client Owner)
        audrey, _ = User.objects.get_or_create(
            email="audrey.client@acmecorp.com",
            defaults={"username": "audrey_client"},
        )
        audrey.set_password("Password123!")
        audrey.save()

        # Also link second personal email if present in DB
        aashish_gmail = User.objects.filter(email="aashishsinghjsr81@gmail.com").first()

        # ----------------------------------------------------------------------
        # 2. ORGANIZATIONS & MEMBERSHIPS
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Setting up organizations...")

        # Org 1: Flagship Agency
        apex_org, _ = Organization.objects.get_or_create(
            slug="apex-global",
            defaults={"name": "Apex Global Experiences"},
        )
        # Ensure name is updated if pre-existing
        apex_org.name = "Apex Global Experiences"
        apex_org.save()

        # Memberships for Apex Global
        Membership.objects.get_or_create(organization=apex_org, user=primary_user, defaults={"role": "owner"})
        Membership.objects.filter(organization=apex_org, user=primary_user).update(role="owner")

        if aashish_gmail:
            Membership.objects.get_or_create(organization=apex_org, user=aashish_gmail, defaults={"role": "owner"})

        Membership.objects.get_or_create(organization=apex_org, user=sarah, defaults={"role": "owner"})
        Membership.objects.get_or_create(organization=apex_org, user=marcus, defaults={"role": "planner"})
        Membership.objects.get_or_create(organization=apex_org, user=elena, defaults={"role": "planner"})
        Membership.objects.get_or_create(organization=apex_org, user=david, defaults={"role": "member"})

        # Org 2: Freelancer's Independent Studio
        freelance_org, _ = Organization.objects.get_or_create(
            slug="sterling-av-works",
            defaults={"name": "Sterling AV Production Works"},
        )
        Membership.objects.get_or_create(organization=freelance_org, user=david, defaults={"role": "owner"})

        # Org 3: Cross-Tenant Client Company
        acme_org, _ = Organization.objects.get_or_create(
            slug="acme-brand-events",
            defaults={"name": "Acme Corp Brand Events"},
        )
        Membership.objects.get_or_create(organization=acme_org, user=audrey, defaults={"role": "owner"})

        # ----------------------------------------------------------------------
        # 3. DIRECTORY VENDORS (Apex Global)
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Populating vendor directory...")

        v_palace, _ = Vendor.objects.get_or_create(
            organization=apex_org,
            name="Grand Horizon Palace",
            defaults={
                "category": "venue",
                "point_of_contact": "Elena Rostova",
                "email": "reservations@grandhorizon.com",
                "phone": "+1-555-0192",
            },
        )

        v_catering, _ = Vendor.objects.get_or_create(
            organization=apex_org,
            name="Artisan Culinary & Catering",
            defaults={
                "category": "catering",
                "point_of_contact": "Chef Marcus Vance",
                "email": "chef@artisancatering.com",
                "phone": "+1-555-0143",
            },
        )

        v_photo, _ = Vendor.objects.get_or_create(
            organization=apex_org,
            name="Lumina Visuals Studio",
            defaults={
                "category": "photography",
                "point_of_contact": "Chloe Bennet",
                "email": "chloe@luminavisuals.com",
                "phone": "+1-555-0188",
            },
        )

        v_av, _ = Vendor.objects.get_or_create(
            organization=apex_org,
            name="Pulse AV & Stage Lighting",
            defaults={
                "category": "entertainment",
                "point_of_contact": "David Sterling",
                "email": "bookings@pulseav.com",
                "phone": "+1-555-0177",
            },
        )

        _v_floral, _ = Vendor.objects.get_or_create(
            organization=apex_org,
            name="Petals & Bloom Florals",
            defaults={
                "category": "florist",
                "point_of_contact": "Hana Lee",
                "email": "info@petalsbloom.com",
                "phone": "+1-555-0122",
            },
        )

        # ----------------------------------------------------------------------
        # 4. EVENTS SETUP
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Seeding flagship events...")

        now = timezone.now()

        # EVENT 1: Global AI & Innovation Summit 2026
        summit_event, _ = Event.objects.get_or_create(
            organization=apex_org,
            name="Global AI & Innovation Summit 2026",
            defaults={
                "description": "Three-day flagship artificial intelligence conference bringing together 500+ tech leaders, keynote speakers, and founders.",
                "start_date": now + datetime.timedelta(days=30),
                "end_date": now + datetime.timedelta(days=33),
                "status": "planning",
                "assigned_planner": marcus,
            },
        )

        # EVENT 2: Lumina Charity Gala & Auction
        _gala_event, _ = Event.objects.get_or_create(
            organization=apex_org,
            name="Lumina Charity Gala & Auction",
            defaults={
                "description": "Black-tie evening fundraiser with live celebrity auction and 4-course banquet.",
                "start_date": now + datetime.timedelta(days=60),
                "end_date": now + datetime.timedelta(days=60, hours=6),
                "status": "active",
                "assigned_planner": elena,
            },
        )

        # EVENT 3 (Cross-tenant): Acme Corp Private Keynote
        Event.objects.get_or_create(
            organization=acme_org,
            name="Acme Corp Annual Stakeholders Keynote",
            defaults={
                "description": "Private corporate presentation for shareholders and board members.",
                "start_date": now + datetime.timedelta(days=45),
                "end_date": now + datetime.timedelta(days=46),
                "status": "planning",
                "assigned_planner": audrey,
            },
        )

        # ----------------------------------------------------------------------
        # 5. TASKS & TIMELINE (Global AI Summit)
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Seeding timeline tasks...")

        task_data = [
            ("Finalize keynote speaker technical riders", "Confirm display resolutions, lavalier mic preferences, and demo laptop connections.", "todo", marcus, now + datetime.timedelta(days=10)),
            ("Review stage LED wall dimensions and rigging specs", "Check ceiling load limit with Grand Horizon facilities manager.", "todo", david, now + datetime.timedelta(days=12)),
            ("Confirm dietary requirements with catering team", "Collate vegan, halal, and nut-allergy counts from attendee registrations.", "in_progress", elena, now + datetime.timedelta(days=7)),
            ("Badge printing and RFID registration testing", "Coordinate with registration desk vendor for thermal printer setup.", "in_progress", marcus, now + datetime.timedelta(days=14)),
            ("Execute venue lease agreement for Grand Ballroom", "Signed master contract and remitted 50% advance retainer.", "done", sarah, now - datetime.timedelta(days=5)),
            ("Launch early-bird ticketing portal", "Published registration page and Stripe checkout integration.", "done", primary_user, now - datetime.timedelta(days=15)),
        ]

        for title, desc, status_val, assignee, due in task_data:
            Task.objects.get_or_create(
                organization=apex_org,
                event=summit_event,
                title=title,
                defaults={
                    "description": desc,
                    "status": status_val,
                    "assigned_to": assignee,
                    "due_date": due,
                },
            )

        # ----------------------------------------------------------------------
        # 6. BUDGET CATEGORIES & LINE ITEMS (Global AI Summit)
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Seeding budget and expense line items...")

        cat_venue, _ = BudgetCategory.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            name="Venue & Production",
            defaults={"allocated_amount": "35000.00"},
        )
        cat_food, _ = BudgetCategory.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            name="Food & Beverage",
            defaults={"allocated_amount": "25000.00"},
        )
        cat_mktg, _ = BudgetCategory.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            name="Marketing & Swag",
            defaults={"allocated_amount": "10000.00"},
        )

        venue_items = [
            ("Grand Ballroom 3-Day Rental", "18000.00", "18000.00", True),
            ("Main Stage 4K LED Screen & Rigging", "12000.00", "11500.00", False),
            ("Overnight Security & Facility Turnover", "3000.00", "2800.00", True),
        ]
        for desc, est, act, is_paid in venue_items:
            BudgetLineItem.objects.get_or_create(
                organization=apex_org,
                category=cat_venue,
                event=summit_event,
                description=desc,
                defaults={"estimated_cost": est, "actual_cost": act, "is_paid": is_paid},
            )

        food_items = [
            ("Networking Lunch Buffets (3 Days)", "15000.00", "15400.00", False),
            ("VIP Speaker Dinner Reception", "6000.00", "5800.00", True),
            ("All-Day Specialty Coffee & Matcha Bar", "3500.00", "3200.00", False),
        ]
        for desc, est, act, is_paid in food_items:
            BudgetLineItem.objects.get_or_create(
                organization=apex_org,
                category=cat_food,
                event=summit_event,
                description=desc,
                defaults={"estimated_cost": est, "actual_cost": act, "is_paid": is_paid},
            )

        mktg_items = [
            ("Eco-friendly tech backpacks & lanyards", "6000.00", "5900.00", True),
            ("Step-and-repeat banner & venue signage", "3000.00", "2950.00", False),
        ]
        for desc, est, act, is_paid in mktg_items:
            BudgetLineItem.objects.get_or_create(
                organization=apex_org,
                category=cat_mktg,
                event=summit_event,
                description=desc,
                defaults={"estimated_cost": est, "actual_cost": act, "is_paid": is_paid},
            )

        # ----------------------------------------------------------------------
        # 7. GUEST HOUSEHOLDS & INDIVIDUAL GUESTS (Global AI Summit)
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Seeding guest households and attendees...")

        hh_vance, _ = GuestHousehold.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            name="The Vance Keynote Delegation",
            defaults={"address": "742 Evergreen Terrace, Palo Alto, CA", "email": "marcus.vance@techlead.org"},
        )
        Guest.objects.get_or_create(
            organization=apex_org,
            household=hh_vance,
            event=summit_event,
            first_name="Marcus",
            last_name="Vance",
            defaults={"rsvp_status": "attending", "dietary_restrictions": "None"},
        )
        Guest.objects.get_or_create(
            organization=apex_org,
            household=hh_vance,
            event=summit_event,
            first_name="Sophia",
            last_name="Vance",
            defaults={"rsvp_status": "attending", "dietary_restrictions": "Gluten-Free, Vegetarian"},
        )
        Guest.objects.get_or_create(
            organization=apex_org,
            household=hh_vance,
            event=summit_event,
            first_name="Leo",
            last_name="Vance",
            defaults={"rsvp_status": "pending", "dietary_restrictions": "Severe Nut Allergy"},
        )

        hh_research, _ = GuestHousehold.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            name="DeepMind Research Fellows",
            defaults={"address": "6 Pancras Square, London", "email": "research@deepmind.com"},
        )
        Guest.objects.get_or_create(
            organization=apex_org,
            household=hh_research,
            event=summit_event,
            first_name="Dr. Alex",
            last_name="Rivera",
            defaults={"rsvp_status": "attending", "dietary_restrictions": "Halal"},
        )
        Guest.objects.get_or_create(
            organization=apex_org,
            household=hh_research,
            event=summit_event,
            first_name="Dr. Maya",
            last_name="Lin",
            defaults={"rsvp_status": "attending", "dietary_restrictions": "None"},
        )

        hh_acme, _ = GuestHousehold.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            name="Acme Venture Partners",
            defaults={"address": "100 Sand Hill Road, Menlo Park", "email": "ventures@acme.com"},
        )
        Guest.objects.get_or_create(
            organization=apex_org,
            household=hh_acme,
            event=summit_event,
            first_name="Arthur",
            last_name="Wellington",
            defaults={"rsvp_status": "declined", "dietary_restrictions": "None"},
        )
        Guest.objects.get_or_create(
            organization=apex_org,
            household=hh_acme,
            event=summit_event,
            first_name="Beatrice",
            last_name="Wellington",
            defaults={"rsvp_status": "pending", "dietary_restrictions": "Dairy-Free"},
        )

        # ----------------------------------------------------------------------
        # 8. VENDOR BOOKINGS (Global AI Summit)
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Seeding vendor bookings and contracts...")

        VendorBooking.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            vendor=v_palace,
            defaults={
                "status": "booked",
                "agreed_price": "18000.00",
                "contract_notes": "Ballroom A & B reserved from 07:00 to 23:00 daily. 50% deposit cleared.",
            },
        )
        VendorBooking.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            vendor=v_catering,
            defaults={
                "status": "contract_sent",
                "agreed_price": "21200.00",
                "contract_notes": "Covers 3 days lunch buffet for 350 attendees + evening VIP plated banquet.",
            },
        )
        VendorBooking.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            vendor=v_photo,
            defaults={
                "status": "booked",
                "agreed_price": "4500.00",
                "contract_notes": "2 dedicated event photographers, 1 videographer, highlight reel within 5 business days.",
            },
        )
        VendorBooking.objects.get_or_create(
            organization=apex_org,
            event=summit_event,
            vendor=v_av,
            defaults={
                "status": "inquiry",
                "agreed_price": "11500.00",
                "contract_notes": "Draft proposal sent for dual 4K LED backdrops and wireless lavalier kit.",
            },
        )

        # ----------------------------------------------------------------------
        # 9. DOCUMENTS (Global AI Summit)
        # ----------------------------------------------------------------------
        self.stdout.write("[INFO] Seeding event documents...")

        docs_data = [
            ("Summit Main Stage Technical Rider v2.1", "https://storage.googleapis.com/eventops-assets/stage_tech_rider_v2.pdf", marcus),
            ("Grand Horizon Ballroom Seating & Booth Map", "https://storage.googleapis.com/eventops-assets/floor_plan_booths.png", elena),
            ("Master VIP Plated Dinner Menu & Allergens", "https://storage.googleapis.com/eventops-assets/vip_menu_allergens.docx", marcus),
            ("Master Event Operations Run of Show", "https://docs.google.com/spreadsheets/d/eventops_run_of_show_2026", primary_user),
        ]

        for doc_title, url, uploader in docs_data:
            Document.objects.get_or_create(
                organization=apex_org,
                event=summit_event,
                title=doc_title,
                defaults={"file_url": url, "uploaded_by": uploader},
            )

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Phase 3 Demo Data Seeding Completed Successfully!"))
        self.stdout.write("----------------------------------------------------------------")
        self.stdout.write("Summary:")
        self.stdout.write(f"- Flagship Org: {apex_org.name} (slug: {apex_org.slug})")
        self.stdout.write(f"- Linked Owner Account: {primary_user.email} (ID: {primary_user.id})")
        self.stdout.write("- Additional Personas: Sarah (Owner), Marcus (Planner), Elena (Planner), David (Freelancer), Audrey (Acme Corp Client)")
        self.stdout.write(f"- Featured Event: {summit_event.name} ({summit_event.status.upper()})")
        self.stdout.write(f"  * Tasks: {Task.objects.filter(event=summit_event).count()} tasks (Kanban populated)")
        self.stdout.write(f"  * Budget: {BudgetCategory.objects.filter(event=summit_event).count()} categories, {BudgetLineItem.objects.filter(event=summit_event).count()} line items")
        self.stdout.write(f"  * Guests: {GuestHousehold.objects.filter(event=summit_event).count()} households, {Guest.objects.filter(event=summit_event).count()} guests")
        self.stdout.write(f"  * Vendors: {VendorBooking.objects.filter(event=summit_event).count()} bookings from directory")
        self.stdout.write(f"  * Documents: {Document.objects.filter(event=summit_event).count()} attached contracts & plans")
        self.stdout.write("----------------------------------------------------------------")
