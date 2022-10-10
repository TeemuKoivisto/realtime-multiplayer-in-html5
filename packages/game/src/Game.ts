import { v4 as uuidv4 } from 'uuid'
import { Observable } from 'lib0/observable'

import { KeyboardState } from './keyboard'
import { Player } from './Player'
import { toFixed } from './utils/pos'
import { GameOptions, Item, Update } from './types'

export class Game {
  id: string = uuidv4()
  events = new Observable<'physics'>()
  opts: GameOptions = {
    world: {
      maxPlayers: 2,
      width: 720,
      height: 480,
    },
    client: {
      show_help: false, //Whether or not to draw the help text
      naive_approach: false, //Whether or not to use the naive approach
      show_server_pos: false, //Whether or not to show the server position
      show_dest_pos: false, //Whether or not to show the interpolation goal
      client_predict: false, //Whether or not the client is predicting input
      client_smoothing: true, //Whether or not the client side prediction tries to smooth things out
      client_smooth: 25, //amount of smoothing to apply to client update dest
    },
    net_latency: 0.001, //the latency between the client and the server (ping/2)
    net_ping: 0.001, //The round trip time from here to the server,and back
    last_ping_time: 0.001, //The time we last sent a ping
    fake_lag: 0, //If we are simulating lag, this applies only to the input client (not others)
    fake_lag_time: 0,
  }

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

  constructor(opts?: GameOptions) {
    if (opts) {
      this.opts = { ...this.opts, ...opts }
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

  setOptions(opts: GameOptions) {
    this.opts = opts
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
      this.on_tick()
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
  on_tick() {}

  // Client overrides
  client_update() {}
  client_create_configuration() {}
  client_connect_to_server() {}
  client_create_ping_timer() {}
}
