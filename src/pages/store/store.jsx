import ThemeText from "../../components/themeText/themeText";

export default function Store() {
  return (
    <div
      style={{
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        display: "flex",
      }}
      className="storeContainer"
    >
      <ThemeText textContent={"Coming Soon..."} />
    </div>
  );
}
