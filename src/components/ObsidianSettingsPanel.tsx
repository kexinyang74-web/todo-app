import { useState } from "react";
import { useTodoStore } from "../store/todoStore";

const fieldCls =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

const btnCls =
  "min-h-10 cursor-pointer rounded-xl px-4 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

// Obsidian 同步设置面板：配置插件连接、测试连接、手动导出/导入
function ObsidianSettingsPanel() {
  const obsidian = useTodoStore((s) => s.obsidian);
  const lastError = useTodoStore((s) => s.lastError);
  const setObsidianSettings = useTodoStore((s) => s.setObsidianSettings);
  const testObsidianConnection = useTodoStore((s) => s.testObsidianConnection);
  const exportToObsidian = useTodoStore((s) => s.exportToObsidian);
  const importFromObsidian = useTodoStore((s) => s.importFromObsidian);

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<"test" | "export" | "import" | null>(null);

  const connected = obsidian.enabled && obsidian.apiKey.trim() !== "";
  const disabled = !connected || busy !== null;

  async function run(action: "test" | "export" | "import") {
    setBusy(action);
    setStatus(null);
    const res =
      action === "test"
        ? await testObsidianConnection()
        : action === "export"
          ? await exportToObsidian()
          : await importFromObsidian();
    setStatus(res.ok ? `✅ ${res.message}` : `❌ ${res.error}`);
    setBusy(null);
  }

  function handleImport() {
    // 整表替换属于破坏性操作，先确认再执行
    if (!confirm("从 Obsidian 导入将替换当前全部任务，确定继续吗？")) return;
    void run("import");
  }

  return (
    <section
      aria-label="Obsidian 同步设置"
      className="rounded-2xl bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Obsidian 同步</h2>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            aria-label="启用 Obsidian 同步"
            checked={obsidian.enabled}
            onChange={(e) => setObsidianSettings({ enabled: e.target.checked })}
            className="size-4 cursor-pointer accent-sky-500"
          />
          启用
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="password"
          aria-label="Obsidian API Key"
          value={obsidian.apiKey}
          onChange={(e) => setObsidianSettings({ apiKey: e.target.value })}
          placeholder="插件设置里的 API Key"
          className={fieldCls}
        />
        <div className="flex gap-2">
          <input
            type="number"
            aria-label="Obsidian 端口"
            value={obsidian.port}
            onChange={(e) =>
              setObsidianSettings({ port: Number(e.target.value) || 27123 })
            }
            className={`${fieldCls} w-28`}
          />
          <input
            aria-label="Obsidian 文件路径"
            value={obsidian.filePath}
            onChange={(e) => setObsidianSettings({ filePath: e.target.value })}
            placeholder="todo.md"
            className={`${fieldCls} min-w-0 flex-1`}
          />
        </div>
      </div>

      <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          aria-label="自动同步到 Obsidian"
          checked={obsidian.autoSync}
          onChange={(e) => setObsidianSettings({ autoSync: e.target.checked })}
          className="size-4 cursor-pointer accent-sky-500"
        />
        自动同步：本地改动自动写入 Obsidian（1 秒防抖，仅本地 → 文件）
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run("test")}
          className={`${btnCls} border border-sky-200 text-sky-600 hover:bg-sky-50`}
        >
          测试连接
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run("export")}
          className={`${btnCls} bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:opacity-90`}
        >
          导出到 Obsidian
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleImport}
          className={`${btnCls} border border-slate-200 text-slate-600 hover:bg-slate-50`}
        >
          从 Obsidian 导入
        </button>
      </div>

      {status && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {status}
        </p>
      )}

      {lastError && (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
          排查提示：确认 Obsidian 已打开、已安装并启用 Local REST API 插件、
          插件设置中开启 CORS，并允许浏览器访问本地网络。
        </div>
      )}
    </section>
  );
}

export default ObsidianSettingsPanel;
