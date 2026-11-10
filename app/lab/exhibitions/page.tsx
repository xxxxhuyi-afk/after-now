import type { Metadata } from "next";
import ExhibitionLibrary from "./exhibition-library";

export const metadata: Metadata = {
  title: "展馆案例库 — After Now Lab",
  description: "浏览展馆与互动展项案例、空间图集与设计来源，探索五主题三维模型及效果图对照。",
};

export default function ExhibitionsPage() {
  return <ExhibitionLibrary />;
}
