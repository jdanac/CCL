# Celebrity Cruises Email Template System

A modular, component-based email template system for Celebrity Cruises shore excursion emails. Built with Nunjucks templating engine for automated component assembly and easy maintenance.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Build System](#build-system)
- [Creating Templates](#creating-templates)
- [Component Reference](#component-reference)
- [CSS Classes & Styling](#css-classes--styling)
- [Responsive Design](#responsive-design)
- [Dark Mode Support](#dark-mode-support)
- [Best Practices](#best-practices)
- [Workflow Examples](#workflow-examples)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

This system solves the manual template maintenance problem by:

- **Single Source of Truth**: Components live once in `/components/`, automatically injected into all templates
- **Automated Assembly**: Nunjucks build script generates final HTML from template sources
- **Scalability**: Add new templates without duplicating components
- **Consistency**: CSS and HTML updates propagate to all templates in one build
- **Email Client Compatibility**: HTML 4.01 Transitional with SFMC (Salesforce Marketing Cloud) support

### Key Technologies

- **HTML**: 4.01 Transitional (max email client compatibility)
- **CSS**: Responsive design with mobile breakpoint at 600px
- **Templating**: Nunjucks (`.njk` files)
- **Build Tool**: Node.js + npm scripts
- **Email Compatibility**: Gmail, Outlook, Apple Mail, SFMC

---

## 📁 Folder Structure

```
CCL/
├── components/                 # Reusable email components (source of truth)
│   ├── styles.css             # Master stylesheet for all emails
│   ├── hero.html              # Full-width hero banner
│   ├── day_banner.html        # Location/day info with activities
│   ├── tour_banner.html       # 2-column image + content layout
│   └── 3_columns.html         # 3-column card layout
│
├── src/
│   └── templates/             # Nunjucks template sources
│       ├── component_showcase.njk  # Full component showcase
│       ├── agent_test.njk          # Test template with all components
│       └── showcase.njk             # Alternative layout
│
├── Test/                       # Auto-generated HTML output (do not edit)
│   ├── component_showcase.html
│   ├── agent_test.html
│   └── showcase.html
│
├── Template/                   # DEPRECATED - old manual templates
│   └── (ignore - replaced by build system)
│
├── scripts/
│   └── build.js               # Build script - assembles templates
│
├── package.json               # npm configuration
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```
   This installs `nunjucks` (templating engine) and `nodemon` (file watcher).

2. **Verify setup by running a build:**
   ```bash
   npm run build
   ```
   You should see output like:
   ```
   🔨 Starting build process...
   
   📋 Found 3 template(s):
   
     ⚙️  Building: component_showcase.njk
     ✅ Output: component_showcase.html (4.82 KB)
   
     ⚙️  Building: agent_test.njk
     ✅ Output: agent_test.html (4.82 KB)
   
     ⚙️  Building: showcase.njk
     ✅ Output: showcase.html (4.65 KB)
   
   ✨ Build complete!
   📁 Output files in: /Users/jorgeacuna/Documents/GitHub/CCL/Test/
   ```

---

## 🔨 Build System

### npm Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Build all templates once |
| `npm run watch` | Auto-rebuild when files change (development mode) |
| `npm run clean` | Delete `/Test/` folder (auto-regenerated on next build) |

### How the Build Script Works

The `scripts/build.js` script:

1. **Discovers** all `.njk` files in `src/templates/`
2. **Reads** each component from `components/` folder
3. **Injects** components into template variables using Nunjucks
4. **Renders** final HTML with all components merged
5. **Outputs** `.html` files to `Test/` folder
6. **Reports** file sizes and status

### Component Variables

When creating templates, use these variables to inject components:

```html
{{ styles }}        <!-- CSS styles (required) -->
{{ hero }}          <!-- Hero banner component -->
{{ dayBanner }}     <!-- Day/location banner -->
{{ tourBanner }}    <!-- 2-column tour layout -->
{{ threeColumns }}  <!-- 3-column card layout -->
```

---

## 📝 Creating Templates

### Step 1: Create Template Source

Create a new file in `src/templates/` with `.njk` extension:

**Example: `src/templates/my_template.njk`**

```html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Celebrity Cruises Email</title>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style type="text/css">
    {{ styles }}
  </style>
</head>

<body bgcolor="#FFFFFF" style="margin: 0; padding: 0;">
  
  <table cellpadding="0" cellspacing="0" border="0" align="center" width="100%">
    <tr>
      <td align="center">
        
        <table cellpadding="0" cellspacing="0" border="0" width="640" class="container" style="margin: 0 auto;">
          <tr>
            <td>
              <!-- Add components in the order you want -->
              {{ hero }}
              {{ threeColumns }}
              {{ dayBanner }}
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
```

### Step 2: Build Templates

```bash
npm run build
```

The script will:
- Create `Test/my_template.html` with all components injected
- Report the file size and status

### Step 3: Test Output

Open the generated HTML file in:
- Email client (Outlook, Apple Mail, Gmail)
- Browser for quick preview
- SFMC preview tool for final validation

### Tips for Template Creation

- **Always include `{{ styles }}`** in a `<style>` tag for CSS
- **Use `.container` class** on main table for responsive width control
- **Reorder components** as needed - same variables work in any order
- **Test on mobile** - open generated HTML on phone to verify responsiveness
- **Use semantic comments** like `<!-- ====== HERO SECTION ====== -->` to mark sections

---

## 🧩 Component Reference

### styles.css
**Purpose:** Master stylesheet for all emails

**Key Classes:**
- `.container` - Fixed 600px width (fluid on mobile)
- `.responsive-td` - Table cell that stacks on mobile
- `.buttonstyles` - Unified button styling (orange, inline-block)
- `.button-cell` - Button container (prevents 100% expansion)
- `.textC` - Center text on mobile
- `.darkModeBG` - Dark mode background support

**File Size:** ~3.2 KB

### hero.html
**Purpose:** Full-width hero banner with linked image

**Structure:**
- Single table with `.container` class
- Responsive image (100% width on mobile, 600px on desktop)
- Image wrapped in `<a>` tag for link tracking

**File Size:** ~0.8 KB

**Use When:** You need a prominent opening banner with image

### day_banner.html
**Purpose:** Location and day information with activities

**Structure:**
- Dark blue background (#002859)
- Left: Day icon + location name
- Right: BOOK NOW CTA button
- Bottom: Activity list with icons

**File Size:** ~1.5 KB

**Use When:** Showing day-specific information with activities

### tour_banner.html
**Purpose:** 2-column layout (image + content)

**Structure:**
- Left column (40%): Image with link
- Right column (60%): Title, duration, description, BOOK NOW button
- Stacks vertically on mobile

**File Size:** ~1.8 KB

**Use When:** Showcasing a single tour with image and details

### 3_columns.html
**Purpose:** 3-column card layout for multiple options

**Structure:**
- Three equal-width columns
- Each: Image (180px) + title + description + BOOK NOW button
- Stacks vertically on mobile
- Buttons maintain fixed width on mobile (not 100%)

**File Size:** ~3.1 KB

**Use When:** Displaying 3 comparable tour options

---

## 🎨 CSS Classes & Styling

### Layout Classes

| Class | Purpose | Desktop | Mobile |
|-------|---------|---------|--------|
| `.container` | Email width control | 600px | 100% |
| `.responsive-td` | Stacking columns | table-cell | block |
| `.button-cell` | Button container | auto | inline-block |

### Text Classes

| Class | Purpose |
|-------|---------|
| `.textC` | Center text on mobile |
| `.mobile-padding-0-20` | Mobile padding utility |

### Button Classes

| Class | Purpose | Style |
|-------|---------|-------|
| `.buttonstyles` | Primary button | Orange (#E87434), inline-block, 10px 30px padding |

### Color Variables

- **Primary Orange:** `#E87434` (CTA buttons)
- **Dark Blue:** `#002859` (day banner background)
- **Text Dark:** `#1a1a1a` (main text)
- **Text Light:** `#666666` (secondary text)
- **Light Gray:** `#f5f5f5` (backgrounds)

---

## 📱 Responsive Design

### Mobile Breakpoint

All responsive behavior triggers at **600px and below**:

```css
@media screen and (max-width: 600px) {
  /* Mobile styles applied here */
}
```

### Key Responsive Behaviors

**Containers:**
- `.container` changes from `width: 600px` to `width: 100%`

**Columns:**
- `.responsive-td` changes from `display: table-cell; width: 33%` to `display: block; width: 100%`
- Results in vertical stacking on mobile

**Buttons:**
- `.buttonstyles` keeps `display: inline-block` (doesn't expand to 100%)
- `.button-cell` explicitly sets `display: inline-block` and `width: auto`
- Buttons centered via `text-align: center` on parent

**Text:**
- `.textC` applies `text-align: center` on mobile

### Testing Responsive Design

1. **Browser DevTools:** Use device emulation (600px viewport)
2. **Mobile Device:** Open generated HTML file on actual phone
3. **Email Preview Tools:** Test in Outlook/Gmail preview
4. **SFMC Preview:** Test in Salesforce Marketing Cloud

---

## 🌙 Dark Mode Support

### How It Works

The system supports dark mode for native email clients:

```css
/* Light mode (default) */
body { background-color: #FFFFFF; color: #1a1a1a; }

/* Dark mode */
@media (prefers-color-scheme: dark) {
  body { background-color: #1a1a1a; color: #FFFFFF; }
}
```

### Gmail Dark Mode

Gmail uses `[data-ogsc]` selector for dark mode:

```css
[data-ogsc] .darkModeBG { background-color: #1a1a1a; }
```

### Testing Dark Mode

- **Apple Mail:** System Preferences → Dark Mode
- **Outlook:** File → Options → Dark Mode
- **Gmail:** Settings → Display density → Suggested (includes dark theme)

---

## ✅ Best Practices

### Component Maintenance

1. **Update components, not templates** - Edit `components/3_columns.html`, not individual template files
2. **Run build after changes** - `npm run build` regenerates all affected templates
3. **Keep components focused** - One component = one logical section
4. **Use semantic HTML** - Stick with HTML 4.01 for maximum compatibility

### Template Creation

1. **Use existing components first** - Combine components before creating new ones
2. **Follow the template pattern** - Use the DOCTYPE and meta tags from existing templates
3. **Comment sections clearly** - Help future developers understand structure
4. **Test on mobile** - Always verify responsive behavior
5. **Use watch mode** - `npm run watch` for live updates during development

### CSS Guidelines

1. **Don't edit styles in generated templates** - Edit `components/styles.css` instead
2. **Use utility classes** - `.container`, `.responsive-td`, etc. are reusable
3. **Test dark mode** - Verify styles in both light and dark modes
4. **Minimize inline styles** - Use CSS classes when possible
5. **Email client testing** - Test in Outlook, Gmail, Apple Mail

### File Organization

1. **Components stay in `components/`** - Never move them
2. **Templates stay in `src/templates/`** - Sources only, no generated files here
3. **Don't edit `/Test/` folder** - It's auto-generated, changes will be lost
4. **Ignore `/Template/` folder** - Legacy templates, being deprecated

---

## 📚 Workflow Examples

### Example 1: Update Button Color Across All Emails

**Goal:** Change primary button color from orange (#E87434) to gold (#FFB81C)

**Steps:**
1. Open `components/styles.css`
2. Find `.buttonstyles` class
3. Change `background-color: #E87434` to `background-color: #FFB81C`
4. Save the file
5. Run `npm run build`
6. All templates in `/Test/` automatically regenerate with new color

**Result:** One edit, all templates updated ✅

### Example 2: Create a Hero-Only Template

**Goal:** Create a simple email with just a hero image and button

**Steps:**
1. Create `src/templates/hero_only.njk` with:
   ```html
   <!DOCTYPE HTML...>
   <!-- Meta tags, styles, etc. -->
   <style type="text/css">
     {{ styles }}
   </style>
   <!-- Body -->
   <table class="container">
     <tr><td>
       {{ hero }}
       <!-- Add button manually or use component -->
     </td></tr>
   </table>
   ```
2. Run `npm run build`
3. View generated `Test/hero_only.html`

**Result:** New template without duplicating any HTML ✅

### Example 3: Add New Component

**Goal:** Create a "testimonials" component and add to all templates

**Steps:**
1. Create `components/testimonials.html` with testimonial HTML
2. Update `scripts/build.js` to add `testimonials: readComponent('testimonials.html')`
3. Update `.njk` templates to include `{{ testimonials }}` in desired location
4. Run `npm run build`
5. All templates regenerate with testimonials

**Result:** Scalable component system ✅

### Example 4: Active Development with Watch Mode

**Goal:** Develop a new template and see live updates

**Steps:**
1. Create new `.njk` template in `src/templates/`
2. In terminal, run `npm run watch`
3. Edit template, save → automatically rebuilds
4. Edit component, save → automatically rebuilds
5. View changes in browser (refresh page)
6. Press Ctrl+C to stop watch mode

**Result:** Instant feedback during development ✅

---

## 🔧 Troubleshooting

### Build Script Errors

**Error:** `Cannot find module 'nunjucks'`
- **Solution:** Run `npm install` to install dependencies

**Error:** `ENOENT: no such file or directory, scandir 'src/templates'`
- **Solution:** Ensure `src/templates/` folder exists with at least one `.njk` file

**Error:** `Component not found: hero.html`
- **Solution:** Verify component file exists in `components/` with correct name

### Template Issues

**Issue:** Variables not rendering (shows `{{ hero }}` in output)
- **Solution:** Check `.njk` file extension and Nunjucks syntax
- Verify variable names match exactly: `{{ hero }}`, `{{ styles }}`, etc.

**Issue:** Missing CSS in generated HTML**
- **Solution:** Ensure `{{ styles }}` is inside `<style type="text/css">` tags
- Verify `components/styles.css` exists

**Issue:** Components rendering but CSS not applied**
- **Solution:** Check that CSS is imported via `{{ styles }}`
- Verify no CSS override in template's inline styles

### Responsive Design Issues

**Issue:** Buttons expand to 100% width on mobile**
- **Solution:** Ensure button uses `.button-cell` wrapper class
- Verify mobile media query includes: `.button-cell { display: inline-block !important; width: auto !important; }`

**Issue:** Columns don't stack on mobile**
- **Solution:** Verify columns use `.responsive-td` class
- Check media query applies `display: block; width: 100%` on mobile

**Issue:** Content not centered on mobile**
- **Solution:** Use `.textC` class for text alignment
- Verify `.container` media query sets `width: 100%`

### Email Client Testing Issues

**Issue:** Styles not rendering in Outlook**
- **Solution:** Outlook requires inline styles; ensure critical styles are both in `<style>` and as inline `style=""` attributes

**Issue:** Dark mode not working**
- **Solution:** Use `@media (prefers-color-scheme: dark)` for native clients
- Use `[data-ogsc]` selector for Gmail dark mode
- Test in actual email client, not browser

**Issue:** Images not displaying**
- **Solution:** Use absolute URLs, not relative paths
- Verify image URLs are publicly accessible
- Check image alt text is present

### General Issues

**Issue:** Slow builds**
- **Solution:** Normal for large components. Optimize component file sizes.

**Issue:** Different output each time**
- **Solution:** Build should be consistent. Check component files aren't changing between builds.

**Issue:** .gitignore not working**
- **Solution:** If `/Test/` folder was already committed, run:
  ```bash
  git rm -r --cached Test
  git commit -m "Remove Test folder from tracking"
  ```

---

## 📞 Support & Questions

For questions about:
- **Component structure:** Review [Component Reference](#component-reference)
- **Build system:** Check [Build System](#build-system) section
- **Responsive design:** See [Responsive Design](#responsive-design) section
- **Specific issues:** See [Troubleshooting](#troubleshooting)

---

## 📄 File Change History

| File | Purpose | Status |
|------|---------|--------|
| `components/styles.css` | Master stylesheet | Active |
| `components/hero.html` | Hero banner | Active |
| `components/day_banner.html` | Day info banner | Active |
| `components/tour_banner.html` | 2-column layout | Active |
| `components/3_columns.html` | 3-column cards | Active |
| `scripts/build.js` | Build automation | Active |
| `src/templates/*.njk` | Template sources | Active |
| `Test/` | Generated output | Auto-generated |
| `Template/` | Legacy templates | Deprecated |

---

**Last Updated:** January 19, 2026  
**Build System Version:** 1.0.0  
**Compatibility:** SFMC, Gmail, Outlook, Apple Mail
