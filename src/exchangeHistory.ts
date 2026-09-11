import { useLocalStorageState } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";

export type ExchangeField = "self" | "partner";

export type HistoryItem = {
  value: string;
  pinned: boolean;
  lastUsedAt: string;
};

export type ExchangeHistory = {
  self: HistoryItem[];
  partner: HistoryItem[];
};

export const EMPTY_HISTORY: ExchangeHistory = { self: [], partner: [] };

/** ピン留め優先 → 最終使用が新しい順 */
export function sortHistory(list: HistoryItem[]): HistoryItem[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.lastUsedAt.localeCompare(a.lastUsedAt);
  });
}

export function useExchangeHistory(): {
  list: (field: ExchangeField) => HistoryItem[];
  upsert: (field: ExchangeField, value: string) => void;
  togglePin: (field: ExchangeField, value: string) => void;
  remove: (field: ExchangeField, value: string) => void;
} {
  const [stored, setStored] = useLocalStorageState<ExchangeHistory>(
    STORAGE_KEYS.exchangeHistory,
    EMPTY_HISTORY,
  );

  const history: ExchangeHistory = {
    self: Array.isArray(stored.self) ? stored.self : [],
    partner: Array.isArray(stored.partner) ? stored.partner : [],
  };

  const list = (field: ExchangeField) => sortHistory(history[field]);

  const upsert = (field: ExchangeField, rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    const now = new Date().toISOString();
    const cur = history[field];
    const exists = cur.some((h) => h.value === value);
    const next = exists
      ? cur.map((h) => (h.value === value ? { ...h, lastUsedAt: now } : h))
      : [...cur, { value, pinned: false, lastUsedAt: now }];
    setStored({ ...history, [field]: next });
  };

  const togglePin = (field: ExchangeField, value: string) => {
    setStored({
      ...history,
      [field]: history[field].map((h) =>
        h.value === value ? { ...h, pinned: !h.pinned } : h,
      ),
    });
  };

  const remove = (field: ExchangeField, value: string) => {
    setStored({
      ...history,
      [field]: history[field].filter((h) => h.value !== value),
    });
  };

  return { list, upsert, togglePin, remove };
}
