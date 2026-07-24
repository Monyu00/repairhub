import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "RepairHub",
  version: packageJson.version,
  copyright: `© ${currentYear}, RepairHub.`,
  meta: {
    title: "RepairHub - 設備報修管理系統",
    description: "RepairHub 是一個高效便捷的設備報修與維修管理系統，專為通報與處置追蹤設計。",
  },
};
