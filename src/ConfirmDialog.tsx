import { useEffect } from "react";

type Props = {
  message: string;
  /** 実行ボタンのラベル */
  confirmLabel: string;
  /** 実行ボタンを赤（削除系）にする */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * window.confirm の代わりのアプリ内モーダル。
 * Esc でキャンセル、Enter で実行。背景クリックでキャンセル。
 */
export function ConfirmDialog({ message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button
            type="button"
            className={danger ? "danger-solid" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
