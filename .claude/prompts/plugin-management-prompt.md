# Prompt: 在 Electron 本地应用中复刻 Claude 插件管理界面

## 背景

我需要在一个 Electron 本地应用中实现一个插件管理模块，逻辑和 UI 完全参照下面的规格说明。该模块需要：读取本地文件系统中已安装的插件信息，展示插件列表（区分已启用/未启用），查看插件详情（MCP servers、Skills、Commands），以及切换插件启用/禁用状态。

---

## 数据源

插件数据**不存数据库**，全部来自本地磁盘文件。你需要用 Node.js 的 `fs/promises` 直接读取。

### 文件路径

```
~/.claude/plugins/installed_plugins.json   ← 插件注册表
~/.claude/settings.json                    ← 全局设置（含启用状态）
```

### `installed_plugins.json` 结构

```ts
interface InstalledPluginsFile {
  version?: number;
  plugins?: Record<string, PluginInstall[]>;
}

interface PluginInstall {
  scope?: string;         // "user" | "project" 等
  installPath?: string;   // 插件在磁盘上的安装目录绝对路径
  version?: string;
  installedAt?: string;   // ISO 时间字符串
  lastUpdated?: string;   // ISO 时间字符串
  gitCommitSha?: string;
}
```

每个插件 ID 格式为 `name@source`（如 `my-plugin@github`），用 `lastIndexOf("@")` 拆分。当同一 ID 有多条安装记录时，按 `lastUpdated` 降序取最新一条。

### `settings.json` 结构

```ts
interface ClaudeSettingsFile {
  enabledPlugins?: Record<string, boolean>;
  [key: string]: unknown;  // 其它字段不动
}
```

只有 `enabledPlugins[id] === true` 才算启用，缺失或其它值均视为禁用。

### 每个插件的本地目录结构

```
<installPath>/
  .claude-plugin/
    plugin.json              ← 插件清单
  skills/
    <skill-name>/
      SKILL.md               ← 包含 YAML frontmatter
  commands/
    <command-name>.md        ← 包含 YAML frontmatter
  .mcp.json                  ← MCP 服务器配置
```

#### `plugin.json` 清单结构

```ts
interface PluginManifest {
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  author?: { name?: string; email?: string };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}
```

#### `SKILL.md` / `commands/*.md` 的 frontmatter

用正则 `/^---\n([\s\S]*?)\n---/` 提取 YAML frontmatter，只需解析 `name` 和 `description` 两个 key。解析逻辑：逐行按首个 `:` 拆分 key/value，value 去除首尾引号。

#### `.mcp.json` 结构

兼容两种格式：
```jsonc
// 格式 A（直接是 server map）
{ "server-id": { "command": "...", "args": [...], "type": "...", "url": "...", "_meta": { "ideToolTitles": { "...": "..." } } } }

// 格式 B（包一层 mcpServers）
{ "mcpServers": { "server-id": { ... } } }
```

优先检查 `mcpServers` 字段，有则用之，否则直接用顶层对象。每个 server 的 `toolTitles` 从 `_meta.ideToolTitles` 中提取所有 string value。

---

## 导出的 TypeScript 类型

```ts
export interface InstalledPlugin {
  id: string;           // 原始 ID，如 "name@source"
  name: string;         // manifest.name ?? fallback
  displayName: string;  // manifest.displayName ?? manifest.name ?? fallback
  source: string;       // "@" 后面的部分，无 @ 则 "local"
  description: string;  // manifest.description ?? "暂无插件描述"
  version: string;      // manifest.version ?? install.version ?? "unknown"
  installPath: string;  // 安装目录绝对路径
  scope: string;        // install.scope ?? "user"
  author?: string;      // manifest.author.name
  homepage?: string;
  repository?: string;
  lastUpdated?: string;
  enabled: boolean;     // settings.enabledPlugins[id] === true
}

export interface PluginSkill {
  id: string;           // 目录名
  name: string;         // frontmatter.name ?? 目录名
  description: string;  // frontmatter.description ?? "暂无 Skill 描述"
  path: string;         // skill 目录绝对路径
}

export interface PluginCommand {
  id: string;           // 文件名去掉 .md
  name: string;         // frontmatter.name ?? 文件名去后缀
  description: string;  // frontmatter.description ?? "暂无命令描述"
  path: string;         // .md 文件绝对路径
}

export interface PluginMcpServer {
  id: string;           // server key
  command?: string;
  args?: string[];
  type?: string;        // 默认 "stdio"
  url?: string;
  toolTitles: string[];
}
```

---

## 数据读取函数规格

### `getEnabledPlugins(): Promise<Record<string, boolean>>`
读取 `~/.claude/settings.json`，返回 `enabledPlugins` 字段（空对象兜底）。

### `setPluginEnabled(id: string, enabled: boolean): Promise<Record<string, boolean>>`
读取 settings → 合并 `enabledPlugins[id] = enabled` → 写回文件 → 返回更新后的 map。写入前确保目录存在（`mkdir recursive`）。

### `getInstalledPlugins(): Promise<InstalledPlugin[]>`
并行读取 `installed_plugins.json` 和 `enabledPlugins` → 遍历所有 plugin entries → 对每个：取最新安装记录 → 读 manifest → 合并 enabled 状态 → 按 `name` 字母排序返回。

### `getInstalledPlugin(id: string): Promise<InstalledPlugin | null>`
调用 `getInstalledPlugins()` 然后 `.find()`。

### `getPluginSkills(plugin: InstalledPlugin): Promise<PluginSkill[]>`
读 `installPath/skills/` 目录 → 过滤出子目录 → 读每个子目录下的 `SKILL.md` → 解析 frontmatter → 按 name 排序。

### `getPluginCommands(plugin: InstalledPlugin): Promise<PluginCommand[]>`
读 `installPath/commands/` 目录 → 过滤出 `.md` 文件 → 读每个文件内容 → 解析 frontmatter → 按 name 排序。

### `getPluginMcpServers(plugin: InstalledPlugin): Promise<PluginMcpServer[]>`
读 `installPath/.mcp.json` → 兼容两种格式提取 server entries → 标准化每个 server → 按 id 排序。

---

## UI 规格

### 整体布局

左右分栏布局（如果 Electron app 有自己的 sidebar 可复用）：
- 左侧：应用侧边栏，包含一个"插件"入口，高亮当前路由
- 右侧：插件内容区域

### 插件列表页

- 标题"插件"，无额外描述
- 有插件时分两个 section：
  - "已启用" — 正常样式
  - "未启用" — 带 `opacity: 0.7`，hover 时恢复 `opacity: 1`
- 每个 section 标题旁显示数量 badge（`{n} 个`）
- 每个插件项是一个可点击行，布局为 `[图标] [名称 + 版本 badge + 描述] [右箭头(默认隐藏，hover显示)]`
- 空态：居中显示图标 + "暂无已安装插件" + "未从系统插件清单中读取到插件记录。"
- section 内无插件时显示虚线边框占位："暂无{title}插件。"

### 插件图标（PluginGlyph）

- 44×44px 圆角方块（`border-radius: 12px`）
- 颜色由插件名称确定性生成：字符编码之和 mod 360 得到色相 `hue`
- 背景是双层径向渐变：
  - 左上角 25% 20%：`hsl(hue 95% 78% / 0.55)`，透明 42%
  - 右下角 80% 75%：`hsl((hue+95)%360 92% 72% / 0.45)`，透明 45%
- 中心是一个 24×24px 雾玻璃圆角矩形（`bg-white/70 backdrop-blur-sm`），内含 Lucide 图标：
  - 插件：`Box` 图标
  - Skill：`Sparkles` 图标

### 插件详情页

- 顶部返回按钮（`← 返回`），链接回列表页
- 头部卡片（大圆角、阴影）：
  - 左侧：`PluginGlyph`
  - 右侧：
    - 第一行：displayName（大号标题）+ 版本 badge（`v{x.y.z}`）+ 启用状态文字（"已启用"/"未启用"）+ 启用/禁用 Switch
    - 如果 displayName !== name，name 显示为小字副标题
    - 描述段落
    - 底部行：作者（如有）+ homepage 链接（"网站"图标）+ repository 链接（"代码仓库"图标）
- 下方条件渲染三个 section（有数据才显示）：
  - **MCP** section：标题 + 数量 badge + "插件提供的 MCP" 描述 → 2 列卡片网格。每张卡片：server id + type badge（默认 "stdio"）+ 分隔线下：url（如有，可点击）+ 启动命令（如有，`code` 样式显示 `command args...`）
  - **Skills** section：标题 + 数量 badge + "插件提供的 Skills" → 2 列卡片。每张：name + description（最多2行截断）
  - **Commands** section：标题 + 数量 badge + "插件提供的 / 命令" → 2 列卡片。每张：name + description（最多2行截断）

### 启用/禁用交互（PluginEnabledSwitch）

- Switch 组件（类 Radix UI Switch）
- **乐观更新**：点击后立即翻转本地状态，同时发起请求
- 请求：`PATCH /api/plugins/{pluginId}/enabled`，body `{ enabled: boolean }`
- 成功：显示 toast（"插件已启用" / "插件已禁用"），刷新页面数据
- 失败：回滚本地状态，显示错误 toast（"插件状态更新失败"）
- 请求进行中禁用 Switch（`disabled`）

---

## API 规格

只有一个写入端点：

### `PATCH /api/plugins/{pluginId}/enabled`

- URL 参数 `pluginId` 需要 `decodeURIComponent`
- 先调用 `getInstalledPlugin(id)` 验证插件存在，不存在返回 404
- 验证 body `enabled` 必须是 boolean，否则返回 400
- 调用 `setPluginEnabled(id, enabled)` 写入磁盘
- 返回 `{ id, enabled }`

---

## 实现注意事项

1. **文件读取容错**：所有 `readFile` / `readJsonFile` 都用 `try/catch` 包裹，读取失败返回 `null` 或空数组，不抛异常
2. **目录创建**：写入 `settings.json` 前用 `mkdir(path.dirname, { recursive: true })` 确保目录存在
3. **排序**：插件列表按 `name.localeCompare` 排序，skills/commands/mcpServers 同理
4. **ID 编码**：所有 URL 中的 pluginId 使用 `encodeURIComponent` / `decodeURIComponent` 处理（ID 中可能包含 `@`、`/` 等字符）
5. **动态渲染**：列表页和详情页都标记为 `force-dynamic`（不缓存），因为数据来自文件系统随时可能变化
6. **Electron 适配**：`os.homedir()` 在 Electron 主进程中可用；如果在渲染进程中调用，需要通过 IPC 与主进程通信读取文件

---

## 技术栈参考（原项目）

- React 19 + TypeScript 严格模式
- Tailwind CSS v4
- Lucide React 图标库
- sonner（toast 通知）
- Radix UI Switch 组件

你的 Electron 项目如果使用不同技术栈，按上述逻辑和 UI 规格等价实现即可。
