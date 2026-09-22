import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  breakdownEventsService,
  transportsService,
  costItemsService,
  downtimeService,
  trueCostService,
} from '../services/breakdownService';
import type {
  BreakdownEventInsert,
  BreakdownEventUpdate,
  MaintenanceTransportInsert,
  MaintenanceCostItemInsert,
  DowntimeTrackingInsert,
  BreakdownStatus,
} from '../types/breakdown';

// =====================================================================
// Query Keys
// =====================================================================
export const breakdownKeys = {
  all: ['breakdowns'] as const,
  lists: () => [...breakdownKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...breakdownKeys.lists(), filters] as const,
  detail: (id: string) => [...breakdownKeys.all, 'detail', id] as const,
  transports: (id: string) => [...breakdownKeys.detail(id), 'transports'] as const,
  costItems: (id: string) => [...breakdownKeys.detail(id), 'costItems'] as const,
  downtime: (id: string) => [...breakdownKeys.detail(id), 'downtime'] as const,
  trueCost: (filters?: Record<string, unknown>) => ['trueCost', 'report', filters] as const,
};

// =====================================================================
// Breakdown Events
// =====================================================================
export function useBreakdownList(filters?: {
  assetId?: string;
  status?: BreakdownStatus;
  severity?: string;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({
    queryKey: breakdownKeys.list(filters),
    queryFn: () => breakdownEventsService.list(filters),
    staleTime: 30_000,
  });
}

export function useBreakdownDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? breakdownKeys.detail(id) : ['breakdowns', 'detail', 'none'],
    queryFn: () => breakdownEventsService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BreakdownEventInsert) =>
      breakdownEventsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.lists() });
      qc.invalidateQueries({ queryKey: ['kemex', 'bootstrap'] });
    },
  });
}

export function useUpdateBreakdown(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BreakdownEventUpdate) =>
      breakdownEventsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(id) });
      qc.invalidateQueries({ queryKey: breakdownKeys.lists() });
    },
  });
}

export function useUpdateBreakdownStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: BreakdownStatus) =>
      breakdownEventsService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(id) });
      qc.invalidateQueries({ queryKey: breakdownKeys.lists() });
    },
  });
}

export function useCloseBreakdown(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recoveryDatetime: string) =>
      breakdownEventsService.close(id, recoveryDatetime),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(id) });
      qc.invalidateQueries({ queryKey: breakdownKeys.lists() });
      qc.invalidateQueries({ queryKey: ['kemex', 'bootstrap'] });
    },
  });
}

export function useDeleteBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => breakdownEventsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.lists() });
      qc.invalidateQueries({ queryKey: ['kemex', 'bootstrap'] });
    },
  });
}

// =====================================================================
// Transports
// =====================================================================
export function useTransports(breakdownEventId: string | undefined) {
  return useQuery({
    queryKey: breakdownEventId
      ? breakdownKeys.transports(breakdownEventId)
      : ['transports', 'none'],
    queryFn: () => transportsService.listByBreakdown(breakdownEventId!),
    enabled: !!breakdownEventId,
  });
}

export function useCreateTransport(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceTransportInsert) =>
      transportsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.transports(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

export function useDeleteTransport(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transportsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.transports(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

// =====================================================================
// Cost Items
// =====================================================================
export function useCostItems(breakdownEventId: string | undefined) {
  return useQuery({
    queryKey: breakdownEventId
      ? breakdownKeys.costItems(breakdownEventId)
      : ['costItems', 'none'],
    queryFn: () => costItemsService.listByBreakdown(breakdownEventId!),
    enabled: !!breakdownEventId,
  });
}

export function useCreateCostItem(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceCostItemInsert) =>
      costItemsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.costItems(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

export function useUpdateCostItem(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MaintenanceCostItemInsert> }) =>
      costItemsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.costItems(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

export function useDeleteCostItem(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => costItemsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.costItems(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

// =====================================================================
// Downtime
// =====================================================================
export function useDowntime(breakdownEventId: string | undefined) {
  return useQuery({
    queryKey: breakdownEventId
      ? breakdownKeys.downtime(breakdownEventId)
      : ['downtime', 'none'],
    queryFn: () => downtimeService.listByBreakdown(breakdownEventId!),
    enabled: !!breakdownEventId,
  });
}

export function useCreateDowntime(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DowntimeTrackingInsert) =>
      downtimeService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.downtime(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

export function useCloseDowntime(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, endDatetime }: { id: string; endDatetime: string }) =>
      downtimeService.close(id, endDatetime),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.downtime(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

export function useDeleteDowntime(breakdownEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => downtimeService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: breakdownKeys.downtime(breakdownEventId) });
      qc.invalidateQueries({ queryKey: breakdownKeys.detail(breakdownEventId) });
    },
  });
}

// =====================================================================
// True Cost Report
// =====================================================================
export function useTrueCostReport(filters?: { fromDate?: string; toDate?: string }) {
  return useQuery({
    queryKey: breakdownKeys.trueCost(filters),
    queryFn: () => trueCostService.getReport(filters),
    staleTime: 60_000,
  });
}