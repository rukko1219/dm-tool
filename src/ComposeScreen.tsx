import { useMemo, useState } from "react";
import { newId, useLocalStorageState } from "./storage";
import { ELEMENT_KINDS, getKindMeta, type ElementKindMeta } from "./elementKinds";
import { useExchangeHistory } from "./exchangeHistory";
import { SuggestInput } from "./SuggestInput";
import { Switch } from "./Switch";
import { STORAGE_KEYS } from "./storageKeys";
import { hrefFor } from "./route";
import { ConfirmDialog } from "./ConfirmDialog";
import type { DmPreset, ElementKind, TemplateEntry } from "./types";

type Props = {
  entries: TemplateEntry[];
  setEntries: (next: TemplateEntry[]) => void;
  presets: DmPreset[];
  setPresets: (next: DmPreset[]) => void;
};

/** DM 作成中の下書き。 */
type ComposeDraft = {
  /** 要素タイプごとに選んだ TemplateEntry.id */
  selected: Partial<Record<ElementKind, string>>;
  /** 要素タイプごとの ON/OFF（未指定は ON 扱い） */
  enabled: Partial<Record<ElementKind, boolean>>;
  /** 交換内容：自分が出すもの／相手が出すもの（自由入力） */
  exchangeSelf: string;
  exchangePartner: string;
  exchangeEnabled: boolean;
  /** 最後に適用したプリセット ID。手動でいじったら null */
  presetId: string | null;
};

const EMPTY_DRAFT: ComposeDraft = {
  selected: {},
  enabled: {},
  exchangeSelf: "",
  exchangePartner: "",
  exchangeEnabled: true,
  presetId: null,
};

const EX_MAX = 300;
const DRAFT_KEY = STORAGE_KEYS.composeDraft;

type ExchangeFormat = { prefix: string; separator: string };
const DEFAULT_FORMAT: ExchangeFormat = { prefix: "内容：", separator: " ⇆ " };

/** 交換内容の 1 行を組み立てる。両方空なら空文字。 */
function buildExchangeLine(self: string, partner: string, fmt: ExchangeFormat): string {
  const s = self.trim();
  const p = partner.trim();
  if (!s && !p) return "";
  if (s && p) return `${fmt.prefix}${s}${fmt.separator}${p}`;
  return `${fmt.prefix}${s || p}`;
}

/** 挨拶を除いた、プレビューでの並び順（挨拶は先頭固定、品物の一文はその直後に差し込む） */
const REST_ORDER: ElementKind[] = [
  "packaging",
  "exchangeMethod",
  "paymentOffer",
  "address",
  "remittance",
  "closing",
];

export function ComposeScreen({ entries, setEntries, presets, setPresets }: Props) {
  const [stored, setStored] = useLocalStorageState<ComposeDraft>(DRAFT_KEY, EMPTY_DRAFT);
  // 旧バージョンの下書きに新しいフィールドが無くても落ちないよう既定値で補う
  const draft: ComposeDraft = { ...EMPTY_DRAFT, ...stored };
  const setDraft = setStored;
  const exHistory = useExchangeHistory();
  const [format, setFormat] = useLocalStorageState<ExchangeFormat>(
    STORAGE_KEYS.exchangeFormat,
    DEFAULT_FORMAT,
  );
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [naming, setNaming] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const activePreset = presets.find((p) => p.id === draft.presetId);
  const sortedPresets = [...presets].sort((a, b) =>
    (b.lastUsedAt ?? b.createdAt).localeCompare(a.lastUsedAt ?? a.createdAt),
  );

  const statusLabel = activePreset ? `プリセット：${activePreset.name}` : "カスタム";

  const entriesByKind = useMemo(() => {
    const map = new Map<ElementKind, TemplateEntry[]>();
    for (const meta of ELEMENT_KINDS) {
      map.set(
        meta.kind,
        entries
          .filter((e) => e.kind === meta.kind)
          .sort((a, b) => sortKey(b).localeCompare(sortKey(a))),
      );
    }
    return map;
  }, [entries]);

  const listOf = (kind: ElementKind): TemplateEntry[] => entriesByKind.get(kind) ?? [];

  const effectiveId = (kind: ElementKind): string | null => {
    const list = listOf(kind);
    if (list.length === 0) return null;
    const want = draft.selected[kind];
    return want && list.some((e) => e.id === want) ? want : list[0].id;
  };

  const isEnabled = (kind: ElementKind): boolean => {
    if (listOf(kind).length === 0) return false;
    return draft.enabled[kind] ?? true;
  };

  // テンプレの選択を変えたらプリセットとは別物（presetId を外す）
  const setSelected = (kind: ElementKind, id: string) =>
    setDraft({ ...draft, selected: { ...draft.selected, [kind]: id }, presetId: null });

  // ON/OFF を手動で変えたらカスタム扱い
  const setEnabled = (kind: ElementKind, on: boolean) =>
    setDraft({
      ...draft,
      enabled: { ...draft.enabled, [kind]: on },
      presetId: null,
    });

  const setExchangeEnabled = (on: boolean) =>
    setDraft({ ...draft, exchangeEnabled: on, presetId: null });

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    // プリセットの selected（null 含む）から下書き用に null を除いて取り込む
    const selected: Partial<Record<ElementKind, string>> = {};
    for (const meta of ELEMENT_KINDS) {
      const id = preset.selected[meta.kind];
      if (id) selected[meta.kind] = id;
    }
    setDraft({
      ...draft,
      enabled: { ...preset.enabled },
      selected,
      exchangeEnabled: preset.exchangeEnabled ?? true,
      presetId,
    });
    setPresets(
      presets.map((p) =>
        p.id === presetId ? { ...p, lastUsedAt: new Date().toISOString() } : p,
      ),
    );
  }

  function savePreset() {
    const name = newPresetName.trim();
    if (!name) return;

    const enabled = {} as Record<ElementKind, boolean>;
    const selected = {} as Record<ElementKind, string | null>;
    for (const meta of ELEMENT_KINDS) {
      enabled[meta.kind] = isEnabled(meta.kind);
      selected[meta.kind] = effectiveId(meta.kind);
    }

    const now = new Date().toISOString();
    const preset: DmPreset = {
      id: newId(),
      name,
      enabled,
      selected,
      exchangeEnabled: draft.exchangeEnabled,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    setPresets([...presets, preset]);
    setDraft({ ...draft, presetId: preset.id });
    setNaming(false);
    setNewPresetName("");
  }

  function cancelNaming() {
    setNaming(false);
    setNewPresetName("");
  }

  // プレビュー文言と、実際に使われたテンプレの ID を同時に組み立てる
  // （コピー時に「最近使ったテンプレ」として lastUsedAt を更新するため）
  const { previewText, usedEntryIds } = useMemo(() => {
    const out: string[] = [];
    const ids: string[] = [];
    const pushKind = (kind: ElementKind) => {
      const list = entriesByKind.get(kind) ?? [];
      if (list.length === 0) return;
      if (!(draft.enabled[kind] ?? true)) return;
      const want = draft.selected[kind];
      const entry = want && list.some((e) => e.id === want)
        ? list.find((e) => e.id === want)
        : list[0];
      const body = entry?.body.trim();
      if (body && entry) {
        out.push(body);
        ids.push(entry.id);
      }
    };

    pushKind("greeting");
    if (draft.exchangeEnabled) {
      const line = buildExchangeLine(draft.exchangeSelf, draft.exchangePartner, format);
      if (line) out.push(line);
    }
    for (const kind of REST_ORDER) pushKind(kind);

    // 要素と要素の間は空行で区切る（各要素内部の改行はそのまま保たれる）
    return { previewText: out.join("\n\n"), usedEntryIds: ids };
  }, [entriesByKind, draft, format]);

  async function handleCopy() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      if (usedEntryIds.length > 0) {
        const now = new Date().toISOString();
        setEntries(
          entries.map((e) => (usedEntryIds.includes(e.id) ? { ...e, lastUsedAt: now } : e)),
        );
      }
    } catch {
      setCopyError(true);
    }
  }

  function confirmClear() {
    setDraft(EMPTY_DRAFT);
    setCopyError(false);
    setConfirmingClear(false);
  }

  return (
    <>
      <header className="screen-header">
        <h1>DM作成</h1>
      </header>
      <p className="screen-intro">
        使う要素を選ぶと、下のプレビューに文章ができます。
      </p>

      <div className="apply-bar">
        <button
          type="button"
          className="apply-summary"
          onClick={() => setApplyOpen((v) => !v)}
        >
          <span className="apply-summary-text">現在：{statusLabel}</span>
          <span className="apply-summary-toggle">{applyOpen ? "閉じる ▲" : "変更する ▾"}</span>
        </button>

        {applyOpen && (
          <div className="apply-panel">
            <div className="preset-chips">
              {sortedPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={draft.presetId === preset.id ? "preset-chip active" : "preset-chip"}
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.name}
                </button>
              ))}
              {!naming && (
                <button type="button" className="chip-add" onClick={() => setNaming(true)}>
                  ＋ 現在の内容を保存
                </button>
              )}
            </div>

            {naming && (
              <div className="preset-rename preset-name-form">
                <input
                  type="text"
                  value={newPresetName}
                  maxLength={40}
                  placeholder="プリセット名"
                  autoFocus
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") savePreset();
                    if (e.key === "Escape") cancelNaming();
                  }}
                />
                <button
                  type="button"
                  className="primary"
                  onClick={savePreset}
                  disabled={!newPresetName.trim()}
                >
                  保存
                </button>
                <button type="button" onClick={cancelNaming}>
                  キャンセル
                </button>
              </div>
            )}

            <p className="apply-hint">
              設定 →「プリセット」からも作成・編集できます。
            </p>
          </div>
        )}
      </div>

      <div className="compose-list">
        <ComposeSlot
          meta={getKindMeta("greeting")}
          list={listOf("greeting")}
          selectedId={effectiveId("greeting")}
          enabled={isEnabled("greeting")}
          onSelect={(id) => setSelected("greeting", id)}
          onToggle={(on) => setEnabled("greeting", on)}
        />

        {/* 交換内容：自分／相手の自由入力。入力履歴＋ピン留めあり */}
        <div className="compose-item">
          <div className="compose-item-head">
            <Switch
              checked={draft.exchangeEnabled}
              onChange={setExchangeEnabled}
              label="交換内容を使う"
            />
            <span className="compose-item-label">交換内容</span>
          </div>

          <label className="ex-field">
            <span>自分が出すもの</span>
            <SuggestInput
              value={draft.exchangeSelf}
              disabled={!draft.exchangeEnabled}
              placeholder="例）キャラA 缶バッジ2点"
              suggestions={exHistory.list("self")}
              onChange={(v) => setDraft({ ...draft, exchangeSelf: v.slice(0, EX_MAX) })}
              onCommit={(v) => exHistory.upsert("self", v)}
              onPin={(v) => exHistory.togglePin("self", v)}
              onRemove={(v) => exHistory.remove("self", v)}
            />
          </label>

          <label className="ex-field">
            <span>相手が出すもの</span>
            <SuggestInput
              value={draft.exchangePartner}
              disabled={!draft.exchangeEnabled}
              placeholder="例）キャラB 缶バッジ2点"
              suggestions={exHistory.list("partner")}
              onChange={(v) => setDraft({ ...draft, exchangePartner: v.slice(0, EX_MAX) })}
              onCommit={(v) => exHistory.upsert("partner", v)}
              onPin={(v) => exHistory.togglePin("partner", v)}
              onRemove={(v) => exHistory.remove("partner", v)}
            />
          </label>

          <button
            type="button"
            className="linklike"
            onClick={() => setFormatOpen((v) => !v)}
          >
            表示形式{formatOpen ? " ▲" : " ▼"}
          </button>

          {formatOpen && (
            <div className="ex-format">
              <label>
                <span>行頭の語句（改行も入力できます）</span>
                <textarea
                  value={format.prefix}
                  rows={2}
                  maxLength={40}
                  placeholder="内容："
                  onChange={(e) => setFormat({ ...format, prefix: e.target.value })}
                />
              </label>
              <label>
                <span>区切り記号（前後の空白も含む）</span>
                <input
                  type="text"
                  value={format.separator}
                  maxLength={10}
                  placeholder=" ⇆ "
                  onChange={(e) => setFormat({ ...format, separator: e.target.value })}
                />
              </label>
            </div>
          )}
        </div>

        {REST_ORDER.map((kind) => (
          <ComposeSlot
            key={kind}
            meta={getKindMeta(kind)}
            list={listOf(kind)}
            selectedId={effectiveId(kind)}
            enabled={isEnabled(kind)}
            onSelect={(id) => setSelected(kind, id)}
            onToggle={(on) => setEnabled(kind, on)}
          />
        ))}
      </div>

      <div className="preview-card">
        <div className="preview-head">
          <span className="preview-title">プレビュー</span>
          <div className="preview-actions">
            <button type="button" className="ghost-btn" onClick={() => setConfirmingClear(true)}>
              クリア
            </button>
            <button
              type="button"
              className="copy-btn"
              onClick={handleCopy}
              disabled={previewText.length === 0}
            >
              {copied ? "コピーしました" : "コピー"}
            </button>
          </div>
        </div>

        {previewText ? (
          <pre className="preview-body">{previewText}</pre>
        ) : (
          <p className="preview-empty">使う要素を選ぶと、ここに文章が表示されます。</p>
        )}

        {copyError && (
          <p className="error">
            コピーできませんでした。プレビューを手動で選択してコピーしてください。
          </p>
        )}
      </div>

      {confirmingClear && (
        <ConfirmDialog
          message={"選択内容をすべてクリアしますか？\n（登録したテンプレは消えません）"}
          confirmLabel="クリア"
          danger
          onConfirm={confirmClear}
          onCancel={() => setConfirmingClear(false)}
        />
      )}
    </>
  );
}

type ComposeSlotProps = {
  meta: ElementKindMeta;
  list: TemplateEntry[];
  selectedId: string | null;
  enabled: boolean;
  onSelect: (id: string) => void;
  onToggle: (on: boolean) => void;
};

function ComposeSlot({ meta, list, selectedId, enabled, onSelect, onToggle }: ComposeSlotProps) {
  return (
    <div className="compose-row">
      <Switch
        checked={enabled}
        disabled={list.length === 0}
        onChange={onToggle}
        label={`${meta.label}を使う`}
      />
      <span className="compose-row-label">{meta.label}</span>

      {list.length === 0 ? (
        <a className="compose-row-empty" href={hrefFor({ name: "category", kind: meta.kind })}>
          未登録・登録する →
        </a>
      ) : (
        <select
          className="compose-row-select"
          value={selectedId ?? ""}
          disabled={!enabled}
          onChange={(e) => onSelect(e.target.value)}
        >
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** 使用順ソートのキー。未使用なら更新日時で代用する。 */
function sortKey(e: TemplateEntry): string {
  return e.lastUsedAt ?? e.updatedAt;
}
