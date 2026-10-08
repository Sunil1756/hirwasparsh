export type PricingPlanTier = 'free_individual' | 'free_project' | 'pilot_expansion' | 'ngo_starter' | 'professional_mrv' | 'institutional_mrv';

export interface PlanLimits {
  projects: number | 'unlimited';
  trees: number | 'unlimited';
  users: number | 'unlimited';
}

export const PRICING_PLANS: Record<PricingPlanTier, PlanLimits> = {
  free_individual: {
    projects: 'unlimited', // Individuals are free, maybe a soft limit? Let's say unlimited for personal.
    trees: 'unlimited',
    users: 1
  },
  free_project: {
    projects: 1,
    trees: 500,
    users: 3
  },
  pilot_expansion: {
    projects: 2,
    trees: 1000,
    users: 3
  },
  ngo_starter: {
    projects: 5,
    trees: 2500,
    users: 5
  },
  professional_mrv: {
    projects: 15,
    trees: 10000,
    users: 15
  },
  institutional_mrv: {
    projects: 30,
    trees: 25000,
    users: 50 // "Larger team"
  }
};
