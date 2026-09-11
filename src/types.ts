/**
 * DM 文章を構成する要素タイプ。品物（item）は後回しのためここには含めない。
 * 並び順は DM 本文での登場順に合わせている。
 */
export type ElementKind =
  | "greeting" // 挨拶
  | "packaging" // 梱包方法
  | "exchangeMethod" // 交換方法
  | "paymentOffer" // 支払い方法の提示文
  | "address" // 住所
  | "remittance" // 振込先・PayPayリンク等
  | "closing"; // 締めの一言

/**
 * 全要素タイプ共通のテンプレ 1 件。
 * kind で種類を区別し、同じ登録・編集・削除・一覧の仕組みで扱う。
 */
export type TemplateEntry = {
  id: string;
  kind: ElementKind;
  /** 管理用の名前（自分が識別できればよい） */
  label: string;
  /** DM 本文にそのまま入るテキスト */
  body: string;
  createdAt: string;
  updatedAt: string;
  /**
   * DM 作成画面で最後に使われた時刻。一覧の「使用順ソート」に使う（今後）。
   * 未使用なら null。
   */
  lastUsedAt: string | null;
};

/**
 * 定型文。取引中〜終了のやりとりで、そのままコピーして使う完成文。
 * DM作成の要素組み立てとは別系統。
 */
export type QuickMessage = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

/**
 * DM 丸ごとプリセット。DM作成画面で組んだ状態をそのまま保存する。
 * 初期登録の「郵送交換・現地交換・仮約束（予約品）・譲渡・買取」も通常のプリセットとして扱う
 * （旧「シーン」機能はプリセットに統合済み）。
 * - enabled: 各要素タイプの ON/OFF（全 kind を保存）
 * - selected: 各要素タイプで選んだ TemplateEntry.id（全 kind を保存、未選択は null）
 * - exchangeEnabled: 「交換内容」欄の ON/OFF
 */
export type DmPreset = {
  id: string;
  name: string;
  enabled: Record<ElementKind, boolean>;
  selected: Record<ElementKind, string | null>;
  exchangeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};
