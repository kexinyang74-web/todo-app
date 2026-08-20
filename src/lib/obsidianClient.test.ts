import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readVaultFile,
  testObsidianConnection,
  writeVaultFile,
  type FetchLike,
  type ObsidianConnection,
} from "./obsidianClient";

const conn: ObsidianConnection = { apiKey: "secret-key", port: 27123, filePath: "todo.md" };

const res = (status: number, body = "") => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body,
});

const fetchMock = (status: number, body = "", onCall?: (url: string, init: RequestInit) => void) => {
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    onCall?.(url, init);
    return res(status, body);
  });
  return fn as unknown as FetchLike;
};

describe("readVaultFile（规格 3：读取）", () => {
  it("GET 正确 URL 与 Bearer 头，200 返回内容", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = fetchMock(200, "content", (url, init) => {
      captured = { url, init };
    });
    await expect(readVaultFile(conn, fetchImpl)).resolves.toBe("content");
    expect(captured!.url).toBe("http://127.0.0.1:27123/v1/vault/todo.md");
    expect(captured!.init.method).toBe("GET");
    expect((captured!.init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key");
    expect((captured!.init.headers as Record<string, string>).Accept).toBe("text/markdown");
  });

  it("404 视为文件不存在，返回 null", async () => {
    await expect(readVaultFile(conn, fetchMock(404))).resolves.toBeNull();
  });

  it("401 抛 unauthorized 错误", async () => {
    await expect(readVaultFile(conn, fetchMock(401))).rejects.toMatchObject({
      kind: "unauthorized",
      message: expect.stringContaining("API Key"),
    });
  });

  it("网络失败抛 network 错误（含连接引导）", async () => {
    const fail = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as FetchLike;
    await expect(readVaultFile(conn, fail)).rejects.toMatchObject({
      kind: "network",
      message: expect.stringContaining("无法连接"),
    });
  });

  it("5 秒超时抛 timeout 错误", async () => {
    vi.useFakeTimers();
    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    ) as unknown as FetchLike;
    const p = readVaultFile(conn, hang);
    const assertion = expect(p).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    vi.useRealTimers();
  });

  it("路径逐段编码（含中文/空格），反斜杠归一为斜杠", async () => {
    let url = "";
    const fetchImpl = fetchMock(200, "", (u) => {
      url = u;
    });
    await readVaultFile({ ...conn, filePath: "Inbox/待办 todo.md" }, fetchImpl);
    expect(url).toBe("http://127.0.0.1:27123/v1/vault/Inbox/%E5%BE%85%E5%8A%9E%20todo.md");
    await readVaultFile({ ...conn, filePath: "Inbox\\todo.md" }, fetchImpl);
    expect(url).toBe("http://127.0.0.1:27123/v1/vault/Inbox/todo.md");
  });

  it("空文件路径直接报错，不发请求", async () => {
    const fetchImpl = fetchMock(200);
    await expect(readVaultFile({ ...conn, filePath: "  " }, fetchImpl)).rejects.toMatchObject({
      kind: "invalid",
      message: expect.stringContaining("文件路径不能为空"),
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("writeVaultFile（规格 3：写入）", () => {
  it("PUT 写入 markdown 内容", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = fetchMock(204, "", (url, init) => {
      captured = { url, init };
    });
    await expect(writeVaultFile(conn, "- [ ] 买牛奶\n", fetchImpl)).resolves.toBeUndefined();
    expect(captured!.init.method).toBe("PUT");
    expect(captured!.init.body).toBe("- [ ] 买牛奶\n");
    expect((captured!.init.headers as Record<string, string>)["Content-Type"]).toBe("text/markdown");
  });

  it("401 抛 unauthorized", async () => {
    await expect(writeVaultFile(conn, "x", fetchMock(401))).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("404 抛 not-found（路径错误）", async () => {
    await expect(writeVaultFile(conn, "x", fetchMock(404))).rejects.toMatchObject({
      kind: "not-found",
      message: expect.stringContaining("文件路径"),
    });
  });
});

describe("testObsidianConnection（规格 3：连接测试）", () => {
  it("/v1/vault/ 200 → ok", async () => {
    await expect(testObsidianConnection(conn, fetchMock(200, "[]"))).resolves.toBe("ok");
  });

  it("/v1/vault/ 404 时回退 /vault/，成功 → ok", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/v1/vault/")) return res(404);
      if (url.endsWith("/vault/")) return res(200, "[]");
      return res(500);
    }) as unknown as FetchLike;
    await expect(testObsidianConnection(conn, fetchImpl)).resolves.toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("401 → auth-failed", async () => {
    await expect(testObsidianConnection(conn, fetchMock(401))).resolves.toBe("auth-failed");
  });

  it("网络失败 → unreachable", async () => {
    const fail = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as FetchLike;
    await expect(testObsidianConnection(conn, fail)).resolves.toBe("unreachable");
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
