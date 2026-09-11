import { useEffect } from "react";
import { useLocalStorageState } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";

/**
 * ユーザーが変更できる 4 色。他の色（--border, --muted, --primary-soft など）は
 * styles.css の :root で color-mix() を使ってこの 4 色から自動計算する。
 * 削除ボタンの赤や個人情報の注意色（--danger, --note-*）は意味を持つ色なのでテーマ対象外。
 */
export type Theme = {
  bg: string;
  card: string;
  text: string;
  primary: string;
};

export const DEFAULT_THEME: Theme = {
  bg: "#f2f3f5",
  card: "#ffffff",
  text: "#1c1f23",
  primary: "#2563eb",
};

export type ThemePreset = Theme & { name: string };

export const THEME_PRESETS: ThemePreset[] = [
  { name: "標準", ...DEFAULT_THEME },
  { name: "ピンク", bg: "#fdf2f5", card: "#ffffff", text: "#3a1f26", primary: "#d6497a" },
  { name: "ミント", bg: "#f0faf6", card: "#ffffff", text: "#123229", primary: "#149a72" },
  { name: "サンセット", bg: "#fff8ef", card: "#ffffff", text: "#3a2a14", primary: "#e2812c" },
  { name: "ラベンダー", bg: "#f6f3fb", card: "#ffffff", text: "#2b2438", primary: "#7c5cd6" },
  { name: "ダーク", bg: "#17191d", card: "#20232a", text: "#eef0f3", primary: "#6ea8fe" },
];

const KEYS: (keyof Theme)[] = ["bg", "card", "text", "primary"];

/** 現在のテーマを読み書きしつつ、変更を <html> の CSS 変数に反映する */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useLocalStorageState<Theme>(STORAGE_KEYS.theme, DEFAULT_THEME);

  useEffect(() => {
    const root = document.documentElement.style;
    for (const key of KEYS) {
      root.setProperty(`--${key}`, theme[key] || DEFAULT_THEME[key]);
    }
  }, [theme]);

  return [theme, setTheme];
}
