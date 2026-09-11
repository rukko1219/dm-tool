import type { ElementKind } from "./types";

export type ElementKindMeta = {
  kind: ElementKind;
  /** カテゴリ表示名 */
  label: string;
  /** 一覧に出す short な説明 */
  description: string;
  /** body 入力欄のラベル */
  bodyLabel: string;
  /** 名前欄のプレースホルダ */
  labelPlaceholder: string;
  /** body 欄のプレースホルダ（サンプル文） */
  bodyPlaceholder: string;
  /** body 入力欄の行数 */
  rows: number;
  /** 個人情報系（住所・振込先）。注意書きを表示する */
  personal: boolean;
};

/** DM 本文での登場順に並べる */
export const ELEMENT_KINDS: ElementKindMeta[] = [
  {
    kind: "greeting",
    label: "挨拶",
    description: "最初のあいさつ文",
    bodyLabel: "文面",
    labelPlaceholder: "例）初取引",
    bodyPlaceholder: "初めまして、ご連絡ありがとうございます。",
    rows: 2,
    personal: false,
  },
  {
    kind: "packaging",
    label: "梱包方法",
    description: "品物の梱包方法の説明",
    bodyLabel: "文面",
    labelPlaceholder: "例）缶バッジ",
    bodyPlaceholder: "梱包はOpp+プチプチ2重+水濡れ防止Oppにて発送予定です。",
    rows: 2,
    personal: false,
  },
  {
    kind: "exchangeMethod",
    label: "交換方法",
    description: "郵送・手渡しなどの交換方法",
    bodyLabel: "文面",
    labelPlaceholder: "例）郵送",
    bodyPlaceholder: "郵便窓口から普通郵便で発送予定です。",
    rows: 2,
    personal: false,
  },
  {
    kind: "paymentOffer",
    label: "支払い方法",
    description: "支払い方法の提示文",
    bodyLabel: "文面",
    labelPlaceholder: "例）Paypay/銀行振込",
    bodyPlaceholder:
      "お支払いは銀行振込、PayPayどちらでも対応可能です。",
    rows: 3,
    personal: false,
  },
  {
    kind: "address",
    label: "住所",
    description: "発送元の住所",
    bodyLabel: "内容",
    labelPlaceholder: "例）自宅",
    bodyPlaceholder: "〒000-0000\n○○県○○市△△ 1-2-3\n氏名",
    rows: 4,
    personal: true,
  },
  {
    kind: "remittance",
    label: "支払先提示",
    description: "振込先や決済リンク",
    bodyLabel: "内容",
    labelPlaceholder: "例）○○銀行",
    bodyPlaceholder:
      "○○銀行 ○○支店 普通 1234567 氏名",
    rows: 4,
    personal: true,
  },
  {
    kind: "closing",
    label: "締めの一言",
    description: "文末のあいさつ",
    bodyLabel: "文面",
    labelPlaceholder: "例）標準",
    bodyPlaceholder: "引き続きよろしくお願いします。",
    rows: 2,
    personal: false,
  },
];

export function getKindMeta(kind: ElementKind): ElementKindMeta {
  const meta = ELEMENT_KINDS.find((k) => k.kind === kind);
  if (!meta) throw new Error(`未知の要素タイプ: ${kind}`);
  return meta;
}
