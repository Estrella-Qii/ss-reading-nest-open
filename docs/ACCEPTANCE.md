# 第二阶段共读验收

## 自动化验收

```powershell
corepack pnpm@10.15.1 test:co-reading
```

这组测试覆盖：正文精确选区、有限上下文、ChatGPT 跟进消息、`create_annotation` 提示参数、双方批注 CRUD、operationId 幂等、正文版本校验，以及 Elias 批注在重新打开持久化 repository 后恢复。

## 本地独立预览

```powershell
corepack pnpm@10.15.1 install --frozen-lockfile
corepack pnpm@10.15.1 dev
```

1. 打开 Vite 输出的本地 Web 地址。
2. 导入一份不含私人信息的临时 TXT，进入小说阅读器。
3. 长按或拖动选择一句话，确认出现“叫 Elias 看这里 / 小辞划线 / 写批注”。
4. 创建小辞批注，点击划线后编辑，保存后应立即看到新内容。
5. 再次打开详情并删除；第一次点击只显示确认层，点击“确认删除”才真正删除。
6. Elias 批注在详情中应显示只读说明，且没有编辑、删除按钮。
7. 打开英文公版文学，搜索 Austen；断网时应出现错误和“重试”，无结果时应显示明确空状态。

## ChatGPT 中真实共读

1. 部署 Worker，或使用安全 HTTPS tunnel 暴露本地 MCP endpoint。
2. 在 ChatGPT 启用 Developer mode，通过 **Settings → Plugins** 添加开发版 App；MCP URL 使用 `/mcp/<MCP_PATH_TOKEN>`。
3. 新建对话，通过输入框的 **+ → More** 选择“和爸爸一起读”，让 ChatGPT 调用 `open_reading_nest`。
4. 打开一本测试书，选中一小段正文，点击“叫 Elias 看这里”。
5. 在 ChatGPT 的工具调用详情中核对 `send_current_context`：
   - 有 `selectedText`；
   - `selectedRange` 含准确的 paragraphIndex/startOffset/endOffset；
   - contextBefore/contextAfter 只包含选区附近内容；
   - 没有整本正文。
6. Elias 回复后应按提示调用 `create_annotation`，参数使用 `author=elias`、当前 sourceHash 与 segmentationVersion。
7. 等待阅读器自动刷新（最长约 4 秒），或重新打开 App；Elias 的划线仍应存在。
8. 点击 Elias 划线，确认能看到作者、原文、批注，且 UI 只读。
9. 在 ChatGPT 中明确要求 Elias 修改或删除自己的批注，确认分别调用 `update_annotation` / `delete_annotation`。

## 移动端检查

1. 先在 ChatGPT Web 添加 App，再在 iOS/Android ChatGPT 中打开同一 App。
2. 长按英文和中文文本，确认系统选区完成后操作菜单出现且不遮住底部安全区。
3. 打开“写批注”，确认键盘弹出后文本框和保存按钮可见。
4. 上下滚动正文，确认外层 ChatGPT 页面不会与正文滚动持续抢夺手势。
5. 横竖屏切换后，阅读位置和滚动位置应恢复。

## 仍需人工验证

- ChatGPT 真实 iframe 的长按选区行为、键盘高度和不同 iOS 版本的 selectionchange 时序。
- ChatGPT 是否按当前账户权限自动执行 `create_annotation`；写工具可能出现宿主确认，这是权限策略而非应用错误。
- HTTPS tunnel 与生产 Worker 的 CSP 快照刷新；资源 URI 已升级到 `app-v20.html`，部署后应在 Plugins 设置中执行 Refresh。
- Project Gutenberg 封面是外部静态资源；加载失败不影响搜索与正文导入。
