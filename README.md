# Disperse POC - 人事異動支援システム

Disperse は、企業の人事異動を効率化する AI 支援 Web サービスです。このリポジトリは POC（概念実証）版の実装です。

## 🚀 機能

- ✅ **Basic 認証システム** - シンプルなアクセス制御
- ✅ **AI チャット機能** - OpenAI GPT-4o-mini 統合
- ✅ **HTTPS 開発環境** - 自己署名証明書対応
- 🚧 **Excel ファイル読み込み** - 従業員データ管理（準備中）
- 🚧 **AI 分析・提案** - 人事異動最適化（準備中）

## 🛠️ 技術スタック

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **UI**: shadcn/ui + Radix UI
- **AI**: OpenAI GPT-4o-mini
- **Auth**: Basic 認証 + Cookie
- **Development**: Turbopack + HTTPS

## 📋 セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成し、以下の環境変数を設定：

```bash
# Basic認証
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your_secure_password_here

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# 開発設定
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=poc
```

⚠️ **重要**:

- `BASIC_AUTH_PASSWORD`には安全なパスワードを設定してください
- `.env.local`ファイルは Git にコミットしないでください（`.gitignore`で除外済み）
- 本番環境では環境変数を直接設定してください

### 3. 開発サーバーの起動

```bash
pnpm dev
```

HTTPS で開発サーバーが起動します：

- **URL**: `https://localhost:3000`
- **ログイン**: `admin` / `[設定したパスワード]`

## 📚 ドキュメント

詳細なドキュメントは [`docs/`](./docs/) ディレクトリを参照してください：

- [アーキテクチャ設計書](./docs/architecture.md) - システム設計と POC 要件
- [ドキュメント一覧](./docs/README.md) - 全ドキュメントの目次

## 🔧 開発

### スクリプト

```bash
pnpm dev          # 開発サーバー起動（HTTPS）
pnpm build        # プロダクションビルド
pnpm start        # プロダクションサーバー起動
pnpm lint         # ESLintチェック
```

### 開発フェーズ

- [x] **Phase 1**: Basic 認証 + AI チャット
- [ ] **Phase 2**: Excel ファイル読み込み
- [ ] **Phase 3**: AI 分析・提案機能
- [ ] **Phase 4**: パフォーマンス測定・最適化

## 🚀 デプロイ

Vercel でのデプロイに対応：

```bash
pnpm build
```

## 📄 ライセンス

このプロジェクトは POC（概念実証）用です。
