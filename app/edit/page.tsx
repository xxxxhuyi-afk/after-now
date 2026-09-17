import type { Metadata } from "next";
import Editor from "./editor";

export const metadata: Metadata = {
  title: "After Now Editor v0.1",
  robots: { index: false, follow: false },
};

export default function EditPage() {
  return <Editor />;
}
