import { useEffect, useMemo, useState, type FormEvent } from "react";
import { newId } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";
import { ConfirmDialog } from "./ConfirmDialog";
import type { QuickMessage } from "./types";

const TITLE_MAX = 40;
const BODY_MAX = 1000;

type Props = {
  messages: QuickMessage[];
  setMessages: (next: QuickMessage[]) => void;
};

type Editing = QuickMessage | "new" | null;

/** 初回起動時（キーが無いとき）に入れるサンプル */
function defaultMessages(): QuickMessage[] {
  const now = new Date().toISOString();
  const mk = (title: string, body: string): QuickMessage => ({
    id: newId(),
    title,
    body,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  });
  return [
    mk("発送連絡", "本日発送しました。到着までしばらくお待ちください。"),
    mk("発送お礼", "発送ありがとうございます。受け取り次第ご連絡させていただきます。"),
    mk("受け取り連絡", "本日お品物を受け取りました。丁寧な梱包ありがとうございました。"),
    mk(
      "取引終了挨拶",
      "この度はお取引ありがとうございました。またのご縁がありましたらよろしくお願いいたします。",
    ),
  ];
}

export function QuickScreen({ messages, setMessages }: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingDelete, setPendingDelete] = useState<QuickMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  // 連結（選んだ順）。画面を離れたら忘れて良い一時状態なので保存しない
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [connector, setConnector] = useState("");
  const [combinedCopied, setCombinedCopied] = useState(false);
  const [combinedCopyError, setCombinedCopyError] = useState(false);

  // 初回だけサンプルを入れる（キー未作成のとき）
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.quickMessages) === null) {
      setMessages(defaultMessages());
    }
    // eslint 無効環境。マウント時 1 回だけ
  }, []);

  const sorted = useMemo(
    () =>
      [...messages].sort((a, b) =>
        (b.lastUsedAt ?? b.updatedAt).localeCompare(a.lastUsedAt ?? a.updatedAt),
      ),
    [messages],
  );

  async function handleCopy(msg: QuickMessage) {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(msg.body);
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId(null), 1500);
      setMessages(
        messages.map((m) =>
          m.id === msg.id ? { ...m, lastUsedAt: new Date().toISOString() } : m,
        ),
      );
    } catch {
      setCopyError(true);
    }
  }

  function handleSave(title: string, body: string) {
    const now = new Date().toISOString();
    if (editing && editing !== "new") {
      setMessages(
        messages.map((m) => (m.id === editing.id ? { ...m, title, body, updatedAt: now } : m)),
      );
    } else {
      setMessages([
        ...messages,
        { id: newId(), title, body, createdAt: now, updatedAt: now, lastUsedAt: null },
      ]);
    }
    setEditing(null);
  }

  function confirmDelete() {
    const msg = pendingDelete;
    if (!msg) return;
    setMessages(messages.filter((m) => m.id !== msg.id));
    if (editing && editing !== "new" && editing.id === msg.id) setEditing(null);
    setSelectedIds((ids) => ids.filter((id) => id !== msg.id));
    setPendingDelete(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  const selectedMessages = selectedIds
    .map((id) => messages.find((m) => m.id === id))
    .filter((m): m is QuickMessage => !!m);

  const combinedText = selectedMessages
    .map((m, i) => (i === 0 ? m.body.trim() : `${connector.trim()}${m.body.trim()}`))
    .join("\n\n");

  async function handleCopyCombined() {
    setCombinedCopyError(false);
    try {
      await navigator.clipboard.writeText(combinedText);
      setCombinedCopied(true);
      window.setTimeout(() => setCombinedCopied(false), 1500);
      const now = new Date().toISOString();
      setMessages(
        messages.map((m) => (selectedIds.includes(m.id) ? { ...m, lastUsedAt: now } : m)),
      );
    } catch {
      setCombinedCopyError(true);
    }
  }

  return (
    <>
      <header className="screen-header">
        <h1>定型文</h1>
      </header>

      {editing ? (
        <>
          <QuickForm
            initial={editing === "new" ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
          {editing !== "new" && (
            <button
              type="button"
              className="quick-delete-link"
              onClick={() => setPendingDelete(editing)}
            >
              この定型文を削除
            </button>
          )}
        </>
      ) : (
        <>
          <p className="screen-intro">
            取引中〜終了のやりとりで、そのままコピーして使う文です。
            <br />
            チェックすると複数を1つにつなげられます。
          </p>

          <div className="quick-toolbar">
            <button type="button" className="create-btn" onClick={() => setEditing("new")}>
              新規作成
            </button>
          </div>

          {copyError && (
            <p className="error">
              コピーできませんでした。本文を開いて手動で選択してください。
            </p>
          )}

          {selectedIds.length >= 2 && (
            <div className="combine-card">
              <div className="combine-head">
                <span>{selectedIds.length} 件を連結</span>
                <button type="button" className="ghost-btn" onClick={() => setSelectedIds([])}>
                  選択解除
                </button>
              </div>

              <label className="combine-connector">
                <span>間に入れる言葉（任意・すべての継ぎ目に入ります）</span>
                <input
                  type="text"
                  value={connector}
                  maxLength={20}
                  placeholder="例）また、"
                  onChange={(e) => setConnector(e.target.value)}
                />
              </label>

              <pre className="preview-body">{combinedText}</pre>

              <div className="combine-actions">
                <button type="button" className="copy-btn" onClick={handleCopyCombined}>
                  {combinedCopied ? "コピーしました" : "コピー"}
                </button>
              </div>

              {combinedCopyError && (
                <p className="error">
                  コピーできませんでした。上の文章を手動で選択してコピーしてください。
                </p>
              )}

              <p className="compose-hint">
                文章の言い回し自体はつながりません。継ぎ目の言葉だけ調整できます。仕上げはコピー後に手直ししてください。
              </p>
            </div>
          )}

          {selectedIds.length === 1 && (
            <p className="quick-select-hint">もう1件チェックすると連結できます。</p>
          )}

          {sorted.length === 0 ? (
            <p className="empty">まだありません。「新規作成」から追加してください。</p>
          ) : (
            <ul className="quick-list">
              {sorted.map((msg) => (
                <li key={msg.id} className="quick-card">
                  <div className="quick-card-head">
                    <input
                      type="checkbox"
                      className="quick-check"
                      checked={selectedIds.includes(msg.id)}
                      onChange={() => toggleSelect(msg.id)}
                      aria-label={`「${msg.title}」を連結対象にする`}
                    />
                    <button
                      type="button"
                      className="quick-title"
                      onClick={() => setEditing(msg)}
                    >
                      {msg.title}
                    </button>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => handleCopy(msg)}
                    >
                      {copiedId === msg.id ? "コピーしました" : "コピー"}
                    </button>
                  </div>
                  <p className="quick-body">{msg.body}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`定型文「${pendingDelete.title}」を削除しますか？`}
          confirmLabel="削除"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}

type QuickFormProps = {
  initial: QuickMessage | null;
  onSave: (title: string, body: string) => void;
  onCancel: () => void;
};

function QuickForm({ initial, onSave, onCancel }: QuickFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t) return setError("タイトルを入力してください。");
    if (!b) return setError("本文を入力してください。");
    if (t.length > TITLE_MAX) return setError(`タイトルは ${TITLE_MAX} 文字以内で入力してください。`);
    if (b.length > BODY_MAX) return setError(`本文は ${BODY_MAX} 文字以内で入力してください。`);
    onSave(t, b);
  }

  return (
    <form className="menu-card form" onSubmit={handleSubmit}>
      <h2>{initial ? "定型文を編集" : "定型文を追加"}</h2>

      <label>
        <span>タイトル（一覧に表示・自分が分かればOK）</span>
        <input
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例）発送しました"
        />
      </label>

      <label>
        <span>本文（コピーされる内容）</span>
        <textarea
          value={body}
          maxLength={BODY_MAX}
          rows={5}
          onChange={(e) => setBody(e.target.value)}
          placeholder="例）本日、〇〇を発送いたしました。到着まで今しばらくお待ちくださいませ。"
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
