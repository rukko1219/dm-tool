/** localStorage のキーを 1 か所に集約 */
export const STORAGE_KEYS = {
  templates: "dm-tool:templates:v1",
  presets: "dm-tool:presets:v1",
  /** 定型文（コピペ用の完成文） */
  quickMessages: "dm-tool:quick-messages:v1",
  /** テーマカラー（背景・カード・文字・アクセント） */
  theme: "dm-tool:theme:v1",
  /** 交換内容欄（自分／相手）の入力履歴 */
  exchangeHistory: "dm-tool:exchange-history:v1",
  /** 交換内容行の表示形式（行頭の語句・区切り記号） */
  exchangeFormat: "dm-tool:exchange-format:v1",
  /** DM 作成中の下書き。バックアップ対象外（一時データ） */
  composeDraft: "dm-tool:compose-draft:v1",
} as const;
