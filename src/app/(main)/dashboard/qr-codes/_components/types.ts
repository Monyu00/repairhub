export interface SpaceOption {
  id: string;
  name: string;
  floor: number;
}

export interface BuildingOption {
  id: string;
  name: string;
  code: string;
  spaces: SpaceOption[];
}

export interface EquipmentOption {
  id: string;
  name: string;
  code: string;
  spaceId: string;
  spaceName: string;
  buildingId: string;
  buildingName: string;
}

export type QRTargetType = "spaces" | "equipment";

export interface PrintableQRItem {
  id: string;
  type: "space" | "equipment";
  title: string;
  subtitle: string;
  code?: string;
  buildingName: string;
  spaceName?: string;
  url: string;
}
