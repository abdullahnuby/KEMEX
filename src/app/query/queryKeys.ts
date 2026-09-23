/** Shared React Query key factory. Query keys are user-scoped so data cannot bleed between sessions. */
export const kemexQueryKeys = {
  approvalEvents: (userId?: string) => ['approval-events', userId] as const,
  notifications: (userId?: string) => ['notifications', userId] as const,
  attachments: (userId: string | undefined, entityType: string, entityId: string) => ['attachments', userId, entityType, entityId] as const,
  all: ['kemex'] as const,
  bootstrap: (userId: string | undefined) => ['kemex', 'bootstrap', userId] as const,
  assets: (userId: string | undefined) => ['kemex', 'assets', userId] as const,
  projects: (userId: string | undefined) => ['kemex', 'projects', userId] as const,
  maintenance: (userId: string | undefined) => ['kemex', 'maintenance', userId] as const,
  inventory: (userId: string | undefined) => ['kemex', 'inventory', userId] as const,
  operations: (userId: string | undefined) => ['kemex', 'operations', userId] as const,
  trips: (userId: string | undefined) => ['kemex', 'trips', userId] as const,
  finance: (userId: string | undefined) => ['kemex', 'finance', userId] as const,
  settings: (userId: string | undefined) => ['kemex', 'settings', userId] as const,
  modules: {
    all: (userId: string | undefined) => ['kemex', 'modules', userId] as const,
    record: (userId: string | undefined, module: string) => ['kemex', 'modules', userId, module] as const,
  },
} as const
