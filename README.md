# House Planner

5cm 単位の方眼で間取りと家具を 2D 平面俯瞰図で計画するための Web ツール。
クライアント完結（LocalStorage 保存）、無料ホスティング (GitHub Pages) 対応。

## 開発

```sh
npm install
npm run dev      # http://localhost:5173/house_planner/
npm run build    # dist/ に静的ファイル出力
npm run preview  # ビルド後の動作確認
```

## デプロイ (GitHub Pages)

1. GitHub にリポジトリを作成し、リモートとして紐付け
2. リポジトリ Settings → Pages → Source を「GitHub Actions」に設定
3. `main` ブランチに push すれば `.github/workflows/deploy.yml` が自動でビルド・公開
4. ビルド時 `VITE_BASE` 環境変数はリポジトリ名から自動生成（`/<repo>/` 形式）

ローカル開発時は `vite.config.ts` の `base` がデフォルト `/house_planner/` なので、リポジトリ名を別にする場合は `VITE_BASE` を上書きするか `vite.config.ts` を調整してください。

## 主要ファイル

- `CLAUDE.md` — 仕様（決定事項を随時更新）
- `task.md` — 実装タスクの進捗管理（セッション再開時はこれを先に読む）

## 操作概要

- 上部タブで複数プランを切替・新規作成（既存プランからコピー可）
- 「間取り編集」モードで壁・ドア・窓・コンセント・情報コンセント・照明を配置
- 「間取り確定」で外周にトリミング → 家具配置モードへ
- 右ペインから家具テンプレートをドラッグ&ドロップでキャンバスへ配置
- 家具は選択時の回転ハンドルで 10度刻み回転、右クリック / 長押しで削除・複製
- JPG / PDF 出力（タブ名がファイル名、シンプル図 + 詳細図）
