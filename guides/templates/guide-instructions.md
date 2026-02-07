# Guide Creation Instructions

Use this document when creating new guides for the Guides Hub.

## Project Context

This is a local HTML-based documentation hub for personal guides. It's designed for someone with ADHD who needs reliable documentation for tasks done periodically.

**Location:** `/home/skarlis/Apps/guides/`

## File Structure

```
~/Apps/guides/
├── index.html                    # Homepage (sitemap)
├── css/
│   ├── hub.css                   # Homepage styles
│   └── guide.css                 # Guide page styles
├── js/
│   ├── nav.js                    # Sidebar navigation
│   └── search.js                 # Search functionality
├── data/
│   └── guides.json               # Navigation data (MUST UPDATE)
├── templates/
│   └── guide-instructions.md     # This file
└── guides/
    ├── apps/                     # App installation & use
    ├── github/                   # Github guides
    ├── linux/                    # Linux help
    └── webdev/                   # Web development
```

## Creating a New Guide

### Step 1: Create the Guide Files

1. Create a folder for your guide in the appropriate category:
   ```
   guides/<category>/<guide-name>/
   ```

2. Create `index.html` (and additional pages if needed)

### Step 2: Update the navigation data

Add your guide to **all three** locations (they must stay in sync):
- `js/data.js` - used by guide pages for sidebar navigation
- `index.html` - embedded in the homepage (search the file for `guides-data`)
- `data/guides.json` - for reference/backup

**Single-page guide:**
```json
{
  "id": "my-guide",
  "label": "My Guide Title",
  "href": "guides/category/my-guide/index.html",
  "description": "Brief description for search"
}
```

**Multi-page guide:**
```json
{
  "id": "my-guide",
  "label": "My Guide Title",
  "href": "guides/category/my-guide/index.html",
  "description": "Brief description for search",
  "children": [
    { "label": "Overview", "href": "guides/category/my-guide/index.html" },
    { "label": "Setup", "href": "guides/category/my-guide/setup.html" },
    { "label": "Usage", "href": "guides/category/my-guide/usage.html" }
  ]
}
```

## HTML Template

Use this template for new guide pages:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAGE TITLE | Guides Hub</title>
  <link rel="icon" type="image/png" href="../../../guide-icon-64.png">
  <link rel="stylesheet" href="../../../css/guide.css">
</head>
<body>
  <div class="guide-layout">
    <!-- Mobile sidebar toggle -->
    <button class="sidebar-toggle" aria-label="Toggle navigation" aria-expanded="false">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
    </button>
    <div class="sidebar-overlay"></div>

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <a href="../../../index.html" class="sidebar-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Guides Hub
        </a>
      </div>
      <nav class="sidebar-nav" aria-label="Guide navigation">
        <!-- Navigation populated by nav.js -->
      </nav>
    </aside>

    <!-- Main content -->
    <main class="guide-main">
      <article class="guide-content">
        <!-- Breadcrumbs -->
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="../../../index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">Guide Title</span>
        </nav>

        <h1 class="guide-title">Guide Title</h1>
        <p class="guide-description">Brief description of the guide</p>

        <!-- Your content here -->

        <h2>Section Heading</h2>
        <p>Content...</p>

      </article>
    </main>
  </div>

  <script src="../../../js/data.js"></script>
  <script src="../../../js/nav.js"></script>
</body>
</html>
```

**Important:** Adjust the relative paths (`../../../`) based on how deep your guide is in the folder structure.

## Common CSS Classes

### Layout
- `.guide-layout` - Main layout container
- `.guide-content` - Content area wrapper
- `.breadcrumbs` - Breadcrumb navigation

### Typography
- `.guide-title` - Main page title (h1)
- `.guide-description` - Subtitle/description below title
- `h2`, `h3`, `h4` - Section headings

### Callouts
```html
<div class="callout callout-tip">
  <div class="callout-title">Tip</div>
  <p>Helpful tip text</p>
</div>

<div class="callout callout-info">
  <div class="callout-title">Note</div>
  <p>Information text</p>
</div>

<div class="callout callout-warning">
  <div class="callout-title">Warning</div>
  <p>Warning text</p>
</div>
```

### Quick Reference Box
```html
<div class="quick-reference">
  <div class="quick-reference-title">Quick Reference</div>
  <table>
    <thead><tr><th>Task</th><th>Command</th></tr></thead>
    <tbody>
      <tr><td>Do something</td><td><code>command here</code></td></tr>
    </tbody>
  </table>
</div>
```

### Steps
```html
<ol class="steps">
  <li class="step">
    <div class="step-title">Step title</div>
    <p>Step description</p>
  </li>
</ol>
```

### Page Navigation
```html
<nav class="page-nav">
  <a href="previous.html" class="page-nav-link prev">
    <span class="page-nav-label">Previous</span>
    <span class="page-nav-title">Previous Page</span>
  </a>
  <a href="next.html" class="page-nav-link next">
    <span class="page-nav-label">Next</span>
    <span class="page-nav-title">Next Page</span>
  </a>
</nav>
```

### Code
- Inline: `<code>command</code>`
- Block: `<pre><code>multi-line code</code></pre>`

## Style Guidelines

### Colors (STRICT)
Use only these accent colors:
- Teal: `#3d7a7a`
- Blue: `#5b7fb5`
- Purple: `#8b7aaa`
- Plum: `#9a6a8a`
- Rose: `#a56a7a`
- Sage: `#6a9a8a`

**DO NOT USE:** Orange, yellow, gold, warm tones, neon colors, corporate blues

### Other Rules
- NO EMOJIS - use icons (SVG) if needed
- Dark mode only
- Use relative paths for portability
- Keep it ADHD-friendly: clear navigation, logical organization, not overwhelming

### Writing Style
- Be concise and direct
- Use bullet points and tables for quick reference
- Include "Quick Start" or "Quick Reference" sections at the top of complex guides
- Break multi-step processes into numbered steps
