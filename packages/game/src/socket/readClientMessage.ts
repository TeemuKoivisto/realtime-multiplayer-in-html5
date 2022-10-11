import { log } from '../utils/logger'

import { GameServer } from '../GameServer'
import { ClientMessageType } from '../types/events'
import { GameStatus } from '../types/game'

export function readClientMessage(playerId: string, data: Buffer, game: GameServer) {
  const payload = JSON.parse(data.subarray(1).toString())
  const messageType = parseInt(data.subarray(0, 1).toString())
  switch (messageType) {
    case ClientMessageType.join:
      log.debug('Read client join message: ', payload)
      // TODO prevent joining if game is full
      game.on_player_join(payload)
      if (game.status === GameStatus.WAITING) {
        game.on_start_game()
      }
      break
    case ClientMessageType.leave:
      log.debug('TODO Read client leave message')
      break
    case ClientMessageType.move:
      // log.debug('Read client move')
      game.on_player_move(payload)
      break
    case ClientMessageType.ping:
      // log.debug('Read client ping')
      game.on_player_ping({ playerId, ...payload })
      break
    case ClientMessageType.color:
      log.debug('TODO Read client color')
      break
    default:
      log.error(`Unknown message type: ${messageType}`)
  }
}
