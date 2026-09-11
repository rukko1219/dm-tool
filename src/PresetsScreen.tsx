import { useMemo, useState, type FormEvent } from "react";
import { newId } from "./storage";
import { ELEMENT_KINDS, type ElementKindMeta } from "./elementKinds";
import { navigate, hrefFor } from "./route";
import { IconArrowLeft, IconChevronRight } from "./icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { Switch } from "./Switch";
import type { DmPreset, ElementKind, TemplateEntry } from "./types";

const NAME_MAX = 40;

type Props = {
  presets: DmPreset[];
  setPresets: (next: DmPreset[]) => void;
  entries: TemplateEntry[];
};

type Editing = DmPreset | "new" | null;

export function PresetsScreen({ presets, setPresets, entries }: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingDelete, setPendingDelete] = useState<DmPreset | null>(null);

  const sorted = [...presets].sort((a, b) =>
    (b.lastUsedAt ?? b.createdAt).localeCompare(a.lastUsedAt ?? a.createdAt),
  );

  function handleSave(
    name: string,
    enabled: Record<ElementKind, boolean>,
    selected: Record<ElementKind, string | null>,
    exchangeEnabled: boolean,
  ) {
    const now = new Date().toISOString();
    if (editing && editing !== "new") {
      setPresets(
        presets.map((p) =>
          p.id === editing.id
            ? { ...p, name, enabled, selected, exchangeEnabled, updatedAt: now }
            : p,
        ),
      );
    } else {
      setPresets([
        ...presets,
        {
          id: newId(),
          name,
          enabled,
          selected,
          exchangeEnabled,
          createdAt: now,
          updatedAt: now,
          lastUsedAt: null,
        },
      ]);
    }
    setEditing(null);
  }

  function confirmDelete() {
    const preset = pendingDelete;
    if (!preset) return;
    setPresets(presets.filter((p) => p.id !== preset.id));
    if (editing && editing !== "new" && editing.id === preset.id) setEditing(null);
    setPendingDelete(null);
  }

  return (
    <>
      <header className="screen-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => (editing ? setEditing(null) : navigate({ name: "settings" }))}
          aria-label="戻る"
        >
          <IconArrowLeft />
        </button>
        <h1>プリセット</h1>
      </header>

      {editing ? (
        <>
          <PresetForm
            initial={editing === "new" ? null : editing}
            entries={entries}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
          {editing !== "new" && (
            <button
              type="button"
              className="quick-delete-link"
              onClick={() => setPendingDelete(editing)}
            >
              このプリセットを削除
            </button>
          )}
        </>
      ) : (
        <>
          <p className="screen-intro">
            要素の ON/OFF とテンプレの選択をプリセットとして登録します。
            <br />
            DM作成画面の「＋ 現在の内容を保存」からも作れます。
          </p>

          <div className="quick-toolbar">
            <button type="button" className="create-btn" onClick={() => setEditing("new")}>
              新規作成
            </button>
          </div>

          <div className="menu-card">
            {sorted.length === 0 ? (
              <p className="empty">まだありません。「新規作成」から追加できます。</p>
            ) : (
              sorted.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="menu-row"
                  onClick={() => setEditing(preset)}
                >
                  <span className="menu-row-body">
                    <span className="menu-row-title">{preset.name}</span>
                    <span className="menu-row-desc">{summarize(preset)}</span>
                  </span>
                  <span className="menu-row-meta">
                    <span className="chevron">
                      <IconChevronRight />
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`プリセット「${pendingDelete.name}」を削除しますか？`}
          confirmLabel="削除"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}

type PresetFormProps = {
  initial: DmPreset | null;
  entries: TemplateEntry[];
  onSave: (
    name: string,
    enabled: Record<ElementKind, boolean>,
    selected: Record<ElementKind, string | null>,
    exchangeEnabled: boolean,
  ) => void;
  onCancel: () => void;
};

function PresetForm({ initial, entries, onSave, onCancel }: PresetFormProps) {
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

  const [name, setName] = useState(initial?.name ?? "");
  const [enabled, setEnabledState] = useState<Record<ElementKind, boolean>>(() => {
    const base = {} as Record<ElementKind, boolean>;
    for (const meta of ELEMENT_KINDS) base[meta.kind] = initial?.enabled[meta.kind] ?? true;
    return base;
  });
  const [selected, setSelectedState] = useState<Record<ElementKind, string | null>>(() => {
    const base = {} as Record<ElementKind, string | null>;
    for (const meta of ELEMENT_KINDS) {
      const list = entriesByKind.get(meta.kind) ?? [];
      const want = initial?.selected[meta.kind] ?? null;
      base[meta.kind] = want && list.some((e) => e.id === want) ? want : null;
    }
    return base;
  });
  const [exchangeEnabled, setExchangeEnabled] = useState(initial?.exchangeEnabled ?? true);
  const [error, setError] = useState<string | null>(null);

  function toggleKind(kind: ElementKind) {
    setEnabledState((prev) => ({ ...prev, [kind]: !prev[kind] }));
  }

  function selectKind(kind: ElementKind, id: string | null) {
    setSelectedState((prev) => ({ ...prev, [kind]: id }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = name.trim();
    if (!t) return setError("名前を入力してください。");
    if (t.length > NAME_MAX) return setError(`名前は ${NAME_MAX} 文字以内で入力してください。`);
    onSave(t, enabled, selected, exchangeEnabled);
  }

  return (
    <form className="menu-card form" onSubmit={handleSubmit}>
      <h2>{initial ? "プリセットを編集" : "プリセットを追加"}</h2>

      <label>
        <span>名前</span>
        <input
          type="text"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="例）郵送交換"
        />
      </label>

      <div className="compose-item-head">
        <Switch checked={exchangeEnabled} onChange={setExchangeEnabled} label="交換内容を使う" />
        <span className="compose-item-label">交換内容</span>
      </div>

      <span className="preset-kinds-label">使う要素とテンプレ</span>
      <div className="preset-slot-list">
        {ELEMENT_KINDS.map((meta) => (
          <PresetSlotRow
            key={meta.kind}
            meta={meta}
            list={entriesByKind.get(meta.kind) ?? []}
            selectedId={selected[meta.kind]}
            enabled={enabled[meta.kind]}
            onSelect={(id) => selectKind(meta.kind, id)}
            onToggle={() => toggleKind(meta.kind)}
          />
        ))}
      </div>

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

type PresetSlotRowProps = {
  meta: ElementKindMeta;
  list: TemplateEntry[];
  selectedId: string | null;
  enabled: boolean;
  onSelect: (id: string | null) => void;
  onToggle: (on: boolean) => void;
};

function PresetSlotRow({ meta, list, selectedId, enabled, onSelect, onToggle }: PresetSlotRowProps) {
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
          onChange={(e) => onSelect(e.target.value || null)}
        >
          <option value="">（自動・最近使ったもの）</option>
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

function summarize(preset: DmPreset): string {
  const on: string[] = [];
  if (preset.exchangeEnabled ?? true) on.push("交換内容");
  for (const meta of ELEMENT_KINDS) {
    if (preset.enabled[meta.kind]) on.push(meta.label);
  }
  return on.length > 0 ? `ON: ${on.join("・")}` : "ON の要素なし";
}

/** 使用順ソートのキー。未使用なら更新日時で代用する。 */
function sortKey(e: TemplateEntry): string {
  return e.lastUsedAt ?? e.updatedAt;
}
