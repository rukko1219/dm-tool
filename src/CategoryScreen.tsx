import { useMemo, useState, type FormEvent } from "react";
import { newId } from "./storage";
import { getKindMeta, type ElementKindMeta } from "./elementKinds";
import { navigate } from "./route";
import { IconArrowLeft } from "./icons";
import { ConfirmDialog } from "./ConfirmDialog";
import type { ElementKind, TemplateEntry } from "./types";

const LABEL_MAX = 60;
const BODY_MAX = 2000;

type Props = {
  kind: ElementKind;
  entries: TemplateEntry[];
  setEntries: (next: TemplateEntry[]) => void;
};

/** null: 一覧表示 / "new": 新規作成フォーム / TemplateEntry: そのエントリの編集フォーム */
type Editing = TemplateEntry | "new" | null;

export function CategoryScreen({ kind, entries, setEntries }: Props) {
  const meta = getKindMeta(kind);
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateEntry | null>(null);

  const list = useMemo(
    () =>
      entries
        .filter((e) => e.kind === kind)
        .sort((a, b) => sortKey(b).localeCompare(sortKey(a))),
    [entries, kind],
  );

  function handleSave(label: string, body: string) {
    const now = new Date().toISOString();
    if (editing && editing !== "new") {
      setEntries(
        entries.map((e) => (e.id === editing.id ? { ...e, label, body, updatedAt: now } : e)),
      );
    } else {
      setEntries([
        ...entries,
        { id: newId(), kind, label, body, createdAt: now, updatedAt: now, lastUsedAt: null },
      ]);
    }
    setEditing(null);
  }

  function confirmDelete() {
    const entry = pendingDelete;
    if (!entry) return;
    setEntries(entries.filter((e) => e.id !== entry.id));
    if (editing && editing !== "new" && editing.id === entry.id) setEditing(null);
    setPendingDelete(null);
  }

  function handleBack() {
    if (editing) setEditing(null);
    else navigate({ name: "settings" });
  }

  return (
    <>
      <header className="screen-header">
        <button type="button" className="back-btn" onClick={handleBack} aria-label="戻る">
          <IconArrowLeft />
        </button>
        <h1>{meta.label}</h1>
      </header>

      {editing ? (
        <EntryForm
          meta={meta}
          initial={editing === "new" ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <p className="screen-intro">{meta.label}のテンプレを管理します。</p>

          {meta.personal && (
            <p className="personal-note">
              個人情報です。この端末のブラウザ内にのみ保存され、外部には送信されません。
            </p>
          )}

          <div className="menu-card">
            <div className="list-head">
              <span className="list-head-count">{list.length} 件</span>
              <button type="button" className="create-btn" onClick={() => setEditing("new")}>
                新規作成
              </button>
            </div>

            {list.length === 0 ? (
              <p className="empty">まだ登録がありません。「新規作成」から追加してください。</p>
            ) : (
              list.map((entry) => (
                <div key={entry.id} className="entry-row">
                  <button
                    type="button"
                    className="entry-row-main"
                    onClick={() => setEditing(entry)}
                  >
                    <span className="entry-row-title">{entry.label}</span>
                    <span className="entry-row-body">{entry.body}</span>
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => setPendingDelete(entry)}
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`「${pendingDelete.label}」を削除しますか？`}
          confirmLabel="削除"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}

type EntryFormProps = {
  meta: ElementKindMeta;
  initial: TemplateEntry | null;
  onSave: (label: string, body: string) => void;
  onCancel: () => void;
};

function EntryForm({ meta, initial, onSave, onCancel }: EntryFormProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const l = label.trim();
    const b = body.trim();

    if (!l) return setError("名前を入力してください。");
    if (!b) return setError(`${meta.bodyLabel}を入力してください。`);
    if (l.length > LABEL_MAX) return setError(`名前は ${LABEL_MAX} 文字以内で入力してください。`);
    if (b.length > BODY_MAX) return setError(`${meta.bodyLabel}は ${BODY_MAX} 文字以内で入力してください。`);

    onSave(l, b);
  }

  return (
    <form className="menu-card form" onSubmit={handleSubmit}>
      <h2>{initial ? "編集" : "新規作成"}</h2>

      {meta.personal && (
        <p className="personal-note">
          個人情報です。この端末のブラウザ内にのみ保存され、外部には送信されません。
        </p>
      )}

      <label>
        <span>名前（管理用・自分が分かればOK）</span>
        <input
          type="text"
          value={label}
          maxLength={LABEL_MAX}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={meta.labelPlaceholder}
        />
      </label>

      <label>
        <span>
          {meta.bodyLabel}（DMにそのまま入る内容）
        </span>
        <textarea
          value={body}
          maxLength={BODY_MAX}
          rows={meta.rows}
          onChange={(e) => setBody(e.target.value)}
          placeholder={meta.bodyPlaceholder}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="primary">
          {initial ? "更新する" : "追加する"}
        </button>
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

/** 使用順ソートのキー。未使用なら更新日時で代用する。 */
function sortKey(e: TemplateEntry): string {
  return e.lastUsedAt ?? e.updatedAt;
}
