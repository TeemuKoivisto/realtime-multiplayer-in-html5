import { log } from '../utils/logger'

import { GameClient } from '../GameClient'
import { ServerMessageType } from './events'

export function readServerMessage(data: string, game: GameClient) {
  const payload = JSON.parse(data.slice(1).toString())
  const messageType = parseInt(data.charAt(0))
  switch (messageType) {
    case ServerMessageType.start_game:
      console.log('start game')
      break
    case ServerMessageType.tick:
      // log.debug('Read server tick message')
      game.on_server_tick(payload)
      break
    case ServerMessageType.client_host:
      log.debug('Read client host')
      game.on_client_host_game(payload)
      break
    case ServerMessageType.client_join:
      log.debug('Read client join')
      game.on_client_join_game(payload)
      break
    case ServerMessageType.player_left:
      log.debug('Read client ready')
      game.on_player_left(payload)
      break
    case ServerMessageType.client_end:
      log.debug('Read client end')
      game.on_disconnect()
      break
    case ServerMessageType.client_ping:
      // log.debug('Read client ping')
      game.on_client_ping(payload)
      break
    case ServerMessageType.client_color:
      log.debug('Read client color')
      game.on_other_client_color_change(payload)
      break
    default:
      log.error(`Unknown message type: ${messageType}`)
  }
}
