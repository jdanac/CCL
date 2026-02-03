# Shore Excursions Checklist Component - Overview

## Purpose
The Shore Excursions component dynamically generates a personalized checklist of port days for each guest's sailing, displaying their excursion booking status and providing quick access to book additional excursions.

## Data Source

### Data Extension
- **Name**: `SHOREX_Excursions_Lookup`
- **Query Keys**: 
  - `SHIP_CODE` - Ship identifier
  - `SAIL_DATE` - Sailing departure date
  - `CONSUMER_ID` - Guest identifier
- **Sort Order**: `ITINERARY_DAY_NBR ASC` (Days rendered in sequential order)

### Key Fields
| Field | Description | Usage |
|-------|-------------|-------|
| `ITINERARY_DAY_NBR` | Day number (1-based) | Loop iteration, day header display |
| `PORT_NAME` | Port of call name | Display (cleaned to remove country) |
| `PORT_CODE` | Port identifier | Available for URL parameters |
| `ACTIVE_EXCURSIONS` | Pipe-delimited excursion IDs or empty | Determines booked/unbooked state |
| `SAIL_DATE` | Sailing departure date | Date calculations |
| `ONBOARD_CREDIT` | Available credit amount | Available for future features |
| `CC_LOYALTY_ACCOUNT_NBR` | Captain's Club number | Available for URL parameters |
| `RDSS_VERSION` | Data version identifier | Tracking |

### Required Initialization Variables
These variables **must** be set by `SHOREX_ampscript.html` before this component is rendered:
- `@SHIP_CODE`
- `@SHIP_DEPARTURE_DATE`
- `@CONSUMER_ID`

## Component Architecture

### Image Sourcing (Current Implementation)

**Source DE:** `SHOREX_GraphiQL_Products`

**Lookup keys (composite match):**
- `shipCode` (from `@LEFT_SHIP_CODE` / `@RIGHT_SHIP_CODE`)
- `sailDate` (from `@LEFT_SAIL_DATE` / `@RIGHT_SAIL_DATE`)
- `day` (from `@LEFT_ITINERARY_DAY_NBR` / `@RIGHT_ITINERARY_DAY_NBR`)

**Why these keys:**
- The GraphiQL Products DE is indexed by sailing context. A day value is required to locate the correct image for that specific sailing day.
- The DE does **not** include `PORT_CODE`, so day is the only contextual disambiguator available alongside ship and sail date.

**Lookup flow (per port day):**
1. Build a rowset with `LookupRows('SHOREX_GraphiQL_Products', 'shipCode', @SHIP_CODE, 'sailDate', @SAIL_DATE, 'day', @ITINERARY_DAY_NBR)`
2. If at least one row exists, use the first row’s `path` as the image URL.
3. If no rows exist, use the fallback image URL.

**Important behavior notes:**
- If a **sailing/day** does not exist in `SHOREX_GraphiQL_Products`, the fallback image is expected and correct.
- The lookup is intentionally strict; using a different sail date to “fill in” missing images would produce incorrect imagery for that guest’s itinerary.
- If business needs require image coverage regardless of day availability, a different DE keyed by **port** or **itinerary** would be required.

### Loop Logic

#### Pending Day Pairing System
The component renders shore excursion days in a **2-column layout** by processing ALL rows sequentially and tracking a "pending" day:

**Flow:**
```
Loop row 1: Port day → Save as PENDING LEFT
Loop row 2: AT SEA → Skip (filter)
Loop row 3: Port day → Render PAIR(pending + current), clear pending
Loop row 4: AT SEA → Skip (filter)
Loop row 5: Port day → Save as PENDING LEFT
Loop row 6: Port day → Render PAIR(pending + current), clear pending
(After loop) Pending still set? → Render FINAL ODD
```

**Index Loop:**
```ampscript
FOR @i = 1 TO @rowCount DO
    SET @currentRow = Row(@rows, @i)
    // Extract and clean port name
    // IF AT SEA → NEXT @i (skip)
    // IF port day AND no pending → Save as LEFT, set @PENDING_DAY
    // IF port day AND pending exists → Load as RIGHT, render PAIR, clear pending
NEXT @i
```

#### AT SEA Filtering
```ampscript
IF @CURRENT_PORT_NAME != "AT SEA" THEN
    // Process port day (pending logic)
ENDIF
```

All "AT SEA" port days are completely filtered from rendering. Port days are never lost:
- Single port between AT SEA days becomes PENDING LEFT
- Next port encountered pairs with pending, renders as PAIR
- Final port with no pair renders as FINAL ODD after loop ends

#### Variable Namespacing
All extracted data uses `@LEFT_` and `@RIGHT_` prefixes to avoid conflicts:
- `@LEFT_ITINERARY_DAY_NBR` vs `@RIGHT_ITINERARY_DAY_NBR`
- `@LEFT_PORT_NAME` vs `@RIGHT_PORT_NAME`
- `@LEFT_HAS_EXCURSIONS` vs `@RIGHT_HAS_EXCURSIONS`
- `@PENDING_DAY` - Flag tracking if LEFT is waiting for RIGHT pairing

### Conditional Layouts

#### Layout Detection Flag
```ampscript
IF EMPTY(@PENDING_DAY) THEN
    // This is our first port day, save as LEFT
ELSE
    // We have a pending day, pair with this one, render PAIR, then clear pending
ENDIF

// After loop: IF NOT EMPTY(@PENDING_DAY) THEN render FINAL ODD
```

The presence of `@PENDING_DAY` determines layout:

#### PAIR Layout
Renders when a LEFT port day has found a RIGHT port day to pair with

**Structure:**
```
┌─────────────────────────────┬─────────────────────────────┐
│ LEFT COLUMN (50%)           │ RIGHT COLUMN (50%)          │
├─────────────────────────────┼─────────────────────────────┤
│ • Day header + date         │ • Day header + date         │
│ • Image                     │ • Image                     │
│ • Port name                 │ • Port name                 │
│ • Booked/Unbooked state     │ • Booked/Unbooked state     │
│ • Book Now button           │ • Book Now button           │
└─────────────────────────────┴─────────────────────────────┘
```

#### FINAL ODD Layout
Renders when a port day remains unpaired at the end of the loop (odd total port count)

**Structure:**
```
┌─────────────────────────────┬─────────────────────────────┐
│ IMAGE COLUMN (50%)          │ CONTENT COLUMN (50%)        │
├─────────────────────────────┼─────────────────────────────┤
│ • Image only                │ • Day header + date         │
│                             │ • Port name                 │
│                             │ • Booked/Unbooked state     │
│                             │ • Book Now button           │
└─────────────────────────────┴─────────────────────────────┘
```

### Excursion State Logic

#### State Detection
```ampscript
SET @LEFT_HAS_EXCURSIONS = IIF(NOT EMPTY(@LEFT_ACTIVE_EXCURSIONS), "TRUE", "FALSE")
```

- **BOOKED** (`@LEFT_HAS_EXCURSIONS == "TRUE"`): `ACTIVE_EXCURSIONS` field contains pipe-delimited data
- **UNBOOKED** (`@LEFT_HAS_EXCURSIONS == "FALSE"`): `ACTIVE_EXCURSIONS` field is empty/null

#### Visual States

##### Booked State
- **Background**: Dark navy (`#081632`)
- **Icon**: Checkmark (&#10003;) in orange circle
- **Text**: "Excursions booked" (white)
- **Mobile Behavior**: Image hidden via `hide-booked-image-mobile` CSS class

##### Unbooked State
- **Background**: Light gray (`#d6d6d6`)
- **Icon**: Empty circle (light gray)
- **Text**: "No excursions booked" (dark gray)
- **Button**: Orange "BOOK NOW" CTA displayed below state indicator

### Port Name Cleanup & AT SEA Filtering
```ampscript
SET @CURRENT_PORT_NAME = Field(@currentRow, 'PORT_NAME')
IF indexOf(@CURRENT_PORT_NAME, ",") > 0 THEN
    SET @CURRENT_PORT_NAME = Substring(@CURRENT_PORT_NAME, 1, Subtract(IndexOf(@CURRENT_PORT_NAME, ","), 1))
ENDIF
SET @CURRENT_PORT_NAME = Trim(Uppercase(@CURRENT_PORT_NAME))

IF @CURRENT_PORT_NAME != "AT SEA" THEN
    // Process as port day (pairing logic)
ENDIF
```

**Port name cleanup removes country suffix:**
- Input: `"San Juan, Puerto Rico"`
- After substring: `"San Juan"`

**AT SEA filtering:**
- Normalized to uppercase and trimmed
- Comparison: `"AT SEA"` (exact match)
- Handles variations: `"AT SEA "` (trailing space), `"at sea"` (lowercase)
- Rows where port name IS "AT SEA" are completely skipped via `NEXT @i`

### Mobile Optimization

#### Responsive Images
Images are conditionally hidden on mobile when excursions are booked:

```html
<tr%%[ IF @LEFT_HAS_EXCURSIONS == "TRUE" THEN ]%% class="hide-booked-image-mobile"%%[ ENDIF ]%%>
```

**Applied to:**
- LEFT column image in PAIR layout
- RIGHT column image in PAIR layout
- Image column in FINAL ODD layout

This CSS class (defined elsewhere) uses media queries to hide images on small screens when the guest has already booked excursions, prioritizing content over imagery.

### Visual Separators

Dividers appear **only between PAIR layouts** and are now rendered inline as each pair renders (no separate conditional block needed).

## Example Scenarios

### 4-Night Cruise (Even Port Days, No AT SEA)
```
Row 1: Nassau        → Save as PENDING LEFT
Row 2: Cozumel       → Pair with pending → Render PAIR, clear pending
Row 3: Grand Cayman  → Save as PENDING LEFT
Row 4: Jamaica       → Pair with pending → Render PAIR, clear pending
(After loop) Pending empty → No FINAL ODD
```

### 5-Night Cruise (Odd Port Days, No AT SEA)
```
Row 1: Nassau        → Save as PENDING LEFT
Row 2: Cozumel       → Pair with pending → Render PAIR, clear pending
Row 3: Grand Cayman  → Save as PENDING LEFT
Row 4: Jamaica       → Pair with pending → Render PAIR, clear pending
Row 5: St. Thomas    → Save as PENDING LEFT
(After loop) Pending set → Render FINAL ODD
```

### 7-Night Cruise with AT SEA Days
```
Row 1: Nassau        → Save as PENDING LEFT
Row 2: AT SEA        → Skip (filter)
Row 3: Cozumel       → Pair with pending → Render PAIR, clear pending
Row 4: Grand Cayman  → Save as PENDING LEFT
Row 5: Jamaica       → Pair with pending → Render PAIR, clear pending
Row 6: AT SEA        → Skip (filter)
Row 7: St. Thomas    → Save as PENDING LEFT
(After loop) Pending set → Render FINAL ODD
Result: 3 port days rendered in 2 pairs (PAIR + PAIR + FINAL ODD), 2 AT SEA days hidden
```

### Mixed Booking States with AT SEA
```
Row 1: Nassau        (BOOKED)   → Save as PENDING LEFT
Row 2: Cozumel       (UNBOOKED) → Pair → Render PAIR (booked+unbooked), clear pending
Row 3: AT SEA        → Skip
Row 4: Grand Cayman  (BOOKED)   → Save as PENDING LEFT
Row 5: Jamaica       (BOOKED)   → Pair → Render PAIR (booked+booked), clear pending
Row 6: St. Thomas    (UNBOOKED) → Save as PENDING LEFT
(After loop) Pending set → Render FINAL ODD (unbooked)
```

## Date Calculations

### Day Date Display
```ampscript
SET @LEFT_CURRENT_DAY_DATE = DateAdd(@LEFT_SAIL_DATE, Subtract(@LEFT_ITINERARY_DAY_NBR, 1), 'D')
```

**Example:**
- Sail Date: `2026-02-15`
- Day 1: `2026-02-15` (sail date + 0 days)
- Day 2: `2026-02-16` (sail date + 1 day)
- Day 7: `2026-02-21` (sail date + 6 days)

Displayed as: `DAY 1: FEB 15` using `FormatDate(@LEFT_CURRENT_DAY_DATE, 'M')`

## Performance Considerations

### Loop Efficiency
- **Single DE Query**: All data retrieved once at the top
- **Sequential Processing**: Each row processed exactly once (O(n) complexity)
- **No Index Math**: Direct `Row(@rows, @i)` access avoids calculation overhead
- **Early Exit Logic**: AT SEA rows exit immediately with `NEXT @i`

### Variable Scope
All variables are set **inside the loop** to ensure fresh data per iteration:
- Pending day state persists across iterations (intentional for pairing)
- LEFT/RIGHT data cleared when pair renders
- Prevents data bleed between unrelated pairs

## CTA Configuration

### Primary CTA: "BOOK NOW"
- **Color**: Orange (`#e87435`)
- **Visibility**: Shown in both BOOKED and UNBOOKED states (below state indicator)
- **URL**: Placeholder tracking link (must be updated with dynamic parameters)

### Secondary CTA: "SEE ALL EXCURSIONS"
- **Location**: Below all day renderings (outside loop)
- **Purpose**: Fallback navigation to full excursion catalog

## Testing Checklist

When testing this component, verify:

- [ ] **Even port count** (2, 4, 6 port days): All pairs render correctly, no FINAL ODD
- [ ] **Odd port count** (3, 5, 7 port days): All pairs render + FINAL ODD for unpaired day
- [ ] **AT SEA filtering**: AT SEA rows never render, port days after AT SEA pair correctly
- [ ] **Booked state**: Dark background, checkmark, image hidden on mobile
- [ ] **Unbooked state**: Gray background, empty circle, "BOOK NOW" button visible
- [ ] **Mixed states**: Different states per day render independently
- [ ] **Mixed with AT SEA**: Port days not lost when surrounded by AT SEA rows
- [ ] **Date calculations**: All dates increment correctly from sail date
- [ ] **Port names**: Country names removed (e.g., "San Juan" not "San Juan, Puerto Rico")
- [ ] **Mobile view**: Images hidden when excursions booked (all columns/layouts)
- [ ] **No port days scenario**: Component gracefully handles zero port days (all AT SEA)
- [ ] **Single port day**: Renders as FINAL ODD after loop

## Maintenance Notes

### Rollback Points
The code includes phase markers for easy rollback:
- `/* ===== BASIC LOOP ===== */` - Initial data query
- `/* ===== 2-COLUMN LAYOUT ===== */` - Loop logic start
- Comments mark PAIR vs FINAL ODD layout blocks

### Common Issues

#### Issue: Loop only renders first port day
**Cause**: AT SEA filtering skipping all rows or pending logic failing  
**Fix**: Verify port names are cleaned and normalized with `Trim(Uppercase())`

#### Issue: Port days are missing/lost
**Cause**: AT SEA rows adjacent to port days causing pending logic to fail  
**Fix**: Check that pending day is properly maintained and next port is correctly paired

#### Issue: Booked state not displaying
**Cause**: `ACTIVE_EXCURSIONS` field format mismatch  
**Fix**: Confirm DE field contains pipe-delimited data or is truly empty (not spaces)

#### Issue: FINAL ODD doesn't render
**Cause**: Pending flag not checked after loop  
**Fix**: Ensure final conditional `IF NOT EMPTY(@PENDING_DAY)` exists after loop ends

#### Issue: AT SEA days rendering
**Cause**: Port name comparison failing due to case or whitespace  
**Fix**: Verify `Trim(Uppercase())` is applied before `!= "AT SEA"` comparison

## Related Documentation

- **SHOREX_AMPSCRIPT_VARIABLES.md** - Complete variable reference
- **SHOREX_DATA_FLOW.md** - System architecture and data flow
- **SHOREX_ampscript.html** - Initialization file (required dependency)

## Future Enhancements (Not Yet Implemented)

- Dynamic image URLs per port (currently hardcoded)
- Onboard credit display integration
- Deep linking to specific excursion booking page per day
- Analytics tracking on CTA clicks
- Accessibility improvements (ARIA labels)
