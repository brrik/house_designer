import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages デプロイ時のサブパス。
// リポジトリ名と一致させること（例: ユーザサイトなら '/'、project pages なら '/<repo>/'）。
// 環境変数 VITE_BASE で上書き可能。
const base = process.env.VITE_BASE ?? '/house_planner/';

export default defineConfig({
  base,
  plugins: [react()],
});
