import { useState } from "react";
import type { HistoryItem } from "./exchangeHistory";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** フォーカスが外れたとき（＝入力確定）に呼ぶ。履歴への保存に使う */
  onCommit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions: HistoryItem[];
  onPin: (value: string) => void;
  onRemove: (value: string) => void;
};

export function SuggestInput({
  value,
  onChange,
  onCommit,
  placeholder,
  disabled,
  suggestions,
  onPin,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);

  const query = value.trim().toLowerCase();
  const filtered = query
    ? suggestions.filter(
        (s) => s.value.toLowerCase().includes(query) && s.value !== value.trim(),
      )
    : suggestions;

  return (
    <div className="suggest">
      <textarea
        value={value}
        rows={2}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          onCommit(e.target.value); // DOM の現在値を使う（props は再描画待ちで古いことがある）
        }}
      />

      {open && filtered.length > 0 && (
        <ul className="suggest-list">
          {filtered.map((s) => (
            <li key={s.value} className={s.pinned ? "suggest-item pinned" : "suggest-item"}>
              <button
                type="button"
                className="suggest-value"
                // mousedown で preventDefault すると input の blur を止められる
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s.value);
                  setOpen(false);
                }}
              >
                {s.value}
              </button>
              <button
                type="button"
                className={s.pinned ? "suggest-act on" : "suggest-act"}
                title={s.pinned ? "ピン留めを外す" : "ピン留め"}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPin(s.value);
                }}
              >
                ピン
              </button>
              <button
                type="button"
                className="suggest-act"
                title="履歴から削除"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onRemove(s.value);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
