import { useMemo, useState } from "react";
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

const DAY_IN_MILLS = 86400000;
const WEEK_IN_MILLS = DAY_IN_MILLS * 7;
const MONTH_IN_MILLS = DAY_IN_MILLS * 30;
const YEAR_IN_MILLS = DAY_IN_MILLS * 365;
const WEEK_OPTIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_GROUPING = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ExploreUsers() {
  const [timeFrame, setTimeFrame] = useState("day");
  const { masterInfoObject } = useGlobalContextProvider();
  console.log(masterInfoObject.exploreData);
  const { theme, darkModeType } = { theme: false, darkModeType: false }; // useGlobalThemeContext();
  //   const { t } = useTranslation();
  const [targetUserCountBarWidth, setTargetUserCountBarWidth] = useState(0);
  const [yAxisWidth, setYAxisWidth] = useState(0);

  const dataObject = JSON.parse(JSON.stringify(masterInfoObject.exploreData));
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
    const rows = data.map((item, index) => {
      let label;
      const now = new Date().getTime();
      if (timeFrame === "year") {
        label = new Date(now - YEAR_IN_MILLS * Math.abs(6 - index))
          .getFullYear()
          .toString();
      } else if (timeFrame === "month") {
        const dateIndex = new Date(
          now - MONTH_IN_MILLS * Math.abs(6 - index)
        ).getMonth();
        label = MONTH_GROUPING[dateIndex].slice(0, 3);
      } else if (timeFrame === "day") {
        const dateIndex = new Date(
          now - DAY_IN_MILLS * Math.abs(7 - index)
        ).getDay();
        label = WEEK_OPTIONS[dateIndex].slice(0, 3);
      } else {
        const nowDate = new Date();
        const todayDay = nowDate.getDay();
        const daysToSunday = 7 - (todayDay === 0 ? 7 : todayDay);
        const endOfWeek = new Date(
          nowDate.getTime() + daysToSunday * DAY_IN_MILLS
        );
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
              : Colors.light.text,

          borderColor:
            theme && darkModeType ? Colors.dark.text : Colors.light.blue,
        }}
      >
        {item}
      </button>
    ));
  }, [timeFrame, theme, darkModeType]);

  if (
    !masterInfoObject.exploreData ||
    !Object.keys(masterInfoObject.exploreData).length
  ) {
    return <NoDataView />;
  }
  return (
    <div className="exploreUsersContainer">
      <div
        style={{ backgroundColor: Colors.light.backgroundOffset }}
        className="downloadsContainer"
      >
        <ThemeText
          className={"downloadsContainerHeader"}
          textContent={"Blitz Wallet Downloads"}
        />
        <ThemeText styles={{ marginBottom: 5 }} textContent={"Today"} />
        <div className="donwloadsRow">
          <DateCountdown />
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
          <ThemeText textStyles={{ marginTop: 0 }} textContent={"Yesterday"} />
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
