# Guides Hub - Project Instructions

This is a local HTML-based documentation hub for personal guides.

## Creating New Guides

When asked to create a guide based on a file in `to-create/`:

1. **Read the template instructions** at `templates/guide-instructions.md` for the HTML template, CSS classes, and style guidelines

2. **Create the guide in the proper location:**
   - Create a new folder: `guides/<category>/<guide-name>/`
   - Create `index.html` (and additional pages if multi-page)
   - Use the template from guide-instructions.md

3. **Update navigation in ALL THREE locations** (they must stay in sync):
   - `js/data.js` - used by guide pages for sidebar navigation
   - `index.html` - embedded JSON in the `<script id="guides-data">` block
   - `data/guides.json` - for reference/backup

4. **Delete the source file from `to-create/`** after the guide is created

## Style Rules

- NO emojis
- Dark mode only
- Use only approved accent colors (teal, blue, purple, plum, rose, sage)
- No orange, yellow, gold, warm tones, or neon colors
- Keep navigation and content ADHD-friendly: clear, logical, not overwhelming

## File Structure

```
guides/
├── apps/           # App installation & use
├── github/         # GitHub-related guides
├── linux/          # Linux help
├── my-apps/        # Custom apps documentation
└── webdev/         # Web development
```
