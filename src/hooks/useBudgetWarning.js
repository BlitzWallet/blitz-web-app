import { useGlobalContextProvider } from "../contexts/masterInfoObject";
import { useAnalytics } from "../contexts/analyticsContext";

const NEAR_BUDGET_LIMIT = 0.8;
const OVER_BUDGET_LIMIT = 1.0;

export function computeBudgetWarning(budget, spentTotal) {
  try {
    if (!budget || !budget.amount || budget.amount <= 0) {
      return { shouldWarn: false, isOverBudget: false, spentPercent: 0, leftToSpend: 0 };
    }
    const budgetAmount = budget.amount;
    const spentPercent = spentTotal / budgetAmount;
    const leftToSpend = Math.max(budgetAmount - spentTotal, 0);
    const shouldWarn = spentPercent >= NEAR_BUDGET_LIMIT;
    const isOverBudget = spentPercent >= OVER_BUDGET_LIMIT;
    return { shouldWarn, isOverBudget, spentPercent, leftToSpend };
  } catch (err) {
    return { shouldWarn: false, isOverBudget: false, spentPercent: 0, leftToSpend: 0 };
  }
}

export function useBudgetWarning(sendingAmount = 0) {
  const { masterInfoObject } = useGlobalContextProvider();
  const { spentTotal } = useAnalytics();
  const budget = masterInfoObject?.monthlyBudget ?? null;
  return computeBudgetWarning(budget, spentTotal + sendingAmount);
}
