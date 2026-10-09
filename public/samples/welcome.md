# MD Reader 欢迎页

这是可用 `npm run dev` 在浏览器里验证的示例文档。

## 第一期功能

- 打开 / 保存 / 另存为（Tauri 用系统对话框；浏览器用文件选择 / 下载）
- 左侧编辑、右侧实时预览
- 暗色主题（默认）
- 大纲（H1–H3）点击跳转
- 窗口标题显示文件名；未保存显示 `•`

## 代码块

```rust
fn main() {
    println!("Hello from MD Reader");
}
```

```bash
npm install
npm run dev
```

### 表格

| 项目 | 说明 |
|------|------|
| 编辑器 | textarea |
| 渲染 | markdown-it + highlight.js |
| 壳 | Tauri 2 |

> 在 macOS 上请使用 `npm run tauri dev` 启动完整桌面应用。
