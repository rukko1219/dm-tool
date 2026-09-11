import { useCallback, useState } from "react";

/**
 * localStorage に配列を保存する最小フック。
 *
 * 方針:
 * - データはこのブラウザの中だけに保存され、外部には一切送信されない。
 * - 読み込み時にパースへ失敗しても空配列にフォールバックし、アプリを落とさない。
 * - 将来サーバ保存へ切り替える場合は、この 1 ファイルの差し替えで済むようにしておく。
 */
export function useLocalStorageList<T>(key: string): {
  items: T[];
  setItems: (next: T[]) => void;
} {
  const [items, setItemsState] = useState<T[]>(() => readList<T>(key));

  const setItems = useCallback(
    (next: T[]) => {
      setItemsState(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        // 容量超過やプライベートブラウズ時など。state は更新済みなので操作は続行できる。
        console.error(`localStorage への保存に失敗しました (key=${key})`, e);
      }
    },
    [key],
  );

  return { items, setItems };
}

/**
 * localStorage に単一のオブジェクト（設定・下書きなど）を保存するフック。
 * useLocalStorageList のオブジェクト版。パース失敗時は initial にフォールバックする。
 */
export function useLocalStorageState<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValueState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.error(`localStorage の読み込みに失敗しました (key=${key})`, e);
      return initial;
    }
  });

  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.error(`localStorage への保存に失敗しました (key=${key})`, e);
      }
    },
    [key],
  );

  return [value, setValue];
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    console.error(`localStorage の読み込みに失敗しました (key=${key})`, e);
    return [];
  }
}

/** 衝突しない ID。localhost はセキュアコンテキスト扱いなので randomUUID が使える。 */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
