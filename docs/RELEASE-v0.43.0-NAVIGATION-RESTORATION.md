# KEMEX v0.43.0 — Release Notes

This release fixes the v0.42 navigation regression.

### Fixed
1. Restored all child pages in the top-navbar dropdowns.
2. Converted every business-domain item into a dropdown rather than a direct single-page link.
3. Kept Reports as a categorized dropdown.
4. Removed the duplicate report-picker UI from the reports page.
5. Preserved existing routes, page implementations, permissions, repository code, and data flows.
6. Added explicit route entries for the existing Trips Dispatch screen.

### Verification
`tsc --noEmit` passes on the current source.
