import { ClientMessage, ClientMessageType } from './events'

export function writeClientMessage<K extends ClientMessageType>(
  type: K,
  payload: ClientMessage[K]
) {
  return `${type}${JSON.stringify(payload)}`
}
