import type { DataMode, Repository } from '../core/repository/types'
import { LocalStorageRepository } from './localRepository'
import { TfmsRepository } from './repository'

const requestedMode = (import.meta.env.VITE_DATA_MODE ?? 'supabase').trim().toLowerCase()
const mode: DataMode = requestedMode === 'local' ? 'local' : 'supabase'

/** Selects the data adapter without changing feature-level repository calls. */
export function createRepository(): Repository {
  return mode === 'local' ? new LocalStorageRepository() : new TfmsRepository()
}

export const repository: Repository = createRepository()
