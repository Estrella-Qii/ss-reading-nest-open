# Cloudflare 私有部署

项目继续使用 Cloudflare Worker + D1 + 私有 R2，不需要 Supabase。

## 配置清单

运行时：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `MCP_PATH_TOKEN` | Worker secret | 保护 `/mcp/<token>` 与 `/source/<token>/*` 私有路径；必须使用随机长值 |
| `DB` | D1 binding | 会话、书签、短评和双方批注 |
| `SOURCES_BUCKET` | 私有 R2 binding | 私人导入正文和漫画源文件 |

部署/烟测环境变量（不写入 Worker）：

| 名称 | 用途 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | CI 或脚本定位 Cloudflare 账户 |
| `CLOUDFLARE_API_TOKEN` | CI/自动部署；本机可改用 `wrangler login` |
| `D1_DATABASE_ID` | 创建 D1 后填入 `server/wrangler.jsonc` 的非 secret ID |
| `R2_BUCKET_NAME` | 默认 `ss-reading-nest-sources` |
| `WORKER_URL` | 远端烟测 Worker origin |
| `SMOKE_D1_DATABASE_ID` | 远端烟测使用的 D1 ID |

本地 Node server 还支持非敏感的 `PORT`，默认 `8787`。

## 部署步骤

```powershell
corepack pnpm@10.15.1 install --frozen-lockfile
corepack pnpm@10.15.1 --filter @ss/server exec wrangler login
corepack pnpm@10.15.1 --filter @ss/server exec wrangler d1 create ss-reading-nest-db
corepack pnpm@10.15.1 --filter @ss/server exec wrangler r2 bucket create ss-reading-nest-sources
```

1. 把 D1 创建命令返回的 `database_id` 填入 `server/wrangler.jsonc`；它不是 secret。
2. 不修改 R2 binding 名 `SOURCES_BUCKET`，bucket 保持私有，不配置 public development URL 或 custom domain。
3. 写入私密路径 token：

```powershell
corepack pnpm@10.15.1 --filter @ss/server exec wrangler secret put MCP_PATH_TOKEN
```

4. 应用 D1 migration、验证并部署：

```powershell
corepack pnpm@10.15.1 --filter @ss/server exec wrangler d1 migrations apply ss-reading-nest-db --remote
corepack pnpm@10.15.1 typecheck
corepack pnpm@10.15.1 test
corepack pnpm@10.15.1 build
corepack pnpm@10.15.1 --filter @ss/server deploy
```

5. 验证公开健康检查：`https://<worker-host>/health`。
6. 私人 MCP URL 为 `https://<worker-host>/mcp/<MCP_PATH_TOKEN>`。不要把完整 URL 写入 Git、日志、截图或公开文档。

## 隐私边界

- D1 没有公开 HTTP 查询入口；会话和批注只经带 token 的 MCP 路径访问。
- R2 不启用公开访问；正文恢复、上传只经 `/source/<MCP_PATH_TOKEN>/*`。
- `/public-domain/*` 是公开只读代理，只处理 Gutendex/Project Gutenberg 公版元数据和公版正文，不读取 D1、R2 或私人批注。
- Worker 日志不得输出 token、完整正文、批注内容、R2 object key 或请求 body。
- secrets 只使用 `wrangler secret` 或部署平台的加密环境变量；不要填写进 `.env.example`、`wrangler.jsonc` 或 Git。
