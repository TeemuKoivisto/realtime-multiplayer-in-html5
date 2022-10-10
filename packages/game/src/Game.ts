import { v4 as uuidv4 } from 'uuid'

import { KeyboardState } from './keyboard'
import { PlayerV2 } from './PlayerV2'
import { toFixed } from './utils/pos'
import { Item, Update } from './types'

export class Game {
  id: string = uuidv4()

  updateid = 0
  ctx?: CanvasRenderingContext2D

  dt = 0
  lastframetime = 0
  playerspeed = 0

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
  //   server_pos_self: PlayerV2
  //   //The other players server position as we receive it
  //   server_pos_other: PlayerV2
  //   //The other players ghost destination position (the lerp)
  //   pos_other: PlayerV2
  // }
  // player_host?: PlayerV2
  // player_client?: PlayerV2

  keyboard?: KeyboardState
  color = ''
  server_time: number = Date.now()

  constructor() {
    //Used in collision etc.
    this.world = {
      width: 720,
      height: 480,
    }

    //The speed at which the clients move.
    this.playerspeed = 120

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

  process_input(player: PlayerV2) {
    //It's possible to have recieved multiple inputs by now,
    //so we process each one
    let x_dir = 0
    let y_dir = 0
    const ic = player.inputs.length
    if (ic) {
      for (let j = 0; j < ic; ++j) {
        //don't process ones we already have simulated locally
        if (player.inputs[j].seq <= player.last_input_seq) continue

        const input = player.inputs[j].inputs
        const c = input.length
        for (let i = 0; i < c; ++i) {
          const key = input[i]
          if (key == 'l') {
            x_dir -= 1
          }
          if (key == 'r') {
            x_dir += 1
          }
          if (key == 'd') {
            y_dir += 1
          }
          if (key == 'u') {
            y_dir -= 1
          }
        } //for all input values
      } //for each input command
    } //if we have inputs

    //we have a direction vector now, so apply the same physics as the client
    const resulting_vector = this.physics_movement_vector_from_direction(x_dir, y_dir)
    if (player.inputs.length) {
      //we can now clear the array since these have been processed

      player.last_input_time = player.inputs[ic - 1].time
      player.last_input_seq = player.inputs[ic - 1].seq
    }
    //give it back
    return resulting_vector
  }

  physics_movement_vector_from_direction(x: number, y: number) {
    //Must be fixed step, at physics sync speed.
    return {
      x: toFixed(x * (this.playerspeed * 0.015)),
      y: toFixed(y * (this.playerspeed * 0.015)),
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
      this.update_physics()
    }, 15)
  }

  // Both override
  update_physics() {}

  // Server overrides
  server_update() {}

  // Client overrides
  client_update() {}
  client_create_configuration() {}
  client_connect_to_server() {}
  client_create_ping_timer() {}
}
