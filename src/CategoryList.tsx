import { ELEMENT_KINDS } from "./elementKinds";
import { navigate } from "./route";
import { IconChevronRight } from "./icons";
import type { ElementKind, TemplateEntry } from "./types";

type Props = { entries: TemplateEntry[]; presetCount: number };

export function CategoryList({ entries, presetCount }: Props) {
  const countByKind = countBy(entries);

  return (
    <>
      <header className="screen-header">
        <h1>設定</h1>
      </header>

      <p className="screen-intro">
        DM の各パーツやプリセットを登録します。項目を選ぶと編集画面が開きます。
      </p>

      <div className="menu-card">
        <button
          type="button"
          className="menu-row"
          onClick={() => navigate({ name: "presets" })}
        >
          <span className="menu-row-body">
            <span className="menu-row-title">プリセット</span>
            <span className="menu-row-desc">
              要素のON/OFFの組み合わせ。DM作成画面からも保存可
            </span>
          </span>
          <span className="menu-row-meta">
            <span className="menu-row-count">{presetCount}</span>
            <span className="chevron">
              <IconChevronRight />
            </span>
          </span>
        </button>
      </div>

      <div className="menu-card">
        {ELEMENT_KINDS.map((meta) => (
          <button
            key={meta.kind}
            type="button"
            className="menu-row"
            onClick={() => navigate({ name: "category", kind: meta.kind })}
          >
            <span className="menu-row-body">
              <span className="menu-row-title">
                {meta.label}
                {meta.personal && <span className="tag tag-personal">個人情報</span>}
              </span>
              <span className="menu-row-desc">{meta.description}</span>
            </span>
            <span className="menu-row-meta">
              <span className="menu-row-count">{countByKind.get(meta.kind) ?? 0}</span>
              <span className="chevron">
                <IconChevronRight />
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="menu-card">
        <button
          type="button"
          className="menu-row"
          onClick={() => navigate({ name: "theme" })}
        >
          <span className="menu-row-body">
            <span className="menu-row-title">テーマカラー</span>
            <span className="menu-row-desc">背景・文字・アクセントカラーを変更</span>
          </span>
          <span className="menu-row-meta">
            <span className="chevron">
              <IconChevronRight />
            </span>
          </span>
        </button>
      </div>

      <div className="menu-card">
        <button
          type="button"
          className="menu-row"
          onClick={() => navigate({ name: "data" })}
        >
          <span className="menu-row-body">
            <span className="menu-row-title">データの移行</span>
            <span className="menu-row-desc">機種変・ブラウザ変更のときのエクスポート／インポート（普段は不要）</span>
          </span>
          <span className="menu-row-meta">
            <span className="chevron">
              <IconChevronRight />
            </span>
          </span>
        </button>
      </div>

      <footer className="app-footer">
        入力内容はこのブラウザ内（localStorage）にのみ保存されます。外部への送信はありません。
        別のブラウザ・端末には引き継がれず、ブラウザのデータ削除で消えます。バックアップは「データ」から。
      </footer>
    </>
  );
}

function countBy(entries: TemplateEntry[]): Map<ElementKind, number> {
  const map = new Map<ElementKind, number>();
  for (const e of entries) map.set(e.kind, (map.get(e.kind) ?? 0) + 1);
  return map;
}
