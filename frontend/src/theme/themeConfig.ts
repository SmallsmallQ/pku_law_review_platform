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
    borderRadius: 16,
    controlHeight: 36,
    controlHeightLG: 40,
    fontSize: 14,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 15,
    fontSizeHeading5: 14,
    fontSizeSM: 13,
    fontSizeLG: 15,
    fontSizeXL: 16,
  },
  components: {
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
      borderRadius: 999,
    },
    Menu: {
      itemSelectedBg: "transparent",
      itemActiveBg: "rgba(139, 21, 56, 0.04)",
      itemSelectedColor: "#8B1538",
      itemHeight: 40,
      fontSize: 14,
    },
    Layout: {
      headerBg: "#ffffff",
      bodyBg: "#f4f6f8",
      footerBg: "#ffffff",
    },
    Table: {
      fontSize: 14,
    },
    Descriptions: {
      itemPaddingBottom: 10,
      labelColor: "rgba(0,0,0,0.7)",
    },
    Card: {
      headerFontSize: 15,
      colorBorderSecondary: "#e5e7eb",
      borderRadiusLG: 24,
    },
    Input: {
      fontSize: 14,
      borderRadius: 16,
    },
    Select: {
      borderRadius: 16,
    },
    Modal: {
      borderRadiusLG: 24,
    },
    Drawer: {
      borderRadiusLG: 24,
    },
    Alert: {
      borderRadiusLG: 18,
    },
    Pagination: {
      itemBorderRadius: 14,
    },
    Form: {
      labelFontSize: 14,
    },
    Tabs: {
      itemSelectedColor: "#8B1538",
      itemHoverColor: "#8B1538",
      inkBarColor: "#8B1538",
    },
  },
};

export default theme;
