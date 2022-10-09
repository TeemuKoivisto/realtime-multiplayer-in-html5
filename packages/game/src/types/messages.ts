export enum ClientMessageType {
  join = 0,
  leave = 1,
  move = 2,
}
export enum ServerMessageType {
  start = 0,
  end = 1,
  tick = 2,
}

export interface GameEventPayload {
  id: string
}
