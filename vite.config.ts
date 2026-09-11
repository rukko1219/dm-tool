import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ローカル専用。dev サーバは 127.0.0.1 のみで待ち受け、LAN には公開しない。
// base はビルド時（GitHub Pages 配信用）だけ "/dm-tool/" にする。
// dev サーバはこれまで通りルート直下で動く。
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/dm-tool/" : "/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
}));
