import { v4 as uuidv4 } from 'uuid'
import { ClientMessageType, GameClient, writeClientMessage, enableDebug } from '@example/game'

import { socketActions } from './ws'

import './style.css'

const playerId = localStorage.getItem('playerId') || uuidv4()

enableDebug(true)
run()

export function run() {
  //Fetch the viewport
  const viewport = document.getElementById('viewport') as HTMLCanvasElement | null
  if (!viewport) return

  //Create our game client instance.
  const game = new GameClient(playerId, viewport)

  //Adjust their size
  viewport.width = game.world.width
  viewport.height = game.world.height

  //Fetch the rendering contexts
  const ctx = game.viewport.getContext('2d')
  if (ctx) {
    game.ctx = ctx
    //Set the draw style for the font
    game.ctx.font = '11px "Helvetica"'
  }

  //Finally, start the loop
  game.update(new Date().getTime())

  socketActions.connect(playerId, game, () => {
    socketActions.emit(writeClientMessage(ClientMessageType.join, { playerId }))
  })

  // this.sendEvent(ClientMessageType.color, this.players.self.color)

  game.on(ClientMessageType.join, payload => {
    console.log('join ', payload)
  })
  game.on(ClientMessageType.leave, payload => {
    console.log('leave ', payload)
  })
  game.on(ClientMessageType.move, payload => {
    console.log('move ', payload)
    socketActions.emit(writeClientMessage(ClientMessageType.move, payload))
  })
  game.on(ClientMessageType.ping, payload => {
    socketActions.emit(writeClientMessage(ClientMessageType.ping, payload))
  })
  game.on(ClientMessageType.color, payload => {
    console.log('color ', payload)
  })
}
