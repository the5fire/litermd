/** File I/O: Tauri dialog/fs when available, otherwise browser File API. */

export interface OpenResult {
  path: string | null;
  name: string;
  content: string;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Keep known text extensions; otherwise append .md (avoid foo.txt.md). */
function downloadFileName(suggestedName: string): string {
  if (/\.(md|markdown|txt)$/i.test(suggestedName)) return suggestedName;
  return `${suggestedName}.md`;
}

export async function openMarkdownFile(): Promise<OpenResult | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    });
    if (selected === null || Array.isArray(selected)) return null;
    const path = selected;
    const content = await readTextFile(path);
    const name = path.split(/[/\\]/).pop() ?? "untitled.md";
    return { path, name, content };
  }

  return new Promise((resolve) => {
    const input = document.getElementById("file-input") as HTMLInputElement;
    let settled = false;

    const finish = (result: OpenResult | null) => {
      if (settled) return;
      settled = true;
      input.removeEventListener("change", onChange);
      window.removeEventListener("focus", onWindowFocus);
      resolve(result);
    };

    const onChange = async () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file) {
        finish(null);
        return;
      }
      const content = await file.text();
      finish({ path: null, name: file.name, content });
    };

    // Cancel closes the dialog without "change"; detect via window focus return.
    const onWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled) finish(null);
      }, 300);
    };

    input.addEventListener("change", onChange);
    input.click();
    // Attach after click so we don't catch the pre-dialog focus cycle.
    window.setTimeout(() => {
      if (!settled) window.addEventListener("focus", onWindowFocus);
    }, 0);
  });
}


export async function openMarkdownPath(path: string): Promise<OpenResult> {
  if (!isTauri()) {
    throw new Error("openMarkdownPath requires Tauri");
  }
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  const content = await readTextFile(path);
  const name = path.split(/[/\\]/).pop() ?? "untitled.md";
  return { path, name, content };
}

export async function saveMarkdownFile(
  content: string,
  existingPath: string | null,
  suggestedName: string,
): Promise<{ path: string | null; name: string } | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    let path = existingPath;
    if (!path) {
      const picked = await save({
        defaultPath: suggestedName,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!picked) return null;
      path = picked;
    }
    await writeTextFile(path, content);
    const name = path.split(/[/\\]/).pop() ?? suggestedName;
    return { path, name };
  }

  // Browser: download as file
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadFileName(suggestedName);
  a.click();
  URL.revokeObjectURL(url);
  return { path: null, name: a.download };
}

export async function saveMarkdownFileAs(
  content: string,
  suggestedName: string,
): Promise<{ path: string | null; name: string } | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const picked = await save({
      defaultPath: suggestedName,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!picked) return null;
    await writeTextFile(picked, content);
    const name = picked.split(/[/\\]/).pop() ?? suggestedName;
    return { path: picked, name };
  }
  return saveMarkdownFile(content, null, suggestedName);
}

export async function setWindowTitle(title: string): Promise<void> {
  document.title = title;
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setTitle(title);
  } catch {
    /* ignore when window API unavailable */
  }
}
