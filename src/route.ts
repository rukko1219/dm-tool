import { useEffect, useState } from "react";
import { ELEMENT_KINDS } from "./elementKinds";
import type { ElementKind } from "./types";

/**
 * URL ハッシュだけで完結する最小ルーター。
 * - "#/"（またはハッシュ無し）        → DM作成
 * - "#/quick"                        → 定型文
 * - "#/settings"                     → 設定ホーム
 * - "#/settings/presets"             → プリセット管理
 * - "#/settings/data"                → データ（バックアップ）
 * - "#/settings/theme"               → テーマカラー
 * - "#/settings/greeting" など        → そのカテゴリの登録画面
 * ブラウザの戻る/進むがそのまま画面遷移として効く。
 */
export type Route =
  | { name: "compose" }
  | { name: "quick" }
  | { name: "settings" }
  | { name: "presets" }
  | { name: "data" }
  | { name: "theme" }
  | { name: "category"; kind: ElementKind };

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "").replace(/\/+$/, "").trim();
  if (raw === "" || raw === "compose") return { name: "compose" };
  if (raw === "quick") return { name: "quick" };
  if (raw === "settings") return { name: "settings" };
  if (raw === "settings/presets") return { name: "presets" };
  if (raw === "settings/data") return { name: "data" };
  if (raw === "settings/theme") return { name: "theme" };

  const m = /^settings\/(.+)$/.exec(raw);
  if (m) {
    const found = ELEMENT_KINDS.find((k) => k.kind === m[1]);
    if (found) return { name: "category", kind: found.kind };
  }
  return { name: "compose" };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case "compose":
      return "#/";
    case "quick":
      return "#/quick";
    case "settings":
      return "#/settings";
    case "presets":
      return "#/settings/presets";
    case "data":
      return "#/settings/data";
    case "theme":
      return "#/settings/theme";
    case "category":
      return `#/settings/${route.kind}`;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function navigate(route: Route): void {
  const next = hrefFor(route);
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
  window.scrollTo({ top: 0 });
}
