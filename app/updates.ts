export type SiteUpdate = {
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** Short category label, e.g. 案例库 / 日报 / 工具 / 作品 */
  tag: string;
  /** One-line headline shown in the strip */
  title: string;
  /** Where the strip links to */
  href: string;
};

/**
 * Homepage "今日更新" strip data.
 * Newest first. The strip shows at most the first 3 entries.
 * Daily updates only edit this file — no component changes needed.
 * Entries must reflect updates that are actually live; do not invent dates.
 */
export const updates: SiteUpdate[] = [
  {
    date: "2026-11-16",
    tag: "案例库",
    title: "展馆案例库新增「互动三步」",
    href: "/lab/exhibitions",
  },
  {
    date: "2026-11-11",
    tag: "案例库",
    title: "展馆案例库上新 10 个展馆案例",
    href: "/lab/exhibitions",
  },
];
