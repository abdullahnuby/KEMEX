# KEMEX v0.48.0 — Enterprise Security Hardening

- RBAC action-level helpers added.
- Workflow approval/rejection actions now respect centralized approval permissions in the generic records UI.
- Delete controls are role-gated.
- User management UI uses centralized admin capability.
- Added database migration `020_rbac_audit_hardening.sql`.
- Audit log is explicitly append-only for authenticated Data API clients.
- Profile role vocabulary is constrained at database level.
- Added security audit documentation.

Validation:
- Source integrity: PASS
- Frontend source test: PASS
- TypeScript build: not executed successfully in this environment because installed React type packages are incomplete and the environment is Node 22 while the project declares Node >=24.
