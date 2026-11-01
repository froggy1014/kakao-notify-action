export class RoomNotBoundError extends Error {
  override name = "RoomNotBoundError";
  constructor(room: string) {
    super(`room "${room}" is not bound to this API key`);
  }
}

export class RoomNoSessionError extends Error {
  override name = "RoomNoSessionError";
  constructor(room: string) {
    super(`room "${room}" is not ready for sending (canReply=false); check the phone transport and room mapping`);
  }
}
