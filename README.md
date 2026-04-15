# communication-journal-tracker

一个可直接运行、可部署到 GitHub Pages 的“传播学期刊最新论文自动追踪与研究趋势总结”网站。

项目采用 `Vite + React + TypeScript` 构建前端，静态数据放在 `public/data/`，通过 GitHub Actions 定时抓取期刊目录、RSS 和 Crossref 数据，再把生成结果直接提交回仓库。前端不依赖传统后端，部署后就是一个纯静态站点。

## 功能概览

- 首页展示最新论文列表，支持按期刊、时间、关键词和全文搜索筛选
- 论文详情页展示中英双语标题、摘要、关键词、通俗总结和研究方向
- 趋势页展示最近 7 天、30 天、半年的热点与方法分布
- 期刊列表通过 `scripts/config/journals.json` 统一管理，抓取逻辑可扩展
- 支持 `bootstrap` 首次初始化抓取，也支持 `incremental` 每日增量更新
- GitHub Pages 路由兼容已处理：前端使用 `HashRouter`，并额外提供 `public/404.html`

## 目录结构

```text
communication-journal-tracker/
├─ .github/workflows/
│  ├─ bootstrap.yml
│  ├─ daily-update.yml
│  └─ deploy-pages.yml
├─ public/
│  ├─ 404.html
│  └─ data/
│     ├─ manifest.json
│     ├─ journals.json
│     ├─ trends.json
│     └─ papers/
├─ scripts/
│  ├─ bootstrap.ts
│  ├─ update.ts
│  ├─ config/journals.json
│  └─ lib/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ hooks/
│  ├─ lib/
│  ├─ pages/
│  ├─ providers/
│  └─ styles/
├─ index.html
├─ package.json
└─ vite.config.ts
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动前端开发服务器

```bash
npm run dev
```

默认会直接读取仓库里已经内置的示例数据 `public/data/`，所以不需要先跑抓取脚本也能看到页面。

### 3. 构建生产包

```bash
npm run build
```

构建完成后，静态产物会输出到 `dist/`，并自动复制 `index.html` 为 `404.html` 以兼容 GitHub Pages。

## 数据抓取脚本

### bootstrap 模式

首次初始化时使用，默认回看最近 180 天：

```bash
npm run data:bootstrap
```

可选参数：

```bash
npm run data:bootstrap -- --days=180 --limit=10
npm run data:bootstrap -- --journals=new-media-and-society,science-communication
```

### incremental 模式

每日更新时使用，只把新增论文合并进现有数据：

```bash
npm run data:incremental
```

同样支持：

```bash
npm run data:incremental -- --limit=5
npm run data:incremental -- --journals=communication-research
```

## 期刊配置

期刊配置文件在：

```text
scripts/config/journals.json
```

每个期刊至少包含以下字段：

```json
{
  "name": "New Media & Society",
  "slug": "new-media-and-society",
  "issn": "1461-4448",
  "publisher": "SAGE Publications",
  "homepage": "https://journals.sagepub.com/home/nms",
  "tocUrl": "https://journals.sagepub.com/toc/nmsa/current",
  "rssUrl": "https://journals.sagepub.com/action/showFeed?jc=nms&type=axatoc&feed=rss",
  "sourceType": "hybrid"
}
```

当前默认内置了少量传播学期刊样例：

- `New Media & Society`
- `Communication Research`
- `Science Communication`

后续新增期刊时，只需要在这个文件里追加配置即可。抓取逻辑会按 `RSS / TOC / Crossref` 组合尝试。

## 抓取策略说明

脚本逻辑位于 `scripts/lib/`，整体顺序如下：

1. 先尝试 RSS
2. 再尝试目录页 TOC
3. 然后调用 Crossref 按 ISSN 拉取近半年文章
4. 若摘要或关键词缺失，则访问详情页补抓
5. 优先按 DOI 去重；无 DOI 时按 `URL + 标题` 去重
6. 最后用大模型生成双语字段、通俗总结、研究方向和方法标签

如果没有配置模型 API Key，脚本会降级到本地 fallback 模式：

- 原文仍然会被保存
- 关键词缺失时会做简单推断
- 双语和通俗总结会使用规则模板兜底

这意味着本地无 Key 也能跑通流程，但想要更高质量的翻译和总结，建议配置模型。

## GitHub Secrets / Variables

GitHub Actions 预留了以下环境变量读取：

### Secrets

- `OPENAI_API_KEY`

### Repository Variables

- `OPENAI_MODEL`
- `OPENAI_BASE_URL`

如果你用的是兼容 OpenAI 接口的大模型服务，也可以直接把自定义 Base URL 和模型名填进去。

## GitHub Actions 工作流

### 1. `bootstrap.yml`

作用：

- 手动触发首次抓取
- 运行 `npm run data:bootstrap`
- 构建项目确认无误
- 把新的 `public/data/` 自动提交回仓库

触发方式：

1. 打开 GitHub 仓库
2. 进入 `Actions`
3. 选择 `Bootstrap Data`
4. 点击 `Run workflow`

你可以在触发时覆盖：

- `days_back`
- `limit_per_journal`

### 2. `daily-update.yml`

作用：

- 每天自动执行增量更新
- 运行 `npm run data:incremental`
- 若有新数据则自动提交

默认 cron 为：

```text
0 22 * * *
```

GitHub Actions 的 cron 使用 UTC。这个时间对应北京时间次日 `06:00`。

如果你想修改更新时间，只需要编辑：

```text
.github/workflows/daily-update.yml
```

里的 `schedule.cron` 即可。

### 3. `deploy-pages.yml`

作用：

- 在 `main` 分支有新提交时自动构建并部署到 GitHub Pages

## 部署到 GitHub Pages

### 推荐做法

1. 把仓库推到 GitHub
2. 打开仓库 `Settings`
3. 进入 `Pages`
4. Source 选择 `GitHub Actions`
5. 确保默认分支是 `main`

之后：

- 你手动跑 `bootstrap.yml` 生成初始数据
- 它会提交 `public/data/`
- `deploy-pages.yml` 会自动构建并发布站点

## base 路径与路由兼容

项目已经处理 GitHub Pages 常见问题：

- `vite.config.ts` 支持通过 `VITE_APP_BASE` 设置部署 base 路径
- `deploy-pages.yml` 默认把 `VITE_APP_BASE` 设置成 `/${repo-name}/`
- 前端使用 `HashRouter`，避免刷新子路由时 404
- 额外提供 `public/404.html` 兜底

如果你的仓库名不是 `communication-journal-tracker`，也不用手动改前端代码，默认工作流会自动使用当前仓库名作为 base。

## 数据格式

生成后的主要文件：

- `public/data/manifest.json`
- `public/data/journals.json`
- `public/data/trends.json`
- `public/data/papers/index.json`
- `public/data/papers/{paper-id}.json`

每篇论文至少包含：

- `id`
- `doi`
- `url`
- `journalName`
- `issn`
- `publishedAt`
- `authors`
- `title_en`
- `title_zh`
- `abstract_en`
- `abstract_zh`
- `keywords_en`
- `keywords_zh`
- `inferred_keywords_en`
- `inferred_keywords_zh`
- `plain_summary_zh`
- `plain_summary_en`
- `research_direction_zh`
- `research_direction_en`
- `method_tags_zh`
- `method_tags_en`
- `source`
- `fetchedAt`

## 可扩展建议

- 为不同出版社新增专门的 TOC 解析器
- 给 `scripts/config/journals.json` 扩展更多选择器字段
- 继续拆分趋势算法，增加更细的关键词聚类
- 把数据提交历史接到单独分支，做长期版本归档

## 备注

- 当前仓库自带的是示例静态数据，方便你开箱即看
- 真实运行时，GitHub Actions 会覆盖这些 JSON
- 如果某些期刊页面结构变化，优先改 `scripts/lib/detail.ts` 和 `scripts/lib/toc.ts`
