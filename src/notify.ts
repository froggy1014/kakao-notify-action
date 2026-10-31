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
    text: input.text.slice(0, MAX_TEXT),
    requestId: input.requestId,
  });

  return {
    requestId: result.request_id,
    queued: result.queued,
    duplicate: result.duplicate ?? false,
    test: result.test ?? false,
  };
}
