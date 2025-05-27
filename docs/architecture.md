# Disperse - 人事異動支援システム アーキテクチャ設計書 (POC 版)

## 概要

Disperse の POC（概念実証）版は、一企業向けの人事異動支援 AI システムです。ローカルの Excel ファイルを読み込み、AI による異動提案のパフォーマンスを測定・検証します。

## POC 要件

### 機能要件（最小限）

- **簡易認証**: Basic 認証による基本的なアクセス制御
- **データ読み込み**: ローカル Excel ファイルの直接読み込み・解析（アップロード不要）
- **AI 分析**: 従業員データの自然言語処理と適性分析
- **提案機能**: 人事異動の最適化提案
- **結果表示**: 提案結果の可視化
- **パフォーマンス測定**: AI 分析の精度・速度測定

### 非機能要件（簡素化）

- **パフォーマンス**: AI 分析の応答時間測定
- **精度**: 提案の妥当性評価
- **コスト**: API 使用量の監視

## 技術スタック（POC 版）

### フロントエンド

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Authentication**: Basic 認証（Next.js middleware）
- **Excel Processing**: xlsx
- **Charts**: Recharts

### バックエンド

- **Runtime**: Next.js API Routes
- **Authentication**: Basic 認証 middleware
- **File Processing**: Node.js fs module（ローカルファイル直接読み込み）
- **Excel Parser**: xlsx (server-side)
- **Data Storage**: メモリ内 + JSON ファイル（永続化）

### AI・機械学習

- **Primary**: OpenAI GPT-4 API
- **Secondary**: Google Gemini API（比較検証用）
- **Text Processing**: 基本的な文字列処理

### インフラ・デプロイ

- **Development**: ローカル開発環境
- **Hosting**: Vercel（後のデプロイ用）
- **Monitoring**: コンソールログ + 基本メトリクス

## 簡素化されたアーキテクチャ図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │    │   (API Routes)  │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Basic Auth    │◄──►│ • Auth Check    │◄──►│ • OpenAI API    │
│ • Data View     │    │ • File Reader   │    │ • Gemini API    │
│ • Results       │    │ • AI Analysis   │    │                 │
│ • Metrics       │    │ • Proposals     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## データ構造（メモリ内）

### 従業員データ型

```typescript
interface Employee {
  id: string
  name: string
  department: string
  position: string
  personality: string
  experience: string
  aspirations: string
  skills: string[]
  // Excelから読み込んだ生データ
  rawData: Record<string, any>
}

interface Department {
  name: string
  description: string
  requiredSkills: string[]
  currentMembers: string[] // employee IDs
}

interface TransferProposal {
  employeeId: string
  employeeName: string
  fromDepartment: string
  toDepartment: string
  confidenceScore: number
  reasoning: string
  aiModel: 'openai' | 'gemini'
  processingTime: number
  timestamp: Date
}
```

## API 設計（簡素化）

### 認証

- `POST /api/auth/login` - Basic 認証ログイン
- `POST /api/auth/logout` - ログアウト

### ファイル処理

- `POST /api/load-excel` - ローカル Excel ファイル読み込み・解析
- `GET /api/data` - 読み込み済みデータ取得
- `DELETE /api/data` - データクリア

### AI 分析

- `POST /api/analyze` - 一括 AI 分析実行
- `GET /api/proposals` - 異動提案取得
- `GET /api/metrics` - パフォーマンスメトリクス取得

### 比較検証

- `POST /api/compare` - OpenAI vs Gemini 比較分析

## ファイル構造（POC 版）

```
disperse/
├── app/
│   ├── login/
│   │   └── page.tsx            # Basic認証ログインページ
│   ├── page.tsx                 # メインページ（データ表示）
│   ├── results/
│   │   └── page.tsx            # 分析結果表示
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts    # Basic認証
│   │   │   └── logout/
│   │   │       └── route.ts    # ログアウト
│   │   ├── load-excel/
│   │   │   └── route.ts        # ローカルファイル読み込み
│   │   ├── analyze/
│   │   │   └── route.ts        # AI分析実行
│   │   ├── proposals/
│   │   │   └── route.ts        # 提案取得
│   │   └── metrics/
│   │       └── route.ts        # メトリクス取得
│   ├── globals.css
│   ├── layout.tsx
│   └── middleware.ts           # Basic認証middleware
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── LoginForm.tsx           # Basic認証フォーム
│   ├── DataTable.tsx           # データ表示テーブル
│   ├── ProposalCard.tsx        # 提案カード
│   ├── MetricsChart.tsx        # メトリクス表示
│   └── ComparisonView.tsx      # AI比較表示
├── lib/
│   ├── auth.ts                 # Basic認証ユーティリティ
│   ├── excel-parser.ts         # Excel解析
│   ├── ai/
│   │   ├── openai.ts          # OpenAI統合
│   │   ├── gemini.ts          # Gemini統合
│   │   └── analyzer.ts        # 分析ロジック
│   ├── data-store.ts          # メモリ内データ管理
│   ├── metrics.ts             # パフォーマンス測定
│   └── utils.ts
├── types/
│   ├── employee.ts            # 従業員型定義
│   ├── proposal.ts            # 提案型定義
│   └── metrics.ts             # メトリクス型定義
├── data/                      # ローカルデータ保存
│   ├── excel/                 # 読み込み対象Excelファイル
│   ├── processed/             # 処理済みJSON
│   └── results/               # 分析結果
├── .env.local
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## 開発フェーズ（POC 版）

### Phase 1: 基本機能 (1 週間)

- [ ] Basic 認証システム実装
- [ ] ローカル Excel ファイル読み込み・解析
- [ ] 基本 UI（認証、データ表示）
- [ ] OpenAI API 統合
- [ ] 基本的な異動提案生成

### Phase 2: AI 比較・メトリクス (1 週間)

- [ ] Gemini API 統合
- [ ] AI 比較機能
- [ ] パフォーマンス測定
- [ ] 結果可視化

### Phase 3: 最適化・検証 (1 週間)

- [ ] 提案精度の改善
- [ ] UI/UX 改善
- [ ] メトリクス詳細化
- [ ] 検証レポート作成

## 環境変数（POC 版）

```bash
# Basic認証
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your_secure_password_here

# AI APIs
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# 開発設定
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=poc
```

## パフォーマンス測定項目

### AI 分析メトリクス

- **応答時間**: API 呼び出しから結果取得まで
- **精度**: 提案の妥当性（手動評価）
- **コスト**: トークン使用量・API 料金
- **成功率**: エラー率・失敗率

### システムメトリクス

- **ファイル処理時間**: Excel 解析速度
- **メモリ使用量**: データ保持量
- **UI 応答性**: ユーザー操作の快適性

## 想定 Excel データ形式

```
| 社員ID | 氏名 | 部署 | 役職 | 性格・特徴 | 経歴・スキル | 希望・目標 |
|--------|------|------|------|------------|--------------|------------|
| E001   | 田中 | 営業 | 主任 | 積極的...  | Java, 5年... | 管理職...  |
| E002   | 佐藤 | 開発 | SE   | 慎重...    | Python...    | 新技術...  |
```

## 今後の本格版への移行

POC で検証後、以下を追加予定：

- データベース導入（Supabase）
- 認証システム
- マルチ企業対応
- セキュリティ強化
- スケーラビリティ対応
