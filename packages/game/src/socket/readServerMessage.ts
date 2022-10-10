import { log } from '../utils/logger'

import { GameClientV2 } from '../GameClientV2'
import { ServerMessageType } from './events'

export function readServerMessage(data: string, game: GameClientV2) {
  const payload = JSON.parse(data.slice(1).toString())
  const messageType = parseInt(data.charAt(0))
  switch (messageType) {
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
    case ServerMessageType.client_ready:
      log.debug('Read client ready')
      game.on_client_ready(payload)
      break
    case ServerMessageType.client_end:
      log.debug('Read client end')
      game.on_client_disconnect()
      break
    case ServerMessageType.client_ping:
      log.debug('Read client ping')
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
