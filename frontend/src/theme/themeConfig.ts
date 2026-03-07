import type { ThemeConfig } from "antd";

/** 期刊红 #8B1538 为品牌主色；整体字号略放大便于阅读 */
const theme: ThemeConfig = {
  token: {
    colorPrimary: "#8B1538",
    colorPrimaryHover: "#70122e",
    colorPrimaryActive: "#5c0e26",
    borderRadius: 6,
    fontSize: 15,
    fontSizeHeading1: 26,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 16,
    fontSizeHeading5: 15,
    fontSizeSM: 14,
    fontSizeLG: 16,
    fontSizeXL: 18,
  },
  components: {
    Button: {
      primaryShadow: "0 2px 0 rgba(139, 21, 56, 0.2)",
    },
    Menu: {
      itemSelectedBg: "rgba(139, 21, 56, 0.08)",
      itemActiveBg: "rgba(139, 21, 56, 0.04)",
      itemHeight: 44,
      fontSize: 15,
    },
    Table: {
      fontSize: 15,
    },
    Descriptions: {
      itemPaddingBottom: 14,
      labelColor: "rgba(0,0,0,0.7)",
    },
    Card: {
      headerFontSize: 16,
    },
    Input: {
      fontSize: 15,
    },
    Form: {
      labelFontSize: 15,
    },
  },
};

export default theme;
