import { useQueries } from '@tanstack/react-query'
import { repository } from '../../../services/repositoryFactory'
import type { AssetCostEntry, AssetCostSummary, AssetDocument, AssetFinancialSummary, AuditEntry } from '../../../types/tfms'

export interface AssetDetailData {
  documents: AssetDocument[]
  costs: AssetCostEntry[]
  cost30d: AssetCostSummary | null
  financial: AssetFinancialSummary | null
  audit: AuditEntry[]
}

/** Loads the asset's non-bootstrap details independently so the main application query stays lightweight. */
export function useAssetDetailData(assetId: string | undefined) {
  const enabled = Boolean(assetId)
  const results = useQueries({
    queries: [
      { queryKey: ['kemex','asset',assetId,'documents'], enabled, queryFn: () => repository.listAssetDocuments(assetId as string) },
      { queryKey: ['kemex','asset',assetId,'costEntries'], enabled, queryFn: () => repository.listAssetCostEntries(assetId as string) },
      { queryKey: ['kemex','asset',assetId,'cost30d'], enabled, queryFn: () => repository.getAssetCost30d(assetId as string) },
      { queryKey: ['kemex','asset',assetId,'financial'], enabled, queryFn: () => repository.getAssetFinancialSummary(assetId as string) },
      { queryKey: ['kemex','asset',assetId,'audit'], enabled, queryFn: () => repository.listAssetAudit(assetId as string) },
    ],
  })

  const [documents, costs, cost30d, financial, audit] = results
  return {
    data: {
      documents: documents.data ?? [],
      costs: costs.data ?? [],
      cost30d: cost30d.data ?? null,
      financial: financial.data ?? null,
      audit: audit.data ?? [],
    } satisfies AssetDetailData,
    isLoading: results.some(result => result.isPending),
    failures: results.filter(result => result.isError).map(result => result.error instanceof Error ? result.error.message : 'تعذر تحميل بيانات الأصل.'),
    refetch: async () => { await Promise.all(results.map(result => result.refetch())) },
  }
}
