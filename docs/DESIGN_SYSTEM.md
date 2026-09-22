# KEMEX Design System

The shared UI layer lives under `src/shared/ui`.

## Principles
- Arabic-first RTL layouts.
- Human-readable labels before internal reference codes.
- Semantic status colors: success, info, warning, danger, neutral.
- Data-dense desktop layouts become card-based mobile layouts automatically.
- Loading uses skeletons; empty states are explicit; destructive operations use confirmation modals.
- No component creates mock records or default business transactions.

## Shared primitives
- `PageHeader`
- `CardGrid`
- `DataTable`
- `StatusBadge`
- `DetailTabs`
- `EmptyState`
- `Skeleton`
- `ConfirmModal`
- `ToastProvider` / `useToast`
