"use client";

import { useLocale } from "next-intl";
import { useLayoutEffect } from "react";

import { usePathname } from "@/i18n/navigation";

import { sceneScale } from "./scene-scale";

/**
 * Keeps --scene-scale on <html> (scene-scale.ts): on resize, and again after
 * every navigation, since the root layout may render <html> anew (switching
 * language does) and lose the style the <head> script set.
 */
export function SceneScale() {
  const locale = useLocale();
  const pathname = usePathname();
  useLayoutEffect(() => {
    const fit = () =>
      document.documentElement.style.setProperty("--scene-scale", String(sceneScale(innerWidth, innerHeight)));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [locale, pathname]);
  return null;
}
