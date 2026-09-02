# tagpr 導入手順（調査メモ）

[Songmu/tagpr](https://github.com/Songmu/tagpr) は「未リリース変更を集めたリリース PR を常時維持し、マージ = リリース承認、その後タグ + GitHub Release を自動作成する」ツール。調査日: 2026-09-02（README / docs/guides/versioning.md 時点）。

## このリポジトリのセットアップ状態（2026-09-03）

**済（ローカル・コミット待ち）:**

- `.github/workflows/tagpr.yml` — tagpr 実行 + タグ作成時に bun test → build → npm publish
- `.tagpr` — `releaseBranch = main` / `versionFile = package.json`
- `package.json` に `prepublishOnly: bun run build`（空 dist の誤 publish 防止）

**未実施（GitHub 側 — リポジトリを push した後に実行）:**

```bash
# 1. リポジトリを push（リモート未設定のため）
gh repo create Comamoca/komeiji --source=. --push

# 2. GHA に PR 作成・承認を許可（tagpr の動作要件）
gh api -X PATCH repos/Comamoca/komeiji/actions/permissions/workflow \
  -f can_approve_pull_request_reviews=true

# 3. npm の automation token を secret に登録（対話入力）
gh secret set NPM_TOKEN
```

以降は `main` への push で tagpr が動き、リリース PR のマージ → 次回 push でタグ + npm publish まで自動実行される。

## 仕組み

1. `main`（release branch）に push されると未リリース変更を検出
2. リリース PR（head ブランチ `tagpr-from-*`）を作成 or 更新。バージョンファイルと `CHANGELOG.md` を更新
3. 人間がレビューしてマージ（= リリース承認）
4. 次回実行時に release branch の head へタグ付け + GitHub Release 作成

リリース PR は開いたまま放置してよく、`main` が進むと自動で追従更新される（rebase 相当を自動実行）。

## このリポジトリ向け導入手順

### 1. workflow 追加（`.github/workflows/tagpr.yml`）

```yaml
name: tagpr
on:
  push:
    branches: ["main"]

permissions:
  contents: write
  pull-requests: write
  issues: read

jobs:
  tagpr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - id: tagpr
        uses: Songmu/tagpr@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. リポジトリ設定（必須・手動）

**Settings > Actions > General > Workflow permissions** で **Allow GitHub Actions to create and approve pull requests** を有効化。これがないと PR 作成に失敗する（トラブルシュート項目の筆頭）。

### 3. `.tagpr` をコミット（自動生成もあるが明示が確実）

```ini
[tagpr]
    releaseBranch = main
    versionFile = package.json
```

- `versionFile = package.json` → リリース PR 内で `package.json` の `version` が更新される
- パスはリポジトリルート基準（Action 実行時）
- タグは `v1.2.3` 形式（`vPrefix` デフォルト有効）

### 4. push して最初の実行

初回に `.tagpr`（無ければ生成）、`.github/release.yml`（GitHub Release Notes 設定、無ければ生成）、リリース PR が作られる。**生成された `.tagpr` の `versionFile` 確認が推奨**（README の getting-started より）。

## バージョン決定ルール（label ベース。Conventional Commits は不要）

| 条件 | 提案バージョン |
|---|---|
| デフォルト | patch（v1.2.3 → v1.2.4） |
| リリース PR に `tagpr:minor`（または `tagpr/minor`） | minor（v1.3.0） |
| リリース PR に `tagpr:major`（または `tagpr/major`） | major（v2.0.0） |
| **version ファイルを PR 内で手動編集** | **その値が最優先** |

前回リリース以降にマージされた PR に付いた label（デフォルト `majorLabels = major` / `minorLabels = minor`、カンマ区切りで複数指定可）がリリース PR へ自動転記される。両方付いたら major 優先。

## npm publish との統合（重要な罠あり）

**`GITHUB_TOKEN` で作ったタグは別 workflow をトリガーしない。** タグを起点にした publish workflow を分けたい場合は GitHub App トークンが必要。簡便には同一 workflow 内で `tag` output を見て publish する:

```yaml
      - id: tagpr
        uses: Songmu/tagpr@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Publish to npm
        if: steps.tagpr.outputs.tag != ''
        run: bun publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- `NPM_TOKEN`（automation token）をリポジトリ secrets に登録
- `bun publish` は npm 互換。`npm publish` / `pnpm publish` でも可
- `outputs.tag` はタグを作った時のみ非空

## renovate との組み合わせの注意

- renovate が作る依存更新 PR は `dependabot[bot]` ではないため、**`major` / `minor` label が付いていると tagpr のバージョン提案に反映される**（dependabot 限定の除外）。renovate 側で label を付けていないなら patch 扱いで問題なし
- renovate の依存更新は通常 patch 扱い。破壊的更新を major として出したい場合はリリース PR に `tagpr:major` を手動で付けるか、version ファイルを編集する

## 初回リリースの実際（検証済み 2026-09-03）

タグ履歴がない初回は `v0.0.0` が起点になるが、**`package.json` の既存 `version`（0.1.0）が尊重され「Release for v0.1.0」の PR が自動作成された**（version ファイルの値が優先）。PR には `.github/release.yml` と `CHANGELOG.md` の初回生成も含まれる。→ そのままマージすれば v0.1.0 タグ + GitHub Release + npm publish が実行される。

なお manifest に version を書かない運用にする場合は `versionFile = -` でタグのみ管理も可能。

## 運用メモ

- リリース PR は開きっぱなしで OK。マージ頻度 = リリース頻度。小さく頻繁なリリースが推奨（README 記述）
- `changelog = false` で CHANGELOG 更新を止められる。`release = draft` でドラフトリリース化も可能
- モノレポでは `tagPrefix` でスコープ化（komeiji は単一パッケージなので不要）

## 参照

- <https://github.com/Songmu/tagpr>（README）
- <https://github.com/Songmu/tagpr/blob/main/docs/guides/versioning.md>（バージョンと label ルール）
- <https://github.com/Songmu/tagpr/blob/main/docs/getting-started.md>
- <https://github.com/Songmu/tagpr/blob/main/docs/guides/adopting-tagpr.md>（既存リポジトリへの導入）
