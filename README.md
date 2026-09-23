# KEMEX — Alexandria Typography Sprint

Applied to the uploaded KEMEX project:
- Added Alexandria via Google Fonts with 400/500/600/700/800 weights.
- Made Alexandria the canonical Arabic UI font with IBM Plex Sans Arabic/Noto Sans Arabic fallbacks.
- Added a final typography layer loaded after legacy CSS.
- Removed the previous font `@import` from `src/index.css` to avoid duplicate remote font loading.
- Normalized headings, body copy, navigation, cards, tables, forms, badges, dashboard metrics, login copy, and mobile typography.
- Removed the very small 8–12px visual scale for normal application text while keeping compact metadata and badges.
