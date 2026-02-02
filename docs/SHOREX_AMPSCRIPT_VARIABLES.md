# SHOREX AmpScript Variables Reference

**File:** `amp-references/SHOREX_ampscript.html`  
**Purpose:** Initialization and logic layer for Celebrity Cruises shore excursion pre-cruise emails  
**Audience:** Developers creating conditionals, modifying lookups, or extending functionality

---

## Quick Start: Variable Categories

AmpScript variables in SHOREX are organized into 4 categories:

1. **Customer Identifiers** - Who the email is going to
2. **Booking Details** - Which cruise/voyage
3. **Excursion Data** - Port & activity status
4. **Rendering Variables** - What displays in the email

---

## Customer Identifiers

These are the "keys" that unlock all other data lookups.

| Variable | Source | Type | Example | Usage |
|---|---|---|---|---|
| `@CONSUMER_ID` | `[CONSUMER_ID]` subscriber attribute | String | `"12345678"` | Primary key for all DE lookups |
| `@EMAIL` | `[EMAIL_ADDRESS]` subscriber attribute | String | `"john@example.com"` | Lookup key for sent tracking |
| `@FirstName` | `[CONSUMER_FIRST_NAME]` subscriber attribute | String | `"John"` | Email personalization |
| `@LastName` | `[CONSUMER_LAST_NAME]` subscriber attribute | String | `"Smith"` | Email personalization & URL parameter |

**When to use:** These never change during email execution. Use them to fetch related data.

---

## Booking Details

Information about the cruise/voyage itself.

| Variable | Source | Set By | Type | Example | Usage |
|---|---|---|---|---|---|
| `@BOOKING_ID` | `[BOOKING_AGREEMENT_ID]` attribute | Line 3 | String | `"BK123456"` | Unique booking reference, used with CONSUMER_ID |
| `@SHIP_CODE` | `[SHIP_CODE]` attribute | Line 4 | String | `"EG"`, `"SL"`, `"SU"` | Ship identifier for Excursions_Lookup |
| `@SHIP_DEPARTURE_DATE` | `[SHIP_DEPARTURE_DATE]` attribute | Lines 5-6 | DateTime (formatted) | `"2026-03-15 00:00:00.000"` | Sail date key for lookups; formatted YYYY-MM-dd |
| `@DEPARTURE_DATE_FUTURE` | Copy of `@SHIP_DEPARTURE_DATE` | Line 7 | DateTime (raw) | Same as above | Used in BOOKINGS ALL lookups |
| `@NUM_OF_NIGHTS` | Lookup from `BOOKINGS ALL` | Line 56 | Integer | `7`, `10`, `14` | Total cruise nights for context |
| `@ITINERARY_NAME` | Lookup from `BOOKINGS ALL` | Line 146 | String | `"Caribbean Cruise"` | Voyage title for email display |
| `@SailingDate` | Formatted `@SHIP_DEPARTURE_DATE` | Line 147 | String | `"March 15, 2026"` | Human-readable date for email |

**When to use:** These are constants for the entire send. Use `@SHIP_CODE` and `@SHIP_DEPARTURE_DATE` together as filter keys.

---

## Excursion & Itinerary Data

Dynamic data from the shore excursion system.

### Core Itinerary Variables (per day/port)

| Variable | Source | Set By | Type | Example | Usage |
|---|---|---|---|---|---|
| `@ITINERARY_DAY_NBR` | Field from `SHOREX_Excursions_Lookup` | Line 65 | Integer | `1`, `2`, `3`, etc. | Voyage day number; use in conditionals |
| `@PORT_CODE` | Field from `SHOREX_Excursions_Lookup` | Line 66 | String | `"ASE"`, `"SJU"`, `"CUN"` | Port identifier; often used to exclude (e.g., `!= 'ASE'`) |
| `@PORT_NAME` | Field from `SHOREX_Excursions_Lookup` (cleaned) | Lines 68-71 | String | `"San Juan"`, `"Cozumel"` | Display name; cleaned to remove country suffix |
| `@ACTIVE_EXCURSIONS` | Lookup from `SHOREX_Excursions_Lookup` | Line 74 | String (pipe-delimited IDs) | `"EXC001\|EXC002"` or empty | Booked excursion IDs; empty = no bookings |
| `@IC_CREDITS` | Field from `SHOREX_Excursions_Lookup` | Line 72 | Decimal | `50.00`, `75.50` | Onboard credit available for excursions |
| `@Region` | Field from `SHOREX_Excursions_Lookup` | Line 67 | String | `"Caribbean"`, `"Alaska"` | Geographic region code (same as RDSS_VERSION) |
| `@Region_Hero` | Lookup from `SHOREX_Region_Heros_Lookup` | Line 73 | URL/String | Image URL | Hero image for the region |

### Tracking & Logic Variables

| Variable | Source | Set By | Type | Purpose |
|---|---|---|---|---|
| `@found` | Custom flag | Lines 60, 98, etc. | String (`"True"` / `"False"`) | Loop control: stops searching when best port found |
| `@DAY_SENT` | Custom or lookup | Lines 109, 113 | Integer | Which day was last featured; used to skip previously shown ports |
| `@dayRows` | `LookupOrderedRows()` result | Line 54 | RowSet | All ports for this voyage, sorted by day |
| `@dayRowCount` | RowCount of `@dayRows` | Line 55 | Integer | Total number of ports/stops |

---

## Data Extensions (Where Data Comes From)

### SHOREX_Excursions_Lookup

**Purpose:** Master data for all port stops and excursion bookings

**Key Fields (filters):**
- `SHIP_CODE` - Which ship
- `SAIL_DATE` - Which sailing
- `CONSUMER_ID` - Which passenger

**Return Fields (extracted):**
- `ITINERARY_DAY_NBR` - Day number
- `PORT_NAME` - Port name (with country)
- `PORT_CODE` - Port code
- `RDSS_VERSION` - Region classification
- `ONBOARD_CREDIT` - Credit amount
- `ACTIVE_EXCURSIONS` - Booked excursion IDs (pipe-delimited)

**Example Lookup:**
```ampscript
SET @rows = LookupOrderedRows("SHOREX_Excursions_Lookup", 0, "ITINERARY_DAY_NBR ASC", 
    "SHIP_CODE", @SHIP_CODE, 
    "CONSUMER_ID", @CONSUMER_ID, 
    "SAIL_DATE", @SHIP_DEPARTURE_DATE)
```

---

### Precruise_Shorex_Sent_By_Port

**Purpose:** Tracks which days/ports have been shown in previous emails to avoid repetition

**Key Fields:**
- `EMAIL`
- `CONSUMER_ID`
- `BOOKING_ID`

**Tracked Fields:**
- `DAY_SENT` - Last featured day
- `PORT_NAME` - Last featured port
- `FIRST_EMAIL` - Boolean, first send?
- `DATE` - When was it sent

**Usage Example:**
```ampscript
/* Check if we've sent before */
SET @rows = LookupRows("Precruise_Shorex_Sent_By_Port", "EMAIL", @Email)
IF @rowCount == "0" THEN
    /* First email - mark as sent */
    UpsertDE("Precruise_Shorex_Sent_By_Port", 3, 
        "EMAIL", @Email, 
        "DAY_SENT", "1")
ENDIF
```

---

### BOOKINGS ALL

**Purpose:** Central booking system data - voyage details, customer status

**Common Lookups:**
```ampscript
SET @NUM_OF_NIGHTS = Lookup("BOOKINGS ALL", "ITINERARY_DAYS_QTY",
    'CONSUMER_ID', @CONSUMER_ID, 
    'BOOKING_ID', @BOOKING_ID, 
    'DEPARTURE_DATE_FUTURE', @DEPARTURE_DATE_FUTURE)

SET @REGION_FUTURE = Lookup('BOOKINGS ALL', 'REGION_NAME', 
    'CONSUMER_ID', @CONSUMER_ID, 
    'BOOKING_ID', @BOOKING_ID, 
    'DEPARTURE_DATE_FUTURE', @DEPARTURE_DATE_FUTURE)
```

---

## Common Patterns & Recipes

### Pattern 1: Build a Conditional Based on Excursion Status

**Goal:** Show different content if customer has booked excursions

```ampscript
/* In excursions_WIP.html component */
SET @HAS_EXCURSIONS = IIF(NOT EMPTY(@ACTIVE_EXCURSIONS), "TRUE", "FALSE")

%%[ IF @HAS_EXCURSIONS == "TRUE" THEN ]%%
    <!-- Show "Excursions booked" state -->
%%[ ELSE ]%%
    <!-- Show "No excursions booked" state -->
%%[ ENDIF ]%%
```

**What it does:**
- `NOT EMPTY()` checks if the variable has a value
- `IIF()` = inline if/then (shorthand for SET with IF)
- Store result in a simple "TRUE"/"FALSE" variable for HTML conditionals

---

### Pattern 2: Clean Port Name (Remove Country Suffix)

**Goal:** Display "San Juan" instead of "San Juan, Puerto Rico"

```ampscript
SET @PORT_NAME = Field(@row, 'PORT_NAME')
IF indexOf(@PORT_NAME, ",") > 0 THEN
    SET @PORT_NAME = Substring(@PORT_NAME, 1, Subtract(IndexOf(@PORT_NAME, ","), 1))
ENDIF
```

**Breakdown:**
1. `indexOf()` finds comma position
2. `Substring()` extracts text before comma
3. `Subtract()` calculates where to cut off

**Pro tip:** This is used everywhere port names appear to keep emails clean.

---

### Pattern 3: Loop Through All Ports (How SHOREX_ampscript Works)

**Goal:** Find the best unbooked port to feature

```ampscript
/* Get all ports for this voyage */
SET @dayRows = LookupOrderedRows("SHOREX_Excursions_Lookup", 0, "ITINERARY_DAY_NBR ASC", 
    "SHIP_CODE", @SHIP_CODE, 
    "CONSUMER_ID", @CONSUMER_ID, 
    "SAIL_DATE", @SHIP_DEPARTURE_DATE)
SET @dayRowCount = rowcount(@dayRows)

/* Loop through each port */
FOR @i = 1 to @dayRowCount DO
    SET @row = row(@dayRows, @i)  /* Get this iteration's record */
    SET @ITINERARY_DAY_NBR = field(@row, "ITINERARY_DAY_NBR")
    SET @PORT_NAME = field(@row, 'PORT_NAME')
    SET @ACTIVE_EXCURSIONS = field(@row, 'ACTIVE_EXCURSIONS')
    
    /* Check conditions */
    IF @ITINERARY_DAY_NBR > 1 AND Empty(@ACTIVE_EXCURSIONS) THEN
        /* Found an unbooked port on day 2+ */
        SET @found = "True"
    ENDIF
    
    NEXT @i  /* Move to next port */
ENDIF
```

**Key points:**
- `LookupOrderedRows()` returns a set of records
- `RowCount()` counts how many
- Loop from 1 to count
- `Row()` extracts one record per iteration
- `Field()` extracts one column from that record

---

### Pattern 4: Build Dynamic URLs

**Goal:** Create personalized booking links

```ampscript
SET @URL_CRUISE_PLANNER = "https://www.celebritycruises.com/account/cruise-planner?bookingId=%%=v(@BOOKING_ID)=%%&shipCode=%%=v(@SHIP_CODE)=%%&sailDate=%%=Format(@SHIP_DEPARTURE_DATE,'yyyyMMdd')=%%&currencyCode=%%=v(@CURRENCY_CODE)=%%"
```

**Syntax:**
- `%%=v(@VARIABLE)=%%` - Insert variable value into URL
- `%%=Format(date, 'format')=%%` - Format a date inline

---

## Currency & Localization

| Variable | Source | Type | Example |
|---|---|---|---|
| `@CURRENCY_CODE` | Derived from `@CMPGN_CODE` | String | `"USD"`, `"CAD"` |
| `@CNTRY` | Derived from `@CMPGN_CODE` | String | `"USA"`, `"CAN"` |
| `@INTL_COUNTRY` | Lookup from subscriber `COUNTRY_CODE` | String | `"TRUE"` if AUS/NZL/GBR/IRL |

**Logic:**
```ampscript
IF INDEXOF(@CMPGN_CODE,'_CAN_') > 0 THEN 
    SET @CURRENCY_CODE = 'CAD'
ELSEIF INDEXOF(@CMPGN_CODE,'_USA_') > 0 THEN  
    SET @CURRENCY_CODE = 'USD'
ELSE 
    SET @CURRENCY_CODE = 'USD'  /* Default */
ENDIF
```

---

## Word Conversion (Day Numbers)

Lines 148-163 convert numeric days to English words:

```ampscript
IF @ITINERARY_DAY_NBR == '1' THEN SET @ITINERARY_DAY_NBR_WORD = 'one' ENDIF 
IF @ITINERARY_DAY_NBR == '2' THEN SET @ITINERARY_DAY_NBR_WORD = 'two' ENDIF
/* ... etc to 20 ... */
```

**Usage in email:**
```html
DAY %%=v(@ITINERARY_DAY_NBR)=%%: 
Book your %%=v(@ITINERARY_DAY_NBR_WORD)=%% day excursion
```

---

## Troubleshooting: Variable Not Working?

| Symptom | Check |
|---|---|
| Variable is empty/blank in email | Is it being set in SHOREX_ampscript.html? Does the lookup/filter exist? |
| Lookup returns no results | Are the key fields spelled exactly right? Do the DE filters match the subscriber data? |
| Conditional never triggers | Check string comparison: `== "TRUE"` not `== TRUE` (without quotes) |
| Loop only shows first item | Did you forget `NEXT @i`? Is `@rowCount` actually > 0? |
| URL parameters corrupt | Did you use `%%=v()=%%` for variables and `%%=Format()=%%` for dates? |

---

## Next Steps

- **To create a new conditional:** Find your variable → Check if `@HAS_EXCURSIONS`, `@ACTIVE_EXCURSIONS`, or `@found` applies → Wrap HTML in `%%[ IF ... THEN ]%%`
- **To add a new lookup:** See Pattern 3 above → Add field extraction → Use in HTML
- **To track new data:** Create Upsert to `Precruise_Shorex_Sent_By_Port` → Read it back with Lookup
