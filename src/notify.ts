import { KakaoBot } from "@kakao-bot/sdk";
import { RoomNoSessionError, RoomNotBoundError } from "./errors.js";

export interface NotifyInput {
  apiKey: string;
  room: string;
  text: string;
  requestId?: string;
  baseUrl: string;
  timeoutMs: number;
  checkSession: boolean;
}

export interface NotifyResult {
  requestId: string;
  queued: boolean;
  duplicate: boolean;
  test: boolean;
}

export interface NotifyDeps {
  fetch?: typeof globalThis.fetch;
}

export const MAX_TEXT = 4000;

export async function notify(input: NotifyInput, deps: NotifyDeps = {}): Promise<NotifyResult> {
  const kakao = new KakaoBot({
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    fetch: deps.fetch,
  });

  if (input.checkSession) {
    const rooms = await kakao.listRooms();
    const room = rooms.find((r) => r.name === input.room);
    if (!room) throw new RoomNotBoundError(input.room);
    if (!room.canReply) throw new RoomNoSessionError(input.room);
  }

  const result = await kakao.sendMessage({
    room: input.room,
    text: truncate(input.text, MAX_TEXT),
    requestId: input.requestId,
  });

  return {
    requestId: result.request_id,
    queued: result.queued,
    duplicate: result.duplicate ?? false,
    test: result.test ?? false,
  };
}

/** UTF-16 길이 기준으로 자르되 서로게이트 쌍(이모지)을 가운데서 끊지 않는다. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}
