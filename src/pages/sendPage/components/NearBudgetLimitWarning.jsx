import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import CustomButton from "../../../components/customButton/customButton";
import FormattedSatText from "../../../components/formattedSatText/formattedSatText";
import ThemeText from "../../../components/themeText/themeText";
import { Colors } from "../../../constants/theme";
import { useAnalytics } from "../../../contexts/analyticsContext";
import { useGlobalContextProvider } from "../../../contexts/masterInfoObject";
import { useThemeContext } from "../../../contexts/themeContext";
import useThemeColors from "../../../hooks/useThemeColors";
import "./nearBudgetLimitWarning.css";

function translateWithFallback(t, key, fallback) {
  const value = t(key);
  return !value || value === key ? fallback : value;
}

function computeBudgetWarning(budget, spentTotal) {
  const amount = Number(budget?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      isOverBudget: false,
      leftToSpend: 0,
    };
  }

  return {
    isOverBudget: spentTotal > amount,
    leftToSpend: Math.max(amount - spentTotal, 0),
  };
}

export default function NearBudgetLimitWarning({
  handleBackPressFunction,
  sendingAmount = 0,
}) {
  const { t } = useTranslation();
  const { masterInfoObject } = useGlobalContextProvider();
  const { spentTotal } = useAnalytics();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset } = useThemeColors();

  const budget = masterInfoObject?.monthlyBudget ?? null;
  const { isOverBudget } = computeBudgetWarning(budget, spentTotal);
  const budgetAmount = Number(budget?.amount || 0);

  const willExceedBudget =
    !isOverBudget && budgetAmount > 0 && spentTotal + sendingAmount > budgetAmount;

  const isRed = isOverBudget || willExceedBudget;
  const accentColor =
    theme && darkModeType
      ? Colors.dark.text
      : isRed
        ? Colors.constants.cancelRed
        : Colors.constants.primary;

  const subheader = isOverBudget
    ? translateWithFallback(
        t,
        "analytics.budget.overBudgetWarning",
        "This payment would keep you over your current monthly budget.",
      )
    : willExceedBudget
      ? translateWithFallback(
          t,
          "analytics.budget.willExceedBudgetWarning",
          "This payment would put you over your current monthly budget.",
        )
      : translateWithFallback(
          t,
          "analytics.budget.nearBudgetWarning",
          "This payment would bring you close to your monthly budget.",
        );

  const amountAfterSend = budgetAmount - (spentTotal + sendingAmount);
  const displayAmount = Math.abs(amountAfterSend);
  const amountLabel =
    isOverBudget || willExceedBudget
      ? translateWithFallback(t, "analytics.overBy", "Over by")
      : translateWithFallback(t, "analytics.remaining", "Remaining");

  return (
    <div className="budget-warning-sheet">
      <div className="budget-warning-icon">
        <TriangleAlert color={accentColor} size={40} />
      </div>

      <ThemeText
        className="budget-warning-title"
        textContent={translateWithFallback(
          t,
          "analytics.budget.budgetWarningHeadsUp",
          "Budget warning",
        )}
      />

      <ThemeText className="budget-warning-body" textContent={subheader} />

      <div
        className="budget-warning-amount"
        style={{
          backgroundColor:
            theme && darkModeType ? backgroundColor : backgroundOffset,
        }}
      >
        <ThemeText
          className="budget-warning-label"
          textContent={amountLabel}
        />
        <FormattedSatText
          containerStyles={{ justifyContent: "center" }}
          styles={{ fontSize: "1.8rem", margin: 0 }}
          neverHideBalance={true}
          balance={displayAmount}
        />
      </div>

      <CustomButton
        buttonClassName="budget-warning-continue"
        textContent={translateWithFallback(t, "constants.continue", "Continue")}
        actionFunction={handleBackPressFunction}
      />
    </div>
  );
}
