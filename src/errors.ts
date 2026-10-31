export class RoomNotBoundError extends Error {
  override name = "RoomNotBoundError";
  constructor(room: string) {
    super(`room "${room}" is not bound to this API key`);
  }
}

export class RoomNoSessionError extends Error {
  override name = "RoomNoSessionError";
  constructor(room: string) {
    super(`room "${room}" has no phone session (canReply=false); send a message in the room first`);
  }
}
