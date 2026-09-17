import type { Metadata } from "next";
import PrintingRoll from "../../printing-roll";

export const metadata: Metadata = { title: "Paper Playground / 纸卷游乐场 — After Now Lab" };

export default function GenerativeFormPage() {
  return <PrintingRoll />;
}
