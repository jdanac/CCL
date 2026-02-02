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

### Loop Logic

#### Two-Column Pairing System
The component renders shore excursion days in a **2-column layout** by processing data in pairs:

```
Iteration 1: Days 1 & 2 (LEFT & RIGHT columns)
Iteration 2: Days 3 & 4 (LEFT & RIGHT columns)
Iteration 3: Days 5 & 6 (LEFT & RIGHT columns)
...
```

#### Index Calculation
```ampscript
FOR @pairLoop = 1 TO @rowCount DO
    SET @currentIndex = Add(Multiply(Subtract(@pairLoop, 1), 2), 1)
    // Results: 1, 3, 5, 7, 9...
    SET @rightIndex = Add(@currentIndex, 1)
    // Results: 2, 4, 6, 8, 10...
```

**How it works:**
- `@currentIndex` always points to odd-numbered rows (1, 3, 5, 7...)
- `@rightIndex` always points to even-numbered rows (2, 4, 6, 8...)
- Guard condition `IF @currentIndex <= @rowCount` prevents rendering beyond available data

#### Variable Namespacing
All extracted data uses `@LEFT_` and `@RIGHT_` prefixes to avoid conflicts:
- `@LEFT_ITINERARY_DAY_NBR` vs `@RIGHT_ITINERARY_DAY_NBR`
- `@LEFT_PORT_NAME` vs `@RIGHT_PORT_NAME`
- `@LEFT_HAS_EXCURSIONS` vs `@RIGHT_HAS_EXCURSIONS`

### Conditional Layouts

#### Layout Detection Flag
```ampscript
SET @HAS_RIGHT_DAY = IIF(@rightIndex <= @rowCount, "TRUE", "FALSE")
```

This flag determines which HTML layout to render:

#### PAIR Layout (`@HAS_RIGHT_DAY == "TRUE"`)
Renders when both LEFT and RIGHT days exist (e.g., Days 1-2, 3-4, 5-6)

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

#### FINAL ODD Layout (`@HAS_RIGHT_DAY == "FALSE"`)
Renders when only a LEFT day exists (e.g., Day 7 on a 7-night cruise)

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

### Port Name Cleanup
```ampscript
IF indexOf(@LEFT_PORT_NAME, ",") > 0 THEN
    SET @LEFT_PORT_NAME = Substring(@LEFT_PORT_NAME, 1, Subtract(IndexOf(@LEFT_PORT_NAME, ","), 1))
ENDIF
```

Removes country names from port display:
- Input: `"San Juan, Puerto Rico"`
- Output: `"San Juan"`

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

Divider lines appear **only between PAIR layouts**:
```ampscript
%%[ IF @HAS_RIGHT_DAY == "TRUE" THEN ]%%
<!-- Divider HTML -->
%%[ ENDIF ]%%
```

This prevents an unnecessary divider after the final odd day.

## Example Scenarios

### 4-Night Cruise (Even Days)
```
Loop Iteration 1: Days 1-2 → PAIR LAYOUT → Divider
Loop Iteration 2: Days 3-4 → PAIR LAYOUT → Divider
```

### 5-Night Cruise (Odd Days)
```
Loop Iteration 1: Days 1-2 → PAIR LAYOUT → Divider
Loop Iteration 2: Days 3-4 → PAIR LAYOUT → Divider
Loop Iteration 3: Day 5    → FINAL ODD LAYOUT → NO Divider
```

### 7-Night Cruise with Mixed States
```
Day 1: Nassau        → BOOKED   → Image hidden on mobile
Day 2: Cozumel       → UNBOOKED → "BOOK NOW" button shown
Day 3: Grand Cayman  → BOOKED   → Image hidden on mobile
Day 4: Jamaica       → UNBOOKED → "BOOK NOW" button shown
Day 5: At Sea        → UNBOOKED → Shown if in DE
Day 6: St. Thomas    → BOOKED   → Image hidden on mobile
Day 7: San Juan      → UNBOOKED → FINAL ODD LAYOUT
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
- **Index-Based Access**: Direct row access via `Row(@rows, @index)`
- **Guard Conditions**: Prevents unnecessary iterations
- **No Nested Loops**: Linear time complexity O(n/2)

### Variable Scope
All variables are set **inside the loop** to ensure fresh data per iteration:
- Prevents data bleed between iterations
- Ensures conditional layouts receive correct context
- No variable persistence issues

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

- [ ] **Even day counts** (4, 6, 8 nights): All pairs render correctly
- [ ] **Odd day counts** (5, 7, 9 nights): Final odd layout displays
- [ ] **Booked state**: Dark background, checkmark, image hidden on mobile
- [ ] **Unbooked state**: Gray background, empty circle, "BOOK NOW" button visible
- [ ] **Mixed states**: Different states per day render independently
- [ ] **Date calculations**: All dates increment correctly from sail date
- [ ] **Port names**: Country names removed (e.g., "San Juan" not "San Juan, Puerto Rico")
- [ ] **Dividers**: Appear between pairs, absent after final odd day
- [ ] **Mobile view**: Images hidden when excursions booked (all columns/layouts)
- [ ] **No data scenario**: Component gracefully handles `@rowCount = 0`

## Maintenance Notes

### Rollback Points
The code includes phase markers for easy rollback:
- `/* ===== BASIC LOOP ===== */` - Initial data query
- `/* ===== 2-COLUMN LAYOUT ===== */` - Loop logic start
- Comments mark PAIR vs FINAL ODD layout blocks

### Common Issues

#### Issue: Loop only renders first iteration
**Cause**: `@currentIndex` guard condition failing  
**Fix**: Verify `FOR @pairLoop = 1 TO @rowCount` and index calculation

#### Issue: Booked state not displaying
**Cause**: `ACTIVE_EXCURSIONS` field format mismatch  
**Fix**: Confirm DE field contains pipe-delimited data or is truly empty (not spaces)

#### Issue: Final odd day renders as pair
**Cause**: `@HAS_RIGHT_DAY` flag incorrectly set  
**Fix**: Check `@rightIndex <= @rowCount` logic

#### Issue: Divider appears after last day
**Cause**: Divider not wrapped in `IF @HAS_RIGHT_DAY == "TRUE"` conditional  
**Fix**: Ensure divider is inside conditional block

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
