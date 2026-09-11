import { useEffect, useState } from "react";
import { navigate } from "./route";
import { IconArrowLeft } from "./icons";
import { DEFAULT_THEME, THEME_PRESETS, type Theme } from "./theme";

type Props = {
  theme: Theme;
  setTheme: (next: Theme) => void;
};

const FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: "bg", label: "背景色", hint: "画面全体の背景" },
  { key: "card", label: "カードの背景色", hint: "カード・入力欄などの下地" },
  { key: "text", label: "文字色", hint: "本文・見出しの文字" },
  { key: "primary", label: "アクセントカラー", hint: "ボタンや選択中の表示など" },
];

export function ThemeScreen({ theme, setTheme }: Props) {
  const setField = (key: keyof Theme, value: string) => setTheme({ ...theme, [key]: value });

  return (
    <>
      <header className="screen-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate({ name: "settings" })}
          aria-label="戻る"
        >
          <IconArrowLeft />
        </button>
        <h1>テーマカラー</h1>
      </header>

      <p className="screen-intro">
        背景・文字・アクセントカラーを自由に組み合わせられます。変更はすぐに画面全体へ反映されます。
      </p>

      <div className="menu-card theme-card">
        <h2>プリセット</h2>
        <div className="theme-preset-list">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="theme-preset"
              onClick={() =>
                setTheme({
                  bg: preset.bg,
                  card: preset.card,
                  text: preset.text,
                  primary: preset.primary,
                })
              }
            >
              <span className="theme-preset-swatch">
                <span style={{ background: preset.bg }} />
                <span style={{ background: preset.primary }} />
                <span style={{ background: preset.text }} />
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="menu-card theme-card">
        <h2>色を指定</h2>
        {FIELDS.map((f) => (
          <div key={f.key} className="theme-field">
            <div className="theme-field-label">
              <span className="theme-field-name">{f.label}</span>
              <span className="theme-field-hint">{f.hint}</span>
            </div>
            <div className="theme-field-input">
              <input
                type="color"
                value={theme[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                aria-label={f.label}
              />
              <HexField value={theme[f.key]} onCommit={(v) => setField(f.key, v)} />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="ghost-btn theme-reset" onClick={() => setTheme(DEFAULT_THEME)}>
        初期設定に戻す
      </button>
    </>
  );
}

/** 16進カラーコードのテキスト入力。無効な値は blur 時に元へ戻す */
function HexField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  function commit() {
    const v = text.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onCommit(v.toLowerCase());
    } else {
      setText(value); // 無効な値は元に戻す
    }
  }

  return (
    <input
      type="text"
      className="theme-hex"
      value={text}
      maxLength={7}
      placeholder="#RRGGBB"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}
