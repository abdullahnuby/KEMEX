KEMEX Hero final RTL/alignment fix

Changes:
- Explicitly pins the live dashboard preview to the LEFT on desktop.
- Explicitly pins Arabic marketing copy to the RIGHT.
- Removes flex layout from the H1 so bidi/RTL does not reorder the two phrases.
- H1 is one clean line: "إدارة أذكى .. تشغيل أقوى".
- Compact copy gives the live data preview the larger visual area.
- Mobile stacks copy then preview while keeping the title on one line.
- No Supabase, routing, sidebar, navbar, or business-logic changes.

Upload both files at the same paths.
