import { renderMarkdown, type TocItem } from "./markdown";
import {
  isTauri,
  openMarkdownFile,
  openMarkdownPath,
  saveMarkdownFile,
  saveMarkdownFileAs,
  setWindowTitle,
} from "./file-io";
import "highlight.js/styles/github-dark.css";

const DEFAULT_DOC = [
  "# MD Reader",
  "",
  "边写边预览的 Markdown 桌面编辑器（第一期脚手架）。",
  "",
  "## 快捷键",
  "",
  "| 操作 | Windows / Linux | macOS |",
  "|------|-----------------|-------|",
  "| 打开 | Ctrl+O | ⌘O |",
  "| 保存 | Ctrl+S | ⌘S |",
  "| 另存为 | Ctrl+Shift+S | ⌘⇧S |",
  "",
  "## 功能",
  "",
  "1. 左侧编辑，右侧实时预览",
  "2. 大纲（H1–H3）点击跳转",
  "3. 暗色主题",
  "4. 代码高亮",
  "5. 源码 / 预览滚动大致同步",
  "6. 拖拽 .md 到窗口打开",
  "",
  "```typescript",
  'const greeting = "Hello, Markdown!";',
  "console.log(greeting);",
  "```",
  "",
  "### 试试编辑",
  "",
  "修改左侧文本，右侧会立刻更新。",
  "",
].join("\n");

interface AppState {
  path: string | null;
  name: string;
  dirty: boolean;
  content: string;
}

const state: AppState = {
  path: null,
  name: "未命名.md",
  dirty: false,
  content: "",
};

const editor = () => document.getElementById("editor") as HTMLTextAreaElement;
const preview = () => document.getElementById("preview") as HTMLElement;
const previewPane = () =>
  document.querySelector(".preview-pane") as HTMLElement;
const tocEl = () => document.getElementById("toc") as HTMLElement;
const fileLabel = () => document.getElementById("file-label") as HTMLElement;
const dirtyBadge = () => document.getElementById("dirty-badge") as HTMLElement;
const statusMsg = () => document.getElementById("status-msg") as HTMLElement;
const wordCount = () => document.getElementById("word-count") as HTMLElement;
const tocPanel = () => document.getElementById("toc-panel") as HTMLElement;
const appRoot = () => document.getElementById("app") as HTMLElement;

let renderTimer: number | null = null;
/** Which pane the user is actively scrolling; the other follows. */
let scrollLeader: "editor" | "preview" | null = null;
let scrollLeaderTimer: number | null = null;

function setStatus(msg: string) {
  statusMsg().textContent = msg;
}

function updateChrome() {
  const mark = state.dirty ? " •" : "";
  fileLabel().textContent = state.name;
  dirtyBadge().hidden = !state.dirty;
  void setWindowTitle(`${state.name}${mark} — MD Reader`);
  const text = editor().value;
  const chars = text.length;
  const lines = text ? text.split("\n").length : 0;
  wordCount().textContent = `${lines} 行 · ${chars} 字`;
}

function renderToc(items: TocItem[]) {
  const nav = tocEl();
  nav.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "toc-empty";
    empty.textContent = "暂无标题";
    nav.appendChild(empty);
    return;
  }
  for (const item of items) {
    const a = document.createElement("a");
    a.href = `#${item.id}`;
    a.className = `toc-item toc-h${item.level}`;
    a.textContent = item.text;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = preview().querySelector(`#${CSS.escape(item.id)}`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    nav.appendChild(a);
  }
}

function doRender() {
  const source = editor().value;
  state.content = source;
  const { html, toc } = renderMarkdown(source);
  preview().innerHTML = html;
  renderToc(toc);
  updateChrome();
}

function scheduleRender() {
  if (renderTimer !== null) window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderTimer = null;
    doRender();
  }, 60);
}

function markDirty() {
  if (!state.dirty) {
    state.dirty = true;
    updateChrome();
  }
  scheduleRender();
}

function loadContent(content: string, name: string, path: string | null) {
  state.content = content;
  state.name = name;
  state.path = path;
  state.dirty = false;
  editor().value = content;
  doRender();
  setStatus(path ? `已打开：${path}` : `已加载：${name}`);
}

async function confirmDiscard(): Promise<boolean> {
  if (!state.dirty) return true;
  return window.confirm("当前文档有未保存的更改，确定丢弃吗？");
}

function isMarkdownLikeName(name: string): boolean {
  return /\.(md|markdown|txt)$/i.test(name);
}

async function onOpen() {
  if (!(await confirmDiscard())) return;
  try {
    const result = await openMarkdownFile();
    if (!result) {
      setStatus("已取消打开");
      return;
    }
    loadContent(result.content, result.name, result.path);
  } catch (err) {
    console.error(err);
    setStatus(`打开失败：${String(err)}`);
  }
}

async function openDroppedPath(path: string) {
  if (!isMarkdownLikeName(path)) {
    setStatus("仅支持拖入 .md / .markdown / .txt");
    return;
  }
  if (!(await confirmDiscard())) return;
  try {
    const result = await openMarkdownPath(path);
    loadContent(result.content, result.name, result.path);
  } catch (err) {
    console.error(err);
    setStatus(`拖拽打开失败：${String(err)}`);
  }
}

async function openDroppedBrowserFile(file: File) {
  if (!isMarkdownLikeName(file.name)) {
    setStatus("仅支持拖入 .md / .markdown / .txt");
    return;
  }
  if (!(await confirmDiscard())) return;
  const content = await file.text();
  loadContent(content, file.name, null);
}

async function onSave() {
  try {
    const content = editor().value;
    const result = await saveMarkdownFile(content, state.path, state.name);
    if (!result) {
      setStatus("已取消保存");
      return;
    }
    state.path = result.path;
    state.name = result.name;
    state.dirty = false;
    state.content = content;
    updateChrome();
    setStatus(result.path ? `已保存：${result.path}` : `已下载：${result.name}`);
  } catch (err) {
    console.error(err);
    setStatus(`保存失败：${String(err)}`);
  }
}

async function onSaveAs() {
  try {
    const content = editor().value;
    const result = await saveMarkdownFileAs(content, state.name);
    if (!result) {
      setStatus("已取消另存为");
      return;
    }
    state.path = result.path;
    state.name = result.name;
    state.dirty = false;
    state.content = content;
    updateChrome();
    setStatus(result.path ? `已另存为：${result.path}` : `已下载：${result.name}`);
  } catch (err) {
    console.error(err);
    setStatus(`另存为失败：${String(err)}`);
  }
}

async function onNew() {
  if (!(await confirmDiscard())) return;
  loadContent("", "未命名.md", null);
  state.dirty = false;
  updateChrome();
  setStatus("新建文档");
  editor().focus();
}

function isMod(e: KeyboardEvent) {
  return e.metaKey || e.ctrlKey;
}

function onKeydown(e: KeyboardEvent) {
  if (isMod(e) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (e.shiftKey) void onSaveAs();
    else void onSave();
  } else if (isMod(e) && e.key.toLowerCase() === "o") {
    e.preventDefault();
    void onOpen();
  }
}

/** Keep editor ↔ preview scroll positions roughly aligned by ratio.
 *  Only the pane the user is interacting with drives the other side,
 *  so programmatic scrollTop changes don't bounce back.
 */
function claimScrollLeader(who: "editor" | "preview") {
  scrollLeader = who;
  if (scrollLeaderTimer !== null) window.clearTimeout(scrollLeaderTimer);
  scrollLeaderTimer = window.setTimeout(() => {
    scrollLeader = null;
    scrollLeaderTimer = null;
  }, 120);
}

function syncScrollFrom(source: HTMLElement, target: HTMLElement) {
  const srcMax = source.scrollHeight - source.clientHeight;
  const tgtMax = target.scrollHeight - target.clientHeight;
  if (srcMax <= 0 || tgtMax <= 0) return;
  const next = (source.scrollTop / srcMax) * tgtMax;
  if (Math.abs(target.scrollTop - next) < 1) return;
  target.scrollTop = next;
}

function setupScrollSync() {
  const ed = editor();
  const pane = previewPane();
  const onUser = (who: "editor" | "preview") => (e: Event) => {
    // Wheel / touch / keys on this pane: user intent. Ignore scroll events
    // caused by the other side setting scrollTop (no recent user gesture).
    if (e.isTrusted) claimScrollLeader(who);
  };
  ed.addEventListener("wheel", onUser("editor"), { passive: true });
  pane.addEventListener("wheel", onUser("preview"), { passive: true });
  ed.addEventListener("touchmove", onUser("editor"), { passive: true });
  pane.addEventListener("touchmove", onUser("preview"), { passive: true });
  ed.addEventListener("pointerdown", onUser("editor"), { passive: true });
  pane.addEventListener("pointerdown", onUser("preview"), { passive: true });
  ed.addEventListener("keydown", (e) => {
    if (["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(e.key)) {
      claimScrollLeader("editor");
    }
  });

  ed.addEventListener(
    "scroll",
    () => {
      if (scrollLeader !== "editor") return;
      syncScrollFrom(ed, pane);
    },
    { passive: true },
  );
  pane.addEventListener(
    "scroll",
    () => {
      if (scrollLeader !== "preview") return;
      syncScrollFrom(pane, ed);
    },
    { passive: true },
  );
}

function setupHtmlDragDrop() {
  const root = appRoot();
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    root.classList.add("drag-over");
  };
  const clear = () => root.classList.remove("drag-over");
  root.addEventListener("dragenter", onDragOver);
  root.addEventListener("dragover", onDragOver);
  root.addEventListener("dragleave", (e) => {
    if (e.target === root) clear();
  });
  root.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clear();
    const file = e.dataTransfer?.files?.[0];
    if (file) void openDroppedBrowserFile(file);
  });
}

async function setupTauriDragDrop() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().onDragDropEvent((event) => {
      const payload = event.payload;
      if (payload.type === "enter" || payload.type === "over") {
        appRoot().classList.add("drag-over");
      } else if (payload.type === "leave") {
        appRoot().classList.remove("drag-over");
      } else if (payload.type === "drop") {
        appRoot().classList.remove("drag-over");
        const paths = payload.paths ?? [];
        const hit = paths.find((p) => isMarkdownLikeName(p));
        if (hit) void openDroppedPath(hit);
        else if (paths.length) setStatus("仅支持拖入 .md / .markdown / .txt");
      }
    });
  } catch (err) {
    console.warn("Tauri drag-drop unavailable", err);
  }
}

function loadWelcomeOrMock() {
  fetch("/samples/welcome.md")
    .then(async (r) => {
      if (!r.ok) throw new Error("no sample");
      return r.text();
    })
    .then((text) => {
      loadContent(text, "welcome.md", null);
      setStatus("已加载示例 welcome.md（浏览器预览模式）");
    })
    .catch(() => {
      loadContent(DEFAULT_DOC, "未命名.md", null);
      setStatus("就绪");
    });
}

window.addEventListener("DOMContentLoaded", () => {
  const env = document.getElementById("env-badge");
  if (env) env.textContent = isTauri() ? "Tauri" : "浏览器预览";

  document.getElementById("btn-open")?.addEventListener("click", () => void onOpen());
  document.getElementById("btn-save")?.addEventListener("click", () => void onSave());
  document.getElementById("btn-save-as")?.addEventListener("click", () => void onSaveAs());
  document.getElementById("btn-new")?.addEventListener("click", () => void onNew());

  document.getElementById("toggle-toc")?.addEventListener("change", (e) => {
    const on = (e.target as HTMLInputElement).checked;
    tocPanel().hidden = !on;
  });

  editor().addEventListener("input", () => markDirty());
  window.addEventListener("keydown", onKeydown);

  window.addEventListener("beforeunload", (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  setupScrollSync();
  setupHtmlDragDrop();

  if (isTauri()) {
    void setupTauriDragDrop();
    loadContent(DEFAULT_DOC, "未命名.md", null);
    setStatus("就绪（Tauri）");
  } else {
    loadWelcomeOrMock();
  }
});
