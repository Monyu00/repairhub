interface SortableSpace {
  floor: number;
  name: string;
  sort_order: number;
}

export function sortSpacesByOrder<T extends SortableSpace>(spaces: T[]): T[] {
  return [...spaces].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.name.localeCompare(b.name, "zh-Hant");
  });
}
