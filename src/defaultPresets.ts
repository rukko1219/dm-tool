import { ELEMENT_KINDS } from "./elementKinds";
import { newId } from "./storage";
import type { DmPreset, ElementKind } from "./types";

type SeedDef = { name: string; on: ElementKind[] };

/**
 * 初回起動時に入れるプリセット。旧「シーン」機能の内容をそのまま引き継いでいる
 * （ON/OFF のみ・特定テンプレの指定なし）。以後は通常のプリセットとして
 * 名前変更・ON/OFF編集・削除ができる。
 */
const SEED_DEFS: SeedDef[] = [
  {
    name: "郵送交換",
    on: [
      "greeting",
      "packaging",
      "exchangeMethod",
      "paymentOffer",
      "address",
      "remittance",
      "closing",
    ],
  },
  {
    name: "現地交換",
    on: ["greeting", "exchangeMethod", "closing"],
  },
  {
    name: "仮約束",
    on: ["greeting", "closing"],
  },
  {
    name: "譲渡",
    on: ["greeting", "packaging", "exchangeMethod", "address", "closing"],
  },
  {
    name: "買取",
    on: ["greeting", "exchangeMethod", "paymentOffer", "address", "closing"],
  },
];

export function defaultPresets(): DmPreset[] {
  const now = new Date().toISOString();
  return SEED_DEFS.map((def) => {
    const enabled = {} as Record<ElementKind, boolean>;
    const selected = {} as Record<ElementKind, string | null>;
    for (const meta of ELEMENT_KINDS) {
      enabled[meta.kind] = def.on.includes(meta.kind);
      selected[meta.kind] = null;
    }
    return {
      id: newId(),
      name: def.name,
      enabled,
      selected,
      exchangeEnabled: true,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
    };
  });
}
