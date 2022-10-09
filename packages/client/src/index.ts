import { io } from 'socket.io-client'
import { GameClient } from '@example/game'

import { API_URL } from './config'

import './style.css'

const socket = io(API_URL, {
  reconnectionDelayMax: 10000,
})

//When loading, we store references to our
//drawing canvases, and initiate a game instance.
window.onload = function () {
  //Fetch the viewport
  const viewport = document.getElementById('viewport') as HTMLCanvasElement | null
  if (!viewport) return

  //Create our game client instance.
  const game = new GameClient(viewport, socket)

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
}
