import "./AccountsPreview.css";
import { useTranslation } from "react-i18next";
import {
  useActiveCustodyAccount,
  MAIN_ACCOUNT_UUID,
  NWC_ACCOUNT_UUID,
} from "../../../contexts/activeAccount";
import WidgetCard from "./WidgetCard";
import AccountCard from "./stubs/AccountCard";

export default function AccountsPreview({
  pinnedAccountUUIDs,
  isUsingNostr,
  selectedAltAccount,
  isSwitchingAccount,
  onAccountPress,
  onAccountEdit,
  onViewAll,
}) {
  const { t } = useTranslation();
  const { custodyAccountsList, activeAccount } = useActiveCustodyAccount();
  const accountList = custodyAccountsList || [];
  const displayAccounts = getDisplayAccounts(
    accountList,
    pinnedAccountUUIDs,
    isUsingNostr,
    selectedAltAccount?.[0],
    activeAccount,
  );
  const hasMoreAccounts = accountList.length > displayAccounts.length;

  return (
    <WidgetCard onPress={onViewAll}>
      <div className="accounts-preview__header">
        <span className="accounts-preview__title">
          {t("settings.hub.accounts")}
        </span>
        <span className="accounts-preview__view-all">
          {t("settings.hub.viewAll")}
        </span>
      </div>

      <div>
        {displayAccounts.map((account, index) => (
          <AccountCard
            key={account.uuid || `account-${index}`}
            account={account}
            isActive={activeAccount?.uuid === account.uuid}
            onPress={() => onAccountPress(account)}
            onEdit={() => onAccountEdit(account)}
            isLoading={
              isSwitchingAccount?.accountBeingLoaded ===
                (account.uuid || account.name) &&
              isSwitchingAccount?.isLoading
            }
          />
        ))}
      </div>

      {hasMoreAccounts && (
        <span className="accounts-preview__more">
          {t("settings.hub.morePoolsCount", {
            count: accountList.length - displayAccounts.length,
          })}
        </span>
      )}
    </WidgetCard>
  );
}

function getDisplayAccounts(
  accounts,
  pinnedAccountUUIDs,
  isUsingNostr,
  activeAltAccount,
) {
  if (!accounts?.length) return [];

  const mainAccount = accounts.find((a) => a.uuid === MAIN_ACCOUNT_UUID);

  const activeAccount =
    accounts.find((account) => {
      const isMain = account.uuid === MAIN_ACCOUNT_UUID;
      const isNWC = account.uuid === NWC_ACCOUNT_UUID;
      if (isNWC) return isUsingNostr;
      if (isMain) return !activeAltAccount && !isUsingNostr;
      return activeAltAccount?.uuid === account.uuid;
    }) ||
    mainAccount ||
    accounts[0];

  const result = [];
  const used = new Set();

  const add = (account) => {
    if (!account || used.has(account.uuid)) return;
    used.add(account.uuid);
    result.push(account);
  };

  add(mainAccount);
  if (activeAccount?.uuid !== MAIN_ACCOUNT_UUID) add(activeAccount);

  if (pinnedAccountUUIDs?.length) {
    pinnedAccountUUIDs
      .map((uuid) => accounts.find((a) => (a.uuid || a.name) === uuid))
      .filter(Boolean)
      .forEach(add);
  } else {
    accounts.forEach(add);
  }

  return result.slice(0, 3);
}
