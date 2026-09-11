import { useEffect } from "react";
import { useLocalStorageList } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";
import { defaultPresets } from "./defaultPresets";
import type { DmPreset, QuickMessage, TemplateEntry } from "./types";
import { hrefFor, useRoute } from "./route";
import { CategoryList } from "./CategoryList";
import { CategoryScreen } from "./CategoryScreen";
import { ComposeScreen } from "./ComposeScreen";
import { QuickScreen } from "./QuickScreen";
import { PresetsScreen } from "./PresetsScreen";
import { DataScreen } from "./DataScreen";
import { ThemeScreen } from "./ThemeScreen";
import { useTheme } from "./theme";
import { IconCompose, IconQuick, IconSettings } from "./icons";

export function App() {
  const templates = useLocalStorageList<TemplateEntry>(STORAGE_KEYS.templates);
  const presets = useLocalStorageList<DmPreset>(STORAGE_KEYS.presets);
  const quick = useLocalStorageList<QuickMessage>(STORAGE_KEYS.quickMessages);
  const [theme, setTheme] = useTheme();
  const route = useRoute();

  // 初回起動時（プリセットが一度も保存されていないとき）は
  // 旧シーン相当の5件を最初から入れておく
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.presets) === null) {
      presets.setItems(defaultPresets());
    }
    // eslint 無効環境。マウント時 1 回だけ
  }, []);

  const activeTab =
    route.name === "compose" ? "compose" : route.name === "quick" ? "quick" : "settings";

  return (
    <div className="app">
      <div className="app-body">
        {route.name === "compose" && (
          <ComposeScreen
            entries={templates.items}
            setEntries={templates.setItems}
            presets={presets.items}
            setPresets={presets.setItems}
          />
        )}
        {route.name === "quick" && (
          <QuickScreen messages={quick.items} setMessages={quick.setItems} />
        )}
        {route.name === "settings" && (
          <CategoryList entries={templates.items} presetCount={presets.items.length} />
        )}
        {route.name === "presets" && (
          <PresetsScreen
            presets={presets.items}
            setPresets={presets.setItems}
            entries={templates.items}
          />
        )}
        {route.name === "data" && <DataScreen />}
        {route.name === "theme" && <ThemeScreen theme={theme} setTheme={setTheme} />}
        {route.name === "category" && (
          <CategoryScreen
            kind={route.kind}
            entries={templates.items}
            setEntries={templates.setItems}
          />
        )}
      </div>

      <nav className="tabbar" aria-label="メインメニュー">
        <a
          className={activeTab === "compose" ? "tabbar-item active" : "tabbar-item"}
          href={hrefFor({ name: "compose" })}
        >
          <IconCompose />
          <span>DM作成</span>
        </a>
        <a
          className={activeTab === "quick" ? "tabbar-item active" : "tabbar-item"}
          href={hrefFor({ name: "quick" })}
        >
          <IconQuick />
          <span>定型文</span>
        </a>
        <a
          className={activeTab === "settings" ? "tabbar-item active" : "tabbar-item"}
          href={hrefFor({ name: "settings" })}
        >
          <IconSettings />
          <span>設定</span>
        </a>
      </nav>
    </div>
  );
}
