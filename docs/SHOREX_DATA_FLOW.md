# SHOREX Data Flow & Architecture

**Purpose:** Understand how data flows through the shore excursion email system  
**Audience:** New developers, architects, component builders  
**Related Files:** `amp-references/SHOREX_ampscript.html`, `AMP-Integrated/excursions_WIP.html`

---

## High-Level System Overview

```
Celebrity Cruises Booking System
            ↓
   [Subscriber Data Attributes]
      (CONSUMER_ID, SHIP_CODE, etc.)
            ↓
  SHOREX_ampscript.html (Initialization)
      (Fetch & validate data)
            ↓
  Email Template (excursions.html or similar)
    (Render customer-specific content)
            ↓
   Email Delivered to Customer
```

---

## Data Flow: Step-by-Step

### Step 1: Email Send Trigger

**What happens:** A subscriber's email is sent through Salesforce Marketing Cloud

**Data available:** Subscriber attributes passed from the list/send definition
```
[CONSUMER_ID]          → "12345678"
[EMAIL_ADDRESS]        → "john@example.com"
[CONSUMER_FIRST_NAME]  → "John"
[SHIP_CODE]            → "EG" (Equinox)
[SHIP_DEPARTURE_DATE]  → "2026-03-15"
[BOOKING_AGREEMENT_ID] → "BK123456"
```

**Code location:** `SHOREX_ampscript.html` lines 1-7

---

### Step 2: Customer Identification & Booking Setup

**Purpose:** Convert subscriber attributes into standardized variables for lookups

**What's happening:**
```ampscript
SET @CONSUMER_ID = [CONSUMER_ID]
SET @SHIP_CODE = [SHIP_CODE]
SET @SHIP_DEPARTURE_DATE = [SHIP_DEPARTURE_DATE]
SET @SHIP_DEPARTURE_DATE = FormatDate(@SHIP_DEPARTURE_DATE, 'YYYY-MM-dd 00:00:00.000')
```

**Why standardize?**
- Data Extension keys expect exact format
- Dates must be consistent across lookups
- Variables can be reused throughout template

**Code location:** `SHOREX_ampscript.html` lines 1-22

---

### Step 3: Currency & Region Detection

**Purpose:** Determine email variant (USD/CAD, US/Canada/International)

**Logic:**
```ampscript
IF INDEXOF(@CMPGN_CODE,'_CAN_') > 0 THEN 
    SET @CURRENCY_CODE = 'CAD'
    SET @CNTRY = 'CAN'
ELSEIF INDEXOF(@CMPGN_CODE,'_USA_') > 0 THEN  
    SET @CURRENCY_CODE = 'USD'
    SET @CNTRY = 'USA'
```

**Flow:**
```
Campaign Code (e.g., "SHOREX_USA_2026")
    ↓ [Check if contains '_USA_' or '_CAN_']
    ↓
Set @CURRENCY_CODE (USD/CAD)
Set @CNTRY (USA/CAN)
    ↓ [Use in URLs & price display]
```

**Code location:** `SHOREX_ampscript.html` lines 24-30

---

### Step 4: Fetch Voyage Itinerary

**Purpose:** Get all ports/days for this voyage

**Diagram:**
```
@SHIP_CODE ("EG")
@CONSUMER_ID ("12345678")    ─┐
@SHIP_DEPARTURE_DATE ("2026-03-15") ─┤  Query filters
                              ─┘
            ↓
    [SHOREX_Excursions_Lookup]
            ↓
        @dayRows
    (All ports, sorted by day)
            ↓
    Record 1: Day 1, Port "San Juan, Puerto Rico", Excursions: empty
    Record 2: Day 2, Port "Cozumel, Mexico", Excursions: "EXC001"
    Record 3: Day 3, Port "Grand Cayman, Jamaica", Excursions: empty
    ... etc
```

**Code:**
```ampscript
SET @dayRows = LookupOrderedRows("SHOREX_Excursions_Lookup", 0, "ITINERARY_DAY_NBR ASC", 
    "SHIP_CODE", @SHIP_CODE, 
    "CONSUMER_ID", @CONSUMER_ID, 
    "SAIL_DATE", @SHIP_DEPARTURE_DATE)
SET @dayRowCount = rowcount(@dayRows)
```

**Output:** `@dayRows` now contains full itinerary; `@dayRowCount` = total ports

**Code location:** `SHOREX_ampscript.html` lines 54-55

---

### Step 5: Check Send History (Duplicate Prevention)

**Purpose:** Avoid showing the same port in multiple emails

**Diagram:**
```
Customer receives Email #1 (Jan 15)
    → Shows "Day 3 - Cozumel"
    → Records in Precruise_Shorex_Sent_By_Port
            ↓
Customer receives Email #2 (Jan 20)
    → Checks: "Did we show Cozumel before?"
    → YES → Skip it, find different port
    → Shows "Day 5 - Jamaica" instead
```

**Code:**
```ampscript
SET @rows = LookupRows("Precruise_Shorex_Sent_By_Port", "EMAIL", @Email)
SET @rowCount = rowcount(@rows)

IF @rowCount == "0" THEN
    /* First email to this customer - mark as sent */
    UpsertDE("Precruise_Shorex_Sent_By_Port", 3, 
        "EMAIL", @Email, 
        "CONSUMER_ID", @CONSUMER_ID, 
        "FIRST_EMAIL", "True", 
        "DATE", NOW())
ENDIF
```

**Data Extension:** `Precruise_Shorex_Sent_By_Port`
- Tracks by: EMAIL + CONSUMER_ID + BOOKING_ID
- Stores: DAY_SENT, PORT_NAME, FIRST_EMAIL flag

**Code location:** `SHOREX_ampscript.html` lines 50-59

---

### Step 6: Find Best Port to Feature (Core Logic)

**Purpose:** Select which unbooked port to showcase in THIS email

**Algorithm:**
```
FOR each port in @dayRows:
    1. Is it Day 1? → SKIP (always skip day 1 per cruise policy)
    2. Is it at sea (ASE)? → SKIP (no excursions available)
    3. Does it have booked excursions? → SKIP (already bought)
    4. Was it featured in a previous email? → SKIP (avoid repetition)
    5. If all checks pass → FEATURE THIS PORT
        └─ Set @found = "True" (stop looping)
        └─ Record in Precruise_Shorex_Sent_By_Port (mark as shown)
```

**Visual Flow:**
```
Itinerary Data (@dayRows)
    ↓
START LOOP: Day 1
    ├─ Check: Is Day 1? YES → SKIP
    ↓
Day 2
    ├─ Check: Is Day 1? NO
    ├─ Check: At sea? NO
    ├─ Check: Excursions booked? NO ✓
    ├─ Check: Previously shown? Check Precruise_Shorex_Sent_By_Port
    │   └─ If NO → FEATURE IT ✓✓✓
    │   └─ Write to Precruise_Shorex_Sent_By_Port
    │   └─ Set @found = "True" (exit loop)
    ↓
END LOOP
    ↓
@ITINERARY_DAY_NBR = 2
@PORT_NAME = "Cozumel"
@ACTIVE_EXCURSIONS = "" (empty - no bookings)
```

**Code location:** `SHOREX_ampscript.html` lines 60-130

**Key variables set:**
- `@ITINERARY_DAY_NBR` - Which day to feature
- `@PORT_NAME` - Port name (cleaned)
- `@ACTIVE_EXCURSIONS` - Booked excursion IDs (empty = good for upsell)
- `@IC_CREDITS` - Onboard credit amount
- `@Region` - Geographic region

---

### Step 7: Enrich Data with Lookups

**Purpose:** Get additional context (ship name, region hero image, nights, etc.)

**Lookups performed:**

```ampscript
/* Get ship name */
@ShipName = Lookup('ent.CRMDL_SHIP', 'SHIP_NAME', 'SHIP_CODE', @SHIP_CODE)

/* Get region hero image */
@Region_Hero = Lookup('SHOREX_Region_Heros_Lookup', 'full', 'region', @Region)

/* Get voyage details */
@NUM_OF_NIGHTS = Lookup("BOOKINGS ALL", "ITINERARY_DAYS_QTY",
    'CONSUMER_ID', @CONSUMER_ID, 
    'BOOKING_ID', @BOOKING_ID, 
    'DEPARTURE_DATE_FUTURE', @DEPARTURE_DATE_FUTURE)
```

**Result:**
```
Featured Port (Day 2)
    ├─ @PORT_NAME = "Cozumel"
    ├─ @IC_CREDITS = 50.00
    ├─ @Region_Hero = "https://...cozumel-hero.jpg"
    ├─ @ShipName = "Equinox"
    └─ @NUM_OF_NIGHTS = 7
```

**Code location:** `SHOREX_ampscript.html` lines 63-147

---

### Step 8: Render Email

**Purpose:** Display the featured port and related content to customer

**Data passed to template:**

```
excursions_WIP.html receives:
├─ @ITINERARY_DAY_NBR ("2")
├─ @PORT_NAME ("Cozumel")
├─ @ACTIVE_EXCURSIONS ("") [empty = unbooked]
├─ @IC_CREDITS ("50.00")
├─ @Region_Hero (image URL)
├─ @ShipName ("Equinox")
├─ @SailingDate ("March 15, 2026")
└─ @ITINERARY_DAY_NBR_WORD ("two")
```

**In the HTML:**
```html
DAY %%=v(@ITINERARY_DAY_NBR)=%%: %%=FormatDate(@LEFT_CURRENT_DAY_DATE, 'M')=%%
<!-- Renders: "DAY 2: Mar 15" -->

%%=UpperCase(@LEFT_PORT_NAME)=%%
<!-- Renders: "COZUMEL" -->

%%[ IF @LEFT_HAS_EXCURSIONS == "TRUE" THEN ]%%
    <!-- Show "Excursions booked" checkmark -->
%%[ ELSE ]%%
    <!-- Show "No excursions" + "Book Now" button -->
%%[ ENDIF ]%%
```

**Code location:** `AMP-Integrated/excursions_WIP.html` lines 100-250

---

### Step 9: Track Delivery & Completion

**Purpose:** Update send history for next email

**What's recorded:**
```ampscript
UpsertDE('Precruise_Shorex_Sent_By_Port', 3, 
    'EMAIL', @Email,                    /* Who received it */
    'CONSUMER_ID', @CONSUMER_ID,        /* Which customer */
    'BOOKING_ID', @BOOKING_ID,          /* Which booking */
    'DAY_SENT', @ITINERARY_DAY_NBR,     /* Which day featured */
    'PORT_NAME', @PORT_NAME,            /* Which port featured */
    'DATE', NOW()                        /* When sent */
)
```

**Storage:** `Precruise_Shorex_Sent_By_Port` Data Extension

**Next email:** When customer receives Email #2, step 5 checks this DE again and picks a DIFFERENT port.

---

## Data Dependencies: The Critical Chain

```
For excursions component to render, ALL of these must be true:

1. ✓ Subscriber attribute: [CONSUMER_ID]
2. ✓ Subscriber attribute: [SHIP_CODE]
3. ✓ Subscriber attribute: [SHIP_DEPARTURE_DATE]
4. ✓ Record exists in SHOREX_Excursions_Lookup
        with matching CONSUMER_ID + SHIP_CODE + SAIL_DATE
5. ✓ At least one port has no excursions booked
        (IF all ports booked, @found never becomes "True")
6. ✓ Port is not "at sea" (PORT_CODE != 'ASE')
7. ✓ Port is Day 2 or later (ITINERARY_DAY_NBR >= 2)

If ANY of these fail:
    → No port is featured
    → @ITINERARY_DAY_NBR remains unset
    → Email shows minimal/fallback content
```

---

## Common Scenarios & Data Outcomes

### Scenario A: Normal Case (New Customer, First Email)

**Input:**
- New customer, 10-day cruise
- Days 1-3: No excursions booked
- Days 4-10: Various booked excursions

**Flow:**
1. Check `Precruise_Shorex_Sent_By_Port` → No record → `@rowCount = 0` ✓
2. Create initial record → `FIRST_EMAIL = "True"`
3. Loop through ports:
   - Day 1 → Skip (policy)
   - Day 2 → Has no excursions ✓✓ FEATURE THIS
4. Set `@ITINERARY_DAY_NBR = 2, @PORT_NAME = "[Port]"`
5. Update `Precruise_Shorex_Sent_By_Port` with `DAY_SENT = 2`

**Output:** Email shows Day 2 port with "Book Now" button

---

### Scenario B: Second Email, Avoid Duplication

**Input:**
- Same customer, 3 days later
- Previous email featured Day 2
- Now attempting second email

**Flow:**
1. Check `Precruise_Shorex_Sent_By_Port` → Found previous record
2. Read `DAY_SENT = 2` (already featured)
3. Loop through ports:
   - Day 1 → Skip (policy)
   - Day 2 → Skip (already sent)
   - Day 3 → Has no excursions ✓ FEATURE THIS
4. Set `@ITINERARY_DAY_NBR = 3, @PORT_NAME = "[Port]"`
5. Update `Precruise_Shorex_Sent_By_Port` with `DAY_SENT = 3`

**Output:** Email shows Day 3 port; customer sees fresh content

---

### Scenario C: All Ports Booked (Edge Case)

**Input:**
- Customer booked excursions for entire cruise
- `@ACTIVE_EXCURSIONS` has values for all ports

**Flow:**
1. Loop finds all ports have excursions booked
2. `@found` never becomes "True"
3. No port is featured

**Output:** Email renders minimal state or shows general "Manage Cruise" button

---

### Scenario D: Customer at Sea (No Excursions Available)

**Input:**
- Specific day is sea day (PORT_CODE = 'ASE')
- No excursions possible this day

**Flow:**
1. Loop reaches sea day
2. Condition: `IF @PORT_CODE != 'ASE'` → False, skip
3. Move to next port

**Output:** Sea days never featured

---

## Architecture Decisions & Why

| Decision | Reason |
|---|---|
| Store `DAY_SENT` in DE instead of email address list | Allows multiple bookings per email; avoids modifying list definitions |
| Use `LookupOrderedRows()` with `ITINERARY_DAY_NBR ASC` | Ensures we process days in logical order; easy to find "next" port |
| Set `@found = "True"` to exit loop early | Prevents showing multiple ports; one hero per email |
| Skip Day 1 (ITINERARY_DAY_NBR != 1) | Business rule: embarkation day has other communications |
| Skip at-sea days (PORT_CODE != 'ASE') | No excursions to sell on sea days |
| Avoid ports with bookings | Focus on upsell opportunities; don't nag on purchased products |

---

## Extensibility: How to Add Features

### Example: Add Customer Tier to Discount Offer

**Current state:** All customers see same credit amount

**Goal:** Show 20% bonus credit if loyalty tier is "Diamond"

**Steps:**
1. In SHOREX_ampscript.html, after line 22, add:
   ```ampscript
   SET @LOYLTY_TIER_CODE = [CC_CURRENT_LOYALTY_TIER_CODE]
   IF @LOYLTY_TIER_CODE == "DIAMOND" THEN
       SET @BONUS_CREDIT_PCT = "20"
   ELSE
       SET @BONUS_CREDIT_PCT = "0"
   ENDIF
   ```

2. In excursions_WIP.html, modify credit display:
   ```html
   Available Credit: %%=v(@IC_CREDITS)=%%
   %%[ IF @BONUS_CREDIT_PCT > "0" THEN ]%%
       + %%=v(@BONUS_CREDIT_PCT)=%% % DIAMOND BONUS
   %%[ ENDIF ]%%
   ```

3. Test with Diamond + non-Diamond subscribers

**Key pattern:** Insert logic in SHOREX (data layer), pass result as variable to HTML (render layer)

---

## Troubleshooting by Data Flow

| Issue | Where to Check |
|---|---|
| Email shows no content | Step 1-2: Are subscriber attributes populated? |
| Email shows wrong port | Step 6: Check `Precruise_Shorex_Sent_By_Port` for previous sends |
| @ACTIVE_EXCURSIONS always empty | Step 4: Is SHOREX_Excursions_Lookup populated for this customer? |
| Currency shows wrong code | Step 3: Does campaign code contain '_USA_' or '_CAN_'? |
| Loop never exits (`@found` stays false) | Step 6: Do all ports have excursions? Are all days = 1 or ASE? |
| URL broken in email | Step 8: Are variables wrapped in `%%=v()=%%`? |

---

## Files in This System

| File | Purpose | Owner |
|---|---|---|
| `SHOREX_ampscript.html` | Data initialization & logic layer (steps 1-7) | Data team |
| `excursions_WIP.html` (in AMP-Integrated) | Rendering layer; uses variables from SHOREX (step 8) | Design/Development |
| SHOREX_Excursions_Lookup (DE) | Master itinerary data | Data warehouse |
| Precruise_Shorex_Sent_By_Port (DE) | Send tracking | Campaign automation |
| BOOKINGS ALL (DE) | Central booking system | CRM integration |

---

## Quick Reference: Variable Lifecycle

```
Subscriber attributes [CONSUMER_ID], [SHIP_CODE], ...
                ↓
SHOREX_ampscript.html
                ↓
Local variables @CONSUMER_ID, @SHIP_CODE, ... 
                ↓
Lookups to Data Extensions
                ↓
Enhanced variables @ITINERARY_DAY_NBR, @PORT_NAME, @ACTIVE_EXCURSIONS, ...
                ↓
HTML template (excursions_WIP.html)
                ↓
Conditionals %%[ IF @HAS_EXCURSIONS ... ]%%
                ↓
Output: Personalized email
                ↓
Log to Precruise_Shorex_Sent_By_Port
                ↓
Next email: Use log to avoid duplicates
```

---

## Questions?

Refer to [SHOREX_AMPSCRIPT_VARIABLES.md](SHOREX_AMPSCRIPT_VARIABLES.md) for detailed variable descriptions and code patterns.
