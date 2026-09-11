import { useRef, useState, type ChangeEvent } from "react";
import { navigate } from "./route";
import { IconArrowLeft } from "./icons";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  downloadBackup,
  mergeBackupIntoStorage,
  parseBackup,
  type BackupData,
  type MergeResult,
} from "./backup";

type Pending = { fileName: string; data: BackupData };

export function DataScreen() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを続けて選べるように
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseBackup(String(reader.result));
        setPending({ fileName: file.name, data });
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
      }
    };
    reader.onerror = () => setError("ファイルの読み取りに失敗しました。");
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pending) return;
    const res = mergeBackupIntoStorage(pending.data);
    setPending(null);
    setResult(res);
    // localStorage を直接書き換えたので、状態を確実に合わせるため再読み込み
    window.setTimeout(() => window.location.reload(), 800);
  }

  return (
    <>
      <header className="screen-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate({ name: "settings" })}
          aria-label="戻る"
        >
          <IconArrowLeft />
        </button>
        <h1>データの移行</h1>
      </header>

      <p className="screen-intro">
        機種変更やブラウザの変更でデータを移すときに使います。普段の利用では操作は不要です（データはこのブラウザ内に自動保存されています）。
      </p>

      <div className="menu-card data-card">
        <h2>エクスポート</h2>
        <p className="data-desc">
          登録したテンプレ・プリセット・シーンの変更を、1 つの JSON ファイルに書き出します。
        </p>
        <button type="button" className="primary" onClick={downloadBackup}>
          エクスポート
        </button>
      </div>

      <div className="menu-card data-card">
        <h2>インポート</h2>
        <p className="data-desc">
          書き出したファイルを読み込み、今のデータに追加します（同じ項目は取り込むファイルの内容で上書き）。
        </p>
        <button type="button" onClick={() => fileRef.current?.click()}>
          ファイルを選ぶ
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFile}
        />
        {error && <p className="error">{error}</p>}
        {result && (
          <p className="data-result">
            取り込みました（テンプレ +{result.templatesAdded}／更新 {result.templatesUpdated}、
            プリセット +{result.presetsAdded}／更新 {result.presetsUpdated}、
            定型文 +{result.quickAdded}／更新 {result.quickUpdated}）。画面を再読み込みします。
          </p>
        )}
      </div>

      <p className="personal-note">
        書き出したファイルには住所・振込先がそのまま含まれます。クラウド同期フォルダやメール添付など、外部に出る場所に置かないでください。
      </p>

      {pending && (
        <ConfirmDialog
          message={
            `「${pending.fileName}」を取り込みます。\n` +
            `テンプレ ${pending.data.templates.length} 件、プリセット ${pending.data.presets.length} 件、` +
            `定型文 ${pending.data.quickMessages.length} 件。\n` +
            `今のデータに追加され、同じ項目は上書きされます。`
          }
          confirmLabel="取り込む"
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
