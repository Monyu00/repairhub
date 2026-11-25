import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "南臺校園維修通報系統",
  version: packageJson.version,
  copyright: `© ${currentYear} 南臺校園維修通報系統. All rights reserved.`,
  meta: {
    title: "南臺校園維修通報系統",
    description: "南臺校園維修通報系統是一個高效便捷的設備報修與維修管理系統，專為通報與處置追蹤設計。",
  },
};
