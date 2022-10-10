import { log } from '../utils/logger'

import { GameServer } from '../GameServer'
import { ClientMessageType, ServerMessageType } from './events'

export function readClientMessage(playerId: string, data: Buffer, game: GameServer) {
  const payload = JSON.parse(data.subarray(1).toString())
  const messageType = parseInt(data.subarray(0, 1).toString())
  switch (messageType) {
    case ClientMessageType.join:
      log.debug('Read client join message')
      console.log('payload ', payload)
      game.on_player_join(payload)
      if (game.players.length === 1) {
        // game.setOptions(payload.options)
      } else if (game.players.length === game.opts.world.maxPlayers) {
        log.debug('start game')
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
