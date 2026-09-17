"use client";

import { useEffect } from "react";

// Signal after React commits the shared homepage, before modifying its DOM.
export default function PreviewReady() {
  useEffect(() => {
    document.documentElement.dataset.editorReady = "true";
    return () => { delete document.documentElement.dataset.editorReady; };
  }, []);
  return null;
}
