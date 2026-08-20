export interface ObsidianConnection {
  apiKey: string;
  port: number;
  filePath: string;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<HttpResponse>;

export type ConnectionProbe = "ok" | "auth-failed" | "unreachable";

const TIMEOUT_MS = 5000;
const BASE_HOST = "127.0.0.1";

export class ObsidianApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "unauthorized" | "network" | "timeout" | "not-found" | "invalid"
  ) {
    super(message);
    this.name = "ObsidianApiError";
  }
}

// 路径逐段编码（反斜杠归一为斜杠），防止 %2F 目录穿越
function encodeVaultPath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function buildVaultUrl(conn: ObsidianConnection, path: string): string {
  const encoded = encodeVaultPath(path.trim());
  if (!encoded) {
    throw new ObsidianApiError("文件路径不能为空", "invalid");
  }
  return `http://${BASE_HOST}:${conn.port}/v1/vault/${encoded}`;
}

function authHeaders(conn: ObsidianConnection): Record<string, string> {
  return {
    Authorization: `Bearer ${conn.apiKey}`,
    Accept: "text/markdown",
  };
}

async function request(url: string, init: RequestInit, fetchImpl: FetchLike): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (err) {
    // DOMException 不是 Error 子类，统一按 name 判断 AbortError
    if ((err as { name?: string } | null)?.name === "AbortError") {
      throw new ObsidianApiError("连接超时，请确认 Obsidian 插件服务已启动", "timeout");
    }
    throw new ObsidianApiError(
      `无法连接到 Obsidian（${BASE_HOST}:${url.match(/:(\d+)\//)?.[1] ?? ""}），请确认 Obsidian 已打开且 Local REST API 插件已启用`,
      "network"
    );
  } finally {
    clearTimeout(timer);
  }
}

function assertAuthorized(resp: HttpResponse): void {
  if (resp.status === 401 || resp.status === 403) {
    throw new ObsidianApiError("API Key 不正确或已失效（401/403）", "unauthorized");
  }
}

export async function readVaultFile(
  conn: ObsidianConnection,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<string | null> {
  const url = buildVaultUrl(conn, conn.filePath);
  const resp = await request(
    url,
    { method: "GET", headers: authHeaders(conn) },
    fetchImpl
  );
  if (resp.status === 404) return null;
  assertAuthorized(resp);
  if (!resp.ok) {
    throw new ObsidianApiError(`读取失败（HTTP ${resp.status}）`, "invalid");
  }
  return resp.text();
}

export async function writeVaultFile(
  conn: ObsidianConnection,
  content: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<void> {
  const url = buildVaultUrl(conn, conn.filePath);
  const resp = await request(
    url,
    {
      method: "PUT",
      headers: { ...authHeaders(conn), "Content-Type": "text/markdown" },
      body: content,
    },
    fetchImpl
  );
  if (resp.status === 404) {
    throw new ObsidianApiError(`目标文件路径不存在（404），请检查文件路径：${conn.filePath}`, "not-found");
  }
  assertAuthorized(resp);
  if (!resp.ok) {
    throw new ObsidianApiError(`写入失败（HTTP ${resp.status}）`, "invalid");
  }
}

// 连接探测：优先 /v1/vault/，老版本插件回退 /vault/
export async function testObsidianConnection(
  conn: ObsidianConnection,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<ConnectionProbe> {
  const base = `http://${BASE_HOST}:${conn.port}`;
  try {
    let resp = await request(
      `${base}/v1/vault/`,
      { method: "GET", headers: authHeaders(conn) },
      fetchImpl
    );
    if (resp.status === 404) {
      resp = await request(`${base}/vault/`, { method: "GET", headers: authHeaders(conn) }, fetchImpl);
    }
    if (resp.status === 401 || resp.status === 403) return "auth-failed";
    return resp.ok ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}
