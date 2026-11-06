import { NotiBot } from "@noti-bot/sdk";
import { RoomNoSessionError, RoomNotBoundError } from "./errors.js";

export interface NotifyInput {
  apiKey: string;
  room?: string;
  /** Workspace-unique room slug, e.g. `deploy-alerts`. */
  roomSlug?: string;
  /** Stable hub room UUID, not a numeric Kakao chat ID. */
  roomId?: string;
  text: string;
  /** Display names to tag; each must match exactly one room member. */
  mentions?: string[];
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

type Target = { roomId: string } | { roomSlug: string } | { room: string };

export async function notify(input: NotifyInput, deps: NotifyDeps = {}): Promise<NotifyResult> {
  const targets = [input.room, input.roomSlug, input.roomId].filter(Boolean);
  if (targets.length !== 1) throw new TypeError("Specify exactly one of room, room-slug or room-id");
  let target: Target = input.roomId
    ? { roomId: input.roomId }
    : input.roomSlug
      ? { roomSlug: input.roomSlug }
      : { room: input.room ?? "" };
  const label = targets[0] ?? "";
  const bot = new NotiBot({
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    fetch: deps.fetch,
  });

  if (input.checkSession) {
    const rooms = await bot.listRooms();
    const room = rooms.find((r) =>
      input.roomId ? r.id === input.roomId : input.roomSlug ? r.slug === input.roomSlug : r.name === input.room,
    );
    if (!room) throw new RoomNotBoundError(label);
    if (room.id) target = { roomId: room.id };
    if (!room.canReply) throw new RoomNoSessionError(label);
  }

  const result = await bot.sendMessage({
    ...target,
    text: truncate(input.text, MAX_TEXT),
    requestId: input.requestId,
    ...(input.mentions?.length ? { mentions: input.mentions } : {}),
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
