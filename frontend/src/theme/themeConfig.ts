import type { ThemeConfig } from "antd";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#8B1538",
    colorPrimaryHover: "#70122e",
    colorPrimaryActive: "#5c0e26",
    colorBgLayout: "#f4f6f8",
    colorBgContainer: "#ffffff",
    colorBorderSecondary: "#e5e7eb",
    colorText: "#1f2937",
    colorTextSecondary: "#667085",
    borderRadius: 12,
    fontSize: 15,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 15,
    fontSizeSM: 14,
    fontSizeLG: 16,
    fontSizeXL: 18,
  },
  components: {
    Button: {
      primaryShadow: "none",
      borderRadius: 10,
    },
    Menu: {
      itemSelectedBg: "transparent",
      itemActiveBg: "rgba(139, 21, 56, 0.04)",
      itemSelectedColor: "#8B1538",
      itemHeight: 44,
      fontSize: 15,
    },
    Layout: {
      headerBg: "#ffffff",
      bodyBg: "#f4f6f8",
      footerBg: "#ffffff",
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
      colorBorderSecondary: "#e5e7eb",
    },
    Input: {
      fontSize: 15,
    },
    Form: {
      labelFontSize: 15,
    },
    Tabs: {
      itemSelectedColor: "#8B1538",
      itemHoverColor: "#8B1538",
      inkBarColor: "#8B1538",
    },
  },
};

export default theme;
