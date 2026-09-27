import type { PlannerState } from '../../types';

/** Raw cloud persistence, independent of the reconciliation logic in sync.ts. */
export interface CloudDriver {
  /** Load the full state from the cloud, or null if the cloud has no data for this user. */
  load(userId: string): Promise<{ state: PlannerState; updatedAt: string | null } | null>;
  /** Persist the full state to the cloud. Implementations decide blob vs. row-level diff. */
  save(userId: string, state: PlannerState): Promise<void>;
}
