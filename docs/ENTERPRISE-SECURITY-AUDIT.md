# KEMEX — Enterprise Security / RBAC Hardening

## Scope

Phase following Schema Recovery and Domain Integrity Hardening. This phase addresses role boundaries, action-level UI authorization, and audit-log integrity.

## Changes

- Added explicit action helpers for delete, approve, export, user management, and audit visibility.
- Module record workflows now distinguish ordinary editing from approval/rejection/PO actions.
- Delete controls are hidden unless the current role is explicitly allowed to delete the module.
- User profile editing/creation is restricted to `admin` in the UI, matching database RLS.
- Audit export remains available to roles that can read the audit log.
- Added `020_rbac_audit_hardening.sql`:
  - validates the role vocabulary on `profiles`;
  - makes `audit_log` append-only through the Data API;
  - prevents direct client inserts/updates/deletes on audit rows;
  - keeps profile writes protected by admin-only RLS;
  - adds investigation indexes for audit and role/activity queries.

## Security boundary

Frontend permission checks are UX controls only. Supabase RLS and trusted database functions remain the authoritative security boundary.

## Remaining work

1. Replace remaining hard-coded role checks in individual pages with the central permission matrix.
2. Add automated RLS tests for every critical module and every role.
3. Introduce explicit database action policies/RPCs for approval operations where a workflow requires stronger than generic write access.
4. Add an immutable audit verification strategy for production retention/compliance requirements.
