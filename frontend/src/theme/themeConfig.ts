import type { ThemeConfig } from "antd";

/** 期刊红 #8B1538 为品牌主色 */
const theme: ThemeConfig = {
  token: {
    colorPrimary: "#8B1538",
    colorPrimaryHover: "#70122e",
    colorPrimaryActive: "#5c0e26",
    borderRadius: 6,
  },
  components: {
    Button: {
      primaryShadow: "0 2px 0 rgba(139, 21, 56, 0.2)",
    },
    Menu: {
      itemSelectedBg: "rgba(139, 21, 56, 0.08)",
      itemActiveBg: "rgba(139, 21, 56, 0.04)",
    },
  },
};

export default theme;
