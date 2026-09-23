# KEMEX v0.45.0 — Engineering Prompt: Unified Enterprise Modal System

## Objective

Repair the modal architecture globally. A modal must be a true application-level overlay, never a visual child of the page and never visually trapped below the sticky top navbar.

## Non-negotiable rules

1. The top navbar remains visible in normal navigation and must never be duplicated.
2. When a modal opens, its backdrop MUST cover the entire viewport, including the navbar.
3. Modal stacking level must be higher than the navbar and any dropdown layers.
4. Modal header, scrollable content, and action footer must form one self-contained surface.
5. Long forms scroll inside the modal body only.
6. Footer actions remain visible and do not scroll away.
7. Modal buttons and icons must remain on one line.
8. Desktop modals use a centered enterprise dialog; mobile uses a bottom-sheet/full-height adaptive surface.
9. Do not change business logic, database contracts, routes, permissions, or save behavior.
10. Reuse the same modal contract for Transport, Cost, Downtime, user forms, warehouse forms, signature dialogs, and confirmations.

## Visual contract

- Neutral slate backdrop with blur.
- White surface, restrained border, soft enterprise shadow.
- Compact accent line at the top.
- Clear single title and one supporting sentence.
- Context strip only where it adds useful context; never repeat page titles.
- Form fields grouped by meaning into compact sections.
- Footer separated by a border and visually stable.

## UX contract

- Escape should close when the current modal is not busy.
- Backdrop click should close only when safe.
- Focus must remain usable inside the dialog.
- Modal content must not cause document-level horizontal overflow.
- On small screens, controls stack to a single column.

## Verification

Run:

```bash
npm ci
npm run typecheck
npm run build
```

Then visually verify:

- navbar is fully covered by the backdrop;
- no content leaks behind the dialog;
- header/body/footer scroll behavior is correct;
- all modal buttons remain single-line;
- mobile modal is usable.
