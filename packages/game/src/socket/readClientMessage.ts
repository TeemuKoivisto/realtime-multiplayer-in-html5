import { log } from '../utils/logger'

import { GameServerV2 } from '../GameServerV2'
import { ClientMessageType, ServerMessageType } from './events'

export function readClientMessage(playerId: string, data: Buffer, game: GameServerV2) {
  const payload = JSON.parse(data.subarray(1).toString())
  const messageType = parseInt(data.subarray(0, 1).toString())
  switch (messageType) {
    case ClientMessageType.join:
      log.debug('Read client join message')
      game.add_player(payload)
      break
    case ClientMessageType.leave:
      log.debug('Read client leave message')
      break
    case ClientMessageType.move:
      // log.debug('Read client move')
      game.on_client_move(payload)
      break
    case ClientMessageType.ping:
      // log.debug('Read client ping')
      game.emit(ServerMessageType.client_ping, { playerId, ...payload })
      break
    case ClientMessageType.color:
      log.debug('Read client color')
      break
    default:
      log.error(`Unknown message type: ${messageType}`)
  }
}
