# KEMEX Printing System — Final Phase 0 Update

## Implemented
- Central administrator-controlled print template stored in `organization_settings.print_settings`.
- Optional master switch: `applyGlobalTemplate`.
- Company logo slot is separate from the KEMEX application logo; default logo is empty.
- Company logo upload from Settings with client-side optimization for raster images.
- Logo, company name, group, address/contact visibility options.
- Corporate/minimal/clean layout styles.
- Alexandria/Tajawal/system font selection.
- A4/Letter, automatic/portrait/landscape, configurable margins and table density.
- Optional document metadata, header rule, footer, page numbers and tiny application name at lower-left.
- Repeated signatures on every page by default, with configurable signature labels and height.
- Preview panel in Settings so the administrator can see the expected report layout before saving.
- Table print CSS hardened against horizontal clipping and text overflow; table headers repeat on subsequent pages.
- Print runtime reserves page-bottom space for repeated signatures so they do not become a separate page.
- Existing pages that call `PrintableDocument` consume the centralized settings automatically.
- Migration `031_print_settings_layout.sql` upgrades existing JSONB print settings without requiring a new table.

## Verification
- Changed TSX files were parsed successfully with the repository TypeScript compiler API.
- Full `npm run build` could not be completed in this environment because the pre-existing `node_modules/@types/react` and `@types/react-dom` folders are incomplete and `npm ci` timed out while reinstalling dependencies.
