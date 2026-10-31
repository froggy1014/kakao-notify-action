import { describe, it, expect, vi } from "vitest";
import { notify, MAX_TEXT } from "../src/notify.js";
import { RoomNotBoundError, RoomNoSessionError } from "../src/errors.js";

const base = { apiKey: "kb_test_x", room: "홈랩 알림", baseUrl: "https://hub.test", timeoutMs: 1000, checkSession: true };

function fakeFetch(rooms: object[], sendExtra: object = { queued: true }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init: init ?? {} });
    if (u.endsWith("/v1/rooms")) return new Response(JSON.stringify({ rooms }), { status: 200 });
    // hub echoes the request_id it received
    const sent = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify({ ok: true, request_id: sent.request_id, ...sendExtra }), { status: 202 });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

describe("notify", () => {
  it("sends when room canReply", async () => {
    const f = fakeFetch([{ name: "홈랩 알림", status: "active", canReply: true }]);
    const r = await notify({ ...base, text: "hi", requestId: "deps:1:merged" }, f);
    expect(r).toEqual({ requestId: "deps:1:merged", queued: true, duplicate: false, test: false });
    expect(f.calls).toHaveLength(2);
    expect(JSON.parse(f.calls[1].init.body as string)).toMatchObject({ room: "홈랩 알림", msg: "hi", request_id: "deps:1:merged" });
  });

  it("fails without sending when room not bound", async () => {
    const f = fakeFetch([{ name: "다른방", status: "active", canReply: true }]);
    await expect(notify({ ...base, text: "hi" }, f)).rejects.toBeInstanceOf(RoomNotBoundError);
    expect(f.calls).toHaveLength(1);
  });

  it("fails without sending when room has no session", async () => {
    const f = fakeFetch([{ name: "홈랩 알림", status: "active", canReply: false }]);
    await expect(notify({ ...base, text: "hi" }, f)).rejects.toBeInstanceOf(RoomNoSessionError);
    expect(f.calls).toHaveLength(1);
  });

  it("skips room check when checkSession=false", async () => {
    const f = fakeFetch([]);
    await notify({ ...base, checkSession: false, text: "hi" }, f);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].url).toMatch(/\/v1\/messages$/);
  });

  it("truncates text to MAX_TEXT", async () => {
    const f = fakeFetch([{ name: "홈랩 알림", status: "active", canReply: true }]);
    await notify({ ...base, text: "x".repeat(MAX_TEXT + 50) }, f);
    expect(JSON.parse(f.calls[1].init.body as string).msg).toHaveLength(MAX_TEXT);
  });
});

describe("truncation", () => {
  it("never splits a surrogate pair at the cut", async () => {
    const f = fakeFetch([{ name: "홈랩 알림", status: "active", canReply: true }]);
    const text = "x".repeat(MAX_TEXT - 1) + "🤖" + "tail"; // emoji straddles index 4000
    await notify({ ...base, text }, f);
    const msg = JSON.parse(f.calls[1].init.body as string).msg as string;
    expect(msg.length).toBeLessThanOrEqual(MAX_TEXT);
    expect(msg.endsWith("x")).toBe(true);
    expect(/[\uD800-\uDFFF]$/.test(msg)).toBe(false);
  });
});
