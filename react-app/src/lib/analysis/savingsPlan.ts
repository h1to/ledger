import type { PlannerState } from '../../types';
import { runwayMonths, savingsRate } from '../metrics';
import { goalSaved, goalNeededPerMonth } from '../money';
import { nowKey, keyYear } from '../dates';

/** Deterministic savings / emergency-fund / goal-pacing analysis (exact figures for the advisor). */

export type EmergencyStatus = 'unknown' | 'none' | 'building' | 'ok' | 'strong';

export interface GoalPacing {
  id: string;
  name: string;
  target: number;
  saved: number;
  pctToTarget: number; // 0..1
  neededPerMonth: number | null; // null when the goal has no deadline
  contributingThisMonth: number;
  onTrack: boolean | null; // null when there's no deadline to judge against
}

export interface SavingsInsight {
  runway: number | null; // months of liquid runway
  runwayTargetMin: number; // 3
  runwayTargetMax: number; // 6
  emergencyStatus: EmergencyStatus;
  savingsRate: number | null; // this year's saved / income
  savingsRateTarget: number; // 0.20
  savingsRateOnTrack: boolean | null;
  goals: GoalPacing[];
}

const RUNWAY_MIN = 3;
const RUNWAY_MAX = 6;
const RATE_TARGET = 0.2;

function emergencyStatus(runway: number | null): EmergencyStatus {
  if (runway == null) return 'unknown';
  if (runway < 1) return 'none';
  if (runway < RUNWAY_MIN) return 'building';
  if (runway < RUNWAY_MAX) return 'ok';
  return 'strong';
}

export function computeSavingsInsight(state: PlannerState): SavingsInsight {
  const cur = nowKey();
  const runway = runwayMonths(state);
  const rate = savingsRate(state, keyYear(cur));

  const goals: GoalPacing[] = state.goals.map((g) => {
    const saved = goalSaved(g);
    const needed = goalNeededPerMonth(g);
    const contributingThisMonth = Number(g.contribs[cur]) || 0;
    return {
      id: g.id,
      name: g.name,
      target: g.target,
      saved,
      pctToTarget: g.target > 0 ? Math.min(1, saved / g.target) : 0,
      neededPerMonth: needed,
      contributingThisMonth,
      onTrack: needed == null ? null : contributingThisMonth + 1e-6 >= needed,
    };
  });

  return {
    runway,
    runwayTargetMin: RUNWAY_MIN,
    runwayTargetMax: RUNWAY_MAX,
    emergencyStatus: emergencyStatus(runway),
    savingsRate: rate,
    savingsRateTarget: RATE_TARGET,
    savingsRateOnTrack: rate == null ? null : rate >= RATE_TARGET,
    goals,
  };
}
