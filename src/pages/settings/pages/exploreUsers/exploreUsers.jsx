import { useEffect, useMemo, useState } from "react";
import Chart from "react-google-charts";
import {
  BLITZ_GOAL_USER_COUNT,
  INSET_WINDOW_WIDTH,
} from "../../../../constants";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { findLargestByVisualWidth } from "../../../../functions/explore/largestNumber";
import ThemeText from "../../../../components/themeText/themeText";
import DateCountdown from "./componenets/dateCountdown";
import formatBalanceAmount from "../../../../functions/formatNumber";
import "./exploreUsers.css";
import NoDataView from "./componenets/noDataView";
import "./exploreUsers.css";
import { Colors } from "../../../../constants/theme";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useKeysContext } from "../../../../contexts/keysContext";
import { useTranslation } from "react-i18next";
import Storage from "../../../../functions/localStorage";
import { shouldLoadExploreData } from "../../../../functions/initializeUserSettingsHelpers";
import fetchBackend from "../../../../../db/handleBackend";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";
import { useServerTimeOnly } from "../../../../contexts/serverTime";
import {
  DAY_IN_MILLS,
  MONTH_GROUPING,
  MONTH_IN_MILLS,
  WEEK_IN_MILLS,
  WEEK_OPTIONS,
  YEAR_IN_MILLS,
} from "../../../../functions/explore/constants";

export default function ExploreUsers() {
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const [timeFrame, setTimeFrame] = useState("day");
  const [isLoading, setIsLoading] = useState(true);
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { backgroundOffset, textColor, backgroundColor } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();
  const { t } = useTranslation();
  const [targetUserCountBarWidth, setTargetUserCountBarWidth] = useState(0);
  const [yAxisWidth, setYAxisWidth] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);
  const getServerTime = useServerTimeOnly();
  const currentTime = getServerTime();

  const dataObject = masterInfoObject.exploreData
    ? JSON.parse(JSON.stringify(masterInfoObject.exploreData))
    : false;
  const data = dataObject ? dataObject[timeFrame].reverse() : [];

  const min = data.reduce(
    (prev, current) => (current?.value < prev ? current.value : prev),
    BLITZ_GOAL_USER_COUNT
  );

  const max = data.reduce(
    (prev, current) => (current?.value > prev ? current.value : prev),
    0
  );

  const totalYesterday = masterInfoObject.exploreData?.["day"]?.[1]?.value || 0;

  const largestNumber = useMemo(
    () =>
      findLargestByVisualWidth(
        Math.round(min * 0.95),
        Math.round(max * 1.05),
        7
      ),
    [min, max]
  );

  const getChartData = () => {
    const headers = ["Time", "Users"];
    console.log(data);
    const rows = data.map((item, index) => {
      let label;
      const now = currentTime;
      if (timeFrame === "year") {
        label = `${new Date(
          now - YEAR_IN_MILLS * Math.abs(6 - index)
        ).getFullYear()}`;
      } else if (timeFrame === "month") {
        const dateIndex = new Date(
          now - MONTH_IN_MILLS * Math.abs(6 - index)
        ).getMonth();
        label = t(`months.${MONTH_GROUPING[dateIndex]}`).slice(0, 3);
      } else if (timeFrame === "day") {
        const now = currentTime - DAY_IN_MILLS;
        const dateIndex = new Date(
          now - DAY_IN_MILLS * Math.abs(7 - index)
        ).getDay();
        label = t(`weekdays.${WEEK_OPTIONS[dateIndex]}`).slice(0, 3);
      } else {
        const now = new Date(currentTime);
        const todayDay = now.getDay();
        const daysToSunday = 7 - (todayDay === 0 ? 7 : todayDay);
        const endOfWeek = new Date(now.getTime() + daysToSunday * DAY_IN_MILLS);
        const dateIndex = new Date(
          endOfWeek - WEEK_IN_MILLS * Math.abs(6 - index)
        );
        const day = dateIndex.getDate();
        const month = dateIndex.getMonth() + 1;
        label = `${month}/${day}`;
      }
      return [label, item.value];
    });
    console.log([headers, ...rows]);
    return [headers, ...rows];
  };
  const timeFrameElements = useMemo(() => {
    return ["day", "week", "month", "year"].map((item) => (
      <button
        key={item}
        onClick={() => setTimeFrame(item)}
        style={{
          backgroundColor:
            item === timeFrame
              ? theme && darkModeType
                ? Colors.dark.text
                : Colors.light.blue
              : "transparent",
          color:
            item === timeFrame
              ? theme && darkModeType
                ? Colors.light.text
                : Colors.dark.text
              : textColor,

          borderColor:
            theme && darkModeType ? Colors.dark.text : Colors.light.blue,
        }}
      >
        {t(`constants.${item}`)}
      </button>
    ));
  }, [timeFrame, theme, darkModeType, t]);

  useEffect(() => {
    async function loadExploreData() {
      try {
        if (masterInfoObject.exploreData) return;
        const pastExploreData = Storage.getItem("savedExploreData");

        const shouldLoadExporeDataResp = shouldLoadExploreData(pastExploreData);

        if (!shouldLoadExporeDataResp) {
          toggleMasterInfoObject({ exploreData: pastExploreData.data });
          throw new Error("Blocking call since data is up to date");
        }

        const freshExploreData = await fetchBackend(
          "getTotalUserCount",
          { data: publicKey },
          contactsPrivateKey,
          publicKey
        );

        if (freshExploreData) {
          toggleMasterInfoObject({ exploreData: freshExploreData });
          Storage.setItem("savedExploreData", {
            lastUpdated: new Date().getTime(),
            data: freshExploreData,
          });
        }
      } catch (err) {
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadExploreData();
  }, []);

  if (isLoading) {
    return <FullLoadingScreen />;
  }

  if (
    !masterInfoObject.exploreData ||
    !Object.keys(masterInfoObject.exploreData).length
  ) {
    return <NoDataView />;
  }
  return (
    <div className="exploreUsersContainer">
      <div
        style={{ backgroundColor: backgroundOffset }}
        className="downloadsContainer"
      >
        <ThemeText
          className={"downloadsContainerHeader"}
          textContent={t("screens.inAccount.explorePage.title")}
        />
        <ThemeText
          className={"todayText"}
          styles={{ marginBottom: 5 }}
          textContent={t("constants.today")}
        />
        <div className="donwloadsRow">
          <DateCountdown getServerTime={getServerTime} />
          <ThemeText
            textContent={`${formatBalanceAmount(max)} of ${formatBalanceAmount(
              BLITZ_GOAL_USER_COUNT
            )} (${((max / BLITZ_GOAL_USER_COUNT) * 100).toFixed(4)}%)`}
          />
        </div>
        <div
          style={{ backgroundColor: Colors.light.background }}
          className="downloadsPercentBar"
          ref={(el) => el && setTargetUserCountBarWidth(el.offsetWidth)}
        >
          <div
            className={`dowloadsBarFill`}
            style={{
              width: `${(max / BLITZ_GOAL_USER_COUNT) * 100}%`,
              backgroundColor:
                theme && darkModeType ? Colors.dark.text : Colors.light.blue,
            }}
          />
        </div>
        <div className="donwloadsRow">
          <ThemeText
            textStyles={{ marginTop: 0 }}
            textContent={t("constants.yesterday")}
          />
          <ThemeText
            textContent={`${formatBalanceAmount(
              totalYesterday
            )} of ${formatBalanceAmount(BLITZ_GOAL_USER_COUNT)} (${(
              (totalYesterday / BLITZ_GOAL_USER_COUNT) *
              100
            ).toFixed(4)}%)`}
          />
        </div>
      </div>

      <div className="chartContainer">
        <Chart
          data={getChartData()}
          height={"100%"}
          width={"100%"}
          chartType="LineChart"
          options={{
            colors: [
              theme && darkModeType ? Colors.dark.text : Colors.light.blue,
            ],
            pointSize: 5,
            pointShape: "circle",
            tooltip: { trigger: "none" },
            vAxis: {
              textStyle: {
                color:
                  theme && darkModeType ? Colors.dark.text : Colors.light.text,
              },
              ticks: (() => {
                const minVal = Math.round(min * 0.95);
                const maxVal = Math.round(
                  max * (timeFrame !== "day" ? 1.2 : 1.05)
                );
                const step = Math.round((maxVal - minVal) / 5);
                return Array.from({ length: 6 }, (_, i) => minVal + step * i);
              })(),
              viewWindow: {
                min: Math.round(min * 0.95),
                max: Math.round(max * (timeFrame !== "day" ? 1.2 : 1.05)),
              },
            },
            hAxis: {
              textStyle: {
                color:
                  theme && darkModeType ? Colors.dark.text : Colors.light.text,
              },
            },
            chartArea: { left: 50, top: 10, bottom: 30, right: 10 },
            backgroundColor: "transparent",
            legend: "none",
            title: "",
          }}
        />
      </div>
      <div className="timeFrameElementsContainer">{timeFrameElements}</div>
    </div>
  );
}
