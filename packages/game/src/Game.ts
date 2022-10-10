import { v4 as uuidv4 } from 'uuid'
import { Observable } from 'lib0/observable'

import { KeyboardState } from './keyboard'
import { Player } from './Player'
import { toFixed } from './utils/pos'
import { Item, Update } from './types'

export class Game {
  id: string = uuidv4()
  events = new Observable<'physics'>()

  updateid = 0
  ctx?: CanvasRenderingContext2D

  dt = 0
  lastframetime = 0

  //Set up some physics integration values
  _pdt = 0.0001 //The physics update delta time
  _pdte = new Date().getTime() //The physics update last delta time
  //A local timer for precision on server and client
  local_time = 0.016 //The local timer
  _dt = new Date().getTime() //The local timer delta
  _dte = new Date().getTime() //The local timer last frame time

  server = false
  world: { width: number; height: number }

  // ghosts?: {
  //   server_pos_self: Player
  //   //The other players server position as we receive it
  //   server_pos_other: Player
  //   //The other players ghost destination position (the lerp)
  //   pos_other: Player
  // }
  // player_host?: Player
  // player_client?: Player

  keyboard?: KeyboardState
  color = ''
  server_time: number = Date.now()

  constructor() {
    //Used in collision etc.
    this.world = {
      width: 720,
      height: 480,
    }

    //Set up some physics integration values
    this._pdt = 0.0001 //The physics update delta time
    this._pdte = new Date().getTime() //The physics update last delta time
    //A local timer for precision on server and client
    this.local_time = 0.016 //The local timer
    this._dt = new Date().getTime() //The local timer delta
    this._dte = new Date().getTime() //The local timer last frame time

    //Start a physics loop, this is separate to the rendering
    //as this happens at a fixed frequency
    this.create_physics_simulation()

    //Start a fast paced timer for measuring time easier
    this.create_timer()
  }

  update(t: number) {
    //Work out the delta time
    this.dt = this.lastframetime ? toFixed((t - this.lastframetime) / 1000.0) : 0.016

    //Store the last frame time
    this.lastframetime = t

    //Update the game specifics
    if (!this.server) {
      this.client_update()
    } else {
      this.server_update()
    }

    //schedule the next update
    this.updateid = this.requestAnimationFrame(this.update.bind(this))
  }

  requestAnimationFrame = (callback: (deltatime: number) => void, element?: HTMLElement) => {
    if (typeof window !== 'undefined') {
      // const frame_time = 60 / 1000
      return window.requestAnimationFrame(callback)
    } else {
      let lastTime = 0
      const frame_time = 45 //on server we run at 45ms, 22hz
      const currTime = Date.now(),
        timeToCall = Math.max(0, frame_time - (currTime - lastTime))
      const id = setTimeout(() => {
        callback(currTime + timeToCall)
      }, timeToCall)
      lastTime = currTime + timeToCall
      return id as unknown as number
    }
  }

  cancelAnimationFrame = (updateid: number) => {
    if (typeof window !== 'undefined') {
      window.cancelAnimationFrame(updateid)
    } else {
      clearTimeout(updateid)
    }
  }

  check_collision(item: Item) {
    //Left wall.
    if (item.pos.x <= item.pos_limits.x_min) {
      item.pos.x = item.pos_limits.x_min
    }

    //Right wall
    if (item.pos.x >= item.pos_limits.x_max) {
      item.pos.x = item.pos_limits.x_max
    }

    //Roof wall.
    if (item.pos.y <= item.pos_limits.y_min) {
      item.pos.y = item.pos_limits.y_min
    }

    //Floor wall
    if (item.pos.y >= item.pos_limits.y_max) {
      item.pos.y = item.pos_limits.y_max
    }

    //Fixed point helps be more deterministic
    item.pos.x = toFixed(item.pos.x)
    item.pos.y = toFixed(item.pos.y)
  }

  create_timer() {
    setInterval(() => {
      this._dt = new Date().getTime() - this._dte
      this._dte = new Date().getTime()
      this.local_time += this._dt / 1000.0
    }, 4)
  }

  create_physics_simulation() {
    setInterval(() => {
      this._pdt = (new Date().getTime() - this._pdte) / 1000.0
      this._pdte = new Date().getTime()
      this.events.emit('physics', [])
    }, 15)
  }

  // Server overrides
  server_update() {}

  // Client overrides
  client_update() {}
  client_create_configuration() {}
  client_connect_to_server() {}
  client_create_ping_timer() {}
}
