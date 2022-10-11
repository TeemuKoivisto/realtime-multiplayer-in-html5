import { ServerMessage, ServerMessageType } from '../types/events'

export function writeServerMessage<K extends ServerMessageType>(
  type: K,
  payload: ServerMessage[K]
) {
  return `${type}${JSON.stringify(payload)}`
}
