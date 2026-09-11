import { EMPTY_HISTORY, type ExchangeHistory, type HistoryItem } from "./exchangeHistory";
import { STORAGE_KEYS } from "./storageKeys";
import type { Theme } from "./theme";
import type { DmPreset, QuickMessage, TemplateEntry } from "./types";

const APP_ID = "dm-tool";
const BACKUP_VERSION = 1;

type ExchangeFormat = { prefix: string; separator: string };

export type BackupData = {
  templates: TemplateEntry[];
  presets: DmPreset[];
  quickMessages: QuickMessage[];
  exchangeHistory: ExchangeHistory;
  exchangeFormat: ExchangeFormat | null;
  theme: Theme | null;
};

type BackupFile = {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  data: BackupData;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 現在のデータをまとめる（compose-draft は含めない） */
export function collectBackup(): BackupFile {
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      templates: readJson<TemplateEntry[]>(STORAGE_KEYS.templates, []),
      presets: readJson<DmPreset[]>(STORAGE_KEYS.presets, []),
      quickMessages: readJson<QuickMessage[]>(STORAGE_KEYS.quickMessages, []),
      exchangeHistory: readJson<ExchangeHistory>(STORAGE_KEYS.exchangeHistory, EMPTY_HISTORY),
      exchangeFormat: readJson<ExchangeFormat | null>(STORAGE_KEYS.exchangeFormat, null),
      theme: readJson<Theme | null>(STORAGE_KEYS.theme, null),
    },
  };
}

function toHistoryList(v: unknown): HistoryItem[] {
  return Array.isArray(v)
    ? (v as HistoryItem[]).filter((h) => h && typeof h.value === "string")
    : [];
}

/** JSON 文字列をバックアップとして検証してデータ部を返す。失敗時は Error を投げる。 */
export function parseBackup(text: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("ファイルを JSON として読み取れませんでした。");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("バックアップファイルの形式ではありません。");
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.app !== APP_ID) {
    throw new Error("このアプリのバックアップファイルではありません。");
  }
  if (typeof obj.version !== "number" || obj.version > BACKUP_VERSION) {
    throw new Error("このアプリで読み込めるバージョンのファイルではありません。");
  }
  const data = obj.data as Record<string, unknown> | undefined;
  if (!data) throw new Error("データが含まれていません。");

  const templates = Array.isArray(data.templates)
    ? (data.templates as TemplateEntry[]).filter((t) => t && typeof t.id === "string")
    : [];
  const presets = Array.isArray(data.presets)
    ? (data.presets as DmPreset[]).filter((p) => p && typeof p.id === "string")
    : [];
  const quickMessages = Array.isArray(data.quickMessages)
    ? (data.quickMessages as QuickMessage[]).filter((q) => q && typeof q.id === "string")
    : [];

  const rawHistory = (data.exchangeHistory ?? {}) as Record<string, unknown>;
  const exchangeHistory: ExchangeHistory = {
    self: toHistoryList(rawHistory.self),
    partner: toHistoryList(rawHistory.partner),
  };

  const rawFormat = data.exchangeFormat as Record<string, unknown> | undefined;
  const exchangeFormat =
    rawFormat && typeof rawFormat.prefix === "string" && typeof rawFormat.separator === "string"
      ? { prefix: rawFormat.prefix, separator: rawFormat.separator }
      : null;

  const rawTheme = data.theme as Record<string, unknown> | undefined;
  const theme =
    rawTheme &&
    typeof rawTheme.bg === "string" &&
    typeof rawTheme.card === "string" &&
    typeof rawTheme.text === "string" &&
    typeof rawTheme.primary === "string"
      ? {
          bg: rawTheme.bg,
          card: rawTheme.card,
          text: rawTheme.text,
          primary: rawTheme.primary,
        }
      : null;

  return {
    templates,
    presets,
    quickMessages,
    exchangeHistory,
    exchangeFormat,
    theme,
  };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((x) => [x.id, x]));
  for (const item of incoming) map.set(item.id, item); // 同じ ID は取り込み側で上書き
  return [...map.values()];
}

/** 値をキーにマージ（同じ値は取り込み側で上書き） */
function mergeHistoryList(current: HistoryItem[], incoming: HistoryItem[]): HistoryItem[] {
  const map = new Map(current.map((h) => [h.value, h]));
  for (const item of incoming) map.set(item.value, item);
  return [...map.values()];
}

export type MergeResult = {
  templatesAdded: number;
  templatesUpdated: number;
  presetsAdded: number;
  presetsUpdated: number;
  quickAdded: number;
  quickUpdated: number;
};

/** 取り込みデータを現在の localStorage にマージして書き込む。 */
export function mergeBackupIntoStorage(incoming: BackupData): MergeResult {
  const curTemplates = readJson<TemplateEntry[]>(STORAGE_KEYS.templates, []);
  const curPresets = readJson<DmPreset[]>(STORAGE_KEYS.presets, []);
  const curQuick = readJson<QuickMessage[]>(STORAGE_KEYS.quickMessages, []);
  const curHistory = readJson<ExchangeHistory>(STORAGE_KEYS.exchangeHistory, EMPTY_HISTORY);

  const curTemplateIds = new Set(curTemplates.map((t) => t.id));
  const curPresetIds = new Set(curPresets.map((p) => p.id));
  const curQuickIds = new Set(curQuick.map((q) => q.id));

  const mergedTemplates = mergeById(curTemplates, incoming.templates);
  const mergedPresets = mergeById(curPresets, incoming.presets);
  const mergedQuick = mergeById(curQuick, incoming.quickMessages);
  const mergedHistory: ExchangeHistory = {
    self: mergeHistoryList(curHistory.self ?? [], incoming.exchangeHistory.self),
    partner: mergeHistoryList(curHistory.partner ?? [], incoming.exchangeHistory.partner),
  };

  localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(mergedTemplates));
  localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(mergedPresets));
  localStorage.setItem(STORAGE_KEYS.quickMessages, JSON.stringify(mergedQuick));
  localStorage.setItem(STORAGE_KEYS.exchangeHistory, JSON.stringify(mergedHistory));
  if (incoming.exchangeFormat) {
    localStorage.setItem(STORAGE_KEYS.exchangeFormat, JSON.stringify(incoming.exchangeFormat));
  }
  if (incoming.theme) {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(incoming.theme));
  }

  return {
    templatesAdded: incoming.templates.filter((t) => !curTemplateIds.has(t.id)).length,
    templatesUpdated: incoming.templates.filter((t) => curTemplateIds.has(t.id)).length,
    presetsAdded: incoming.presets.filter((p) => !curPresetIds.has(p.id)).length,
    presetsUpdated: incoming.presets.filter((p) => curPresetIds.has(p.id)).length,
    quickAdded: incoming.quickMessages.filter((q) => !curQuickIds.has(q.id)).length,
    quickUpdated: incoming.quickMessages.filter((q) => curQuickIds.has(q.id)).length,
  };
}

/** バックアップをファイルとしてダウンロードさせる */
export function downloadBackup(): void {
  const backup = collectBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const stamp = backup.exportedAt.slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dm-tool-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
