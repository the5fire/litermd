# MD Reader

基于 **Tauri 2 + Vite + TypeScript** 的 Markdown 桌面编辑器脚手架。目标平台：**macOS**。第一期实现「边写边预览」。

> 本仓库在 Linux 开发机上搭建：前端可用 `npm run dev` 验证；**未在此产出 .app**。完整原生壳请在 macOS 上编译。

## 产品边界

### 第一期（已实现 / 脚手架内可用）

- 打开 `.md` / `.markdown` / `.txt`（Tauri 系统对话框；浏览器模式用文件选择）
- 保存 / 另存为
- 左侧编辑、右侧实时 Markdown 渲染（`markdown-it`：表格、自动链接、代码高亮 `highlight.js`）
- 暗色主题（默认）
- 大纲（H1–H3），点击跳转到预览对应标题
- 窗口 / 标签标题显示文件名；未保存显示 `•` 提示
- 快捷键：打开 / 保存 / 另存为（Ctrl 或 ⌘）

### 第二期（规划，未实现）

- 多标签 / 最近文件
- 导出 PDF / HTML
- 自定义主题与字体
- 同步滚动（编辑 ↔ 预览）
- 图片拖拽插入与相对路径解析
- 全局搜索替换、拼写检查
- 菜单栏（macOS 原生菜单）与关于面板

## 技术栈

| 层 | 选型 |
|----|------|
| 桌面壳 | Tauri **2.x** |
| 前端 | Vite + 原生 TypeScript（无框架，便于维护） |
| Markdown | `markdown-it` + `highlight.js` |
| 文件 | `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` |

## macOS 依赖安装清单

在 **Apple Silicon 或 Intel Mac** 上准备一次开发环境：

1. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```
2. **Homebrew**（若尚未安装）：https://brew.sh
3. **Node.js 20+**（建议 LTS）
   ```bash
   brew install node
   ```
4. **Rust（rustup，建议最新稳定版；Tauri 2 近年插件可能要求较新的 rustc）**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup update stable
   ```
5. 确认工具链：
   ```bash
   node -v && npm -v && rustc -V && cargo -V
   ```

官方前置条件也可参考：https://tauri.app/start/prerequisites/

## 开发启动命令

```bash
cd md-reader
npm install
```

### 仅前端（任意 OS，含本 Linux box）

```bash
npm run dev
```

浏览器打开终端提示的地址（默认 `http://localhost:1420`）。工具栏会显示「浏览器预览」；打开/保存走文件选择与下载，用于验证渲染与大纲。

### macOS 完整桌面应用

```bash
npm run tauri dev
```

首次会编译 Rust 依赖，耗时较长。成功后应出现「MD Reader」窗口。

### 生产构建（仅在 macOS 上）

```bash
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/`（如 `.app` / `.dmg`）。**请勿在 Linux box 上期望产出 macOS .app。**

## 目录结构（节选）

```
md-reader/
├── index.html
├── package.json
├── vite.config.ts
├── public/samples/welcome.md   # npm run dev 自动加载的示例
├── samples/welcome.md
├── src/
│   ├── main.ts                 # UI 与状态
│   ├── markdown.ts             # markdown-it + 大纲
│   ├── file-io.ts              # Tauri / 浏览器文件抽象
│   └── styles.css              # 暗色主题布局
└── src-tauri/
    ├── tauri.conf.json
    ├── capabilities/default.json
    └── src/lib.rs
```

## 已知限制

- **当前 Linux box 缺少 WebKitGTK / GTK 等 Tauri Linux 依赖，且系统 rustc 可能偏旧，原生 `tauri dev` / `tauri build` 很可能失败。** 这不影响源码完整性；请在 macOS 上编译。
- 文件系统权限默认覆盖 `$HOME` / 文稿 / 桌面 / 下载等常见目录（见 `src-tauri/capabilities/default.json`）。若打开其他路径失败，需扩展 `fs:scope`。
- 第一期编辑器为 `textarea`，非完整代码编辑器（无行号、无语法着色编辑区）。
- 浏览器模式下「保存」为触发下载，无法写回原路径；未实现真正的路径关联。
- 预览默认关闭原始 HTML（`html: false`），以降低 XSS 风险。
- **本环境未生成可分发的 .app / .dmg。**

## 给协作者的最短路径

1. 在 Mac 上装好 Xcode CLT、Node 20+、rustup stable  
2. `git clone` / 拷贝本目录 → `npm install`  
3. `npm run dev` 先确认前端  
4. `npm run tauri dev` 跑桌面壳  
5. 改 `src/` 做 UI；改 `src-tauri/` 做权限与原生能力  

## License

脚手架内部使用；按团队约定即可。
