# KEMEX Hero RTL / spacing fix

This patch adds a final visual layer for the Dashboard hero:
- explicit RTL grid: compact copy on the right, dominant live data preview on the left
- smaller typography with controlled line-height and spacing
- fixed desktop hero height
- internal preview direction and alignment normalized
- mobile title remains in one line

Files:
- src/pages/DashboardPage.tsx
- src/styles/dashboard-hero-rtl.css
