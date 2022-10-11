import { Observable } from 'lib0/observable'

import { KeyboardState } from './keyboard'
import { Game } from './Game'
import { Player } from './Player'
import { toFixed, pos, v_add, v_sub, v_mul_scalar, lerp, v_lerp } from './utils/pos'
import {
  check_collision,
  update_physics,
  physics_movement_vector_from_direction,
  process_server_updates,
  client_update_local_position,
  process_net_prediction_correction,
} from './physics'

import {
  ClientMessage,
  ClientMessageType,
  Move,
  ServerMessage,
  ServerMessageType,
  Tick,
} from './socket/events'
import { GameOptions } from './types'

export class GameClient extends Game {
  playerId: string
  keyboard = new KeyboardState()
  client_has_input = false
  server = false
  players: Player[] = []
  viewport: HTMLCanvasElement
  server_updates: Tick[] = []
  clientEvents = new Observable<ClientMessageType>()

  pingInterval?: ReturnType<typeof setInterval>

  input_seq = 0 //When predicting client inputs, we store the last input as a sequence number

  net_offset = 100 //100 ms latency between server and client interpolation for other clients
  buffer_size = 2 //The size of the server history to keep for rewinding/interpolating.
  target_time = 0.01 //the time where we want to be in the server timeline
  oldest_tick = 0.01 //the last time tick we have available in the buffer

  client_time = 0.01 //Our local 'clock' based on server time - client interpolation(net_offset).
  server_time = 0.01 //The time the server reported it was at, last we heard from it

  dt = 0.016 //The time that the last frame took to run
  fps = 0 //The current instantaneous fps (1/dt)
  fps_avg_count = 0 //The number of samples we have taken for fps_avg
  fps_avg = 0 //The current average fps displayed in the debug UI
  fps_avg_acc = 0 //The accumulation of the last avgcount fps samples

  lit = 0
  llt = new Date().getTime()

  constructor(playerId: string, viewport: HTMLCanvasElement, opts?: GameOptions) {
    super(opts)
    this.playerId = playerId
    this.viewport = viewport
    this.players.push(new Player(playerId, this.opts.world))
    this.events.on('physics', () => {
      this.players = this.players.map(p => {
        if (p.playerId === this.playerId) {
          return update_physics(p, this.local_time)
        }
        return p
      })
    })
    // this.ghosts.pos_other.state = 'dest_pos'

    // this.ghosts.pos_other.info_color = 'rgba(255,255,255,0.1)'

    // this.ghosts.server_pos_self.info_color = 'rgba(255,255,255,0.2)'
    // this.ghosts.server_pos_other.info_color = 'rgba(255,255,255,0.2)'

    // this.ghosts.server_pos_self.state = 'server_pos'
    // this.ghosts.server_pos_other.state = 'server_pos'

    // this.ghosts.server_pos_self.pos = { x: 20, y: 20 }
    // this.ghosts.pos_other.pos = { x: 500, y: 200 }
    // this.ghosts.server_pos_other.pos = { x: 500, y: 200 }

    //Create a keyboard handler
    this.keyboard = new KeyboardState()

    //Create the default configuration settings
    this.client_create_configuration()

    //A list of recent server updates we interpolate across
    //This is the buffer that is the driving factor for our networking
    this.server_updates = []

    //Connect to the socket.io server!
    this.client_connect_to_server()

    //We start pinging the server to determine latency
    this.client_create_ping_timer()

    //Set their colors from the storage or locally
    this.color = localStorage.getItem('color') || '#cc8822'
    localStorage.setItem('color', this.color)
    // this.players.self.color = this.color

    //Make this only if requested
    // if (String(window.location).indexOf('debug') != -1) {
    //   this.client_create_debug_gui()
    // }
  }

  handle_client_keyboard_input() {
    //if(this.lit > this.local_time) return;
    //this.lit = this.local_time+0.5; //one second delay

    //This takes input from the client and keeps a record,
    //It also sends the input information to the server immediately
    //as it is pressed. It also tags each input with a sequence number.

    let x_dir = 0
    let y_dir = 0
    const input: string[] = []
    this.client_has_input = false

    if (this.keyboard.pressed('A') || this.keyboard.pressed('left')) {
      x_dir = -1
      input.push('l')
    } //left

    if (this.keyboard.pressed('D') || this.keyboard.pressed('right')) {
      x_dir = 1
      input.push('r')
    } //right

    if (this.keyboard.pressed('S') || this.keyboard.pressed('down')) {
      y_dir = 1
      input.push('d')
    } //down

    if (this.keyboard.pressed('W') || this.keyboard.pressed('up')) {
      y_dir = -1
      input.push('u')
    } //up

    if (input.length) {
      //Update what sequence we are on now
      this.input_seq += 1

      //Store the input state as a snapshot of what happened.
      this.players = this.players.map(p => {
        if (p.playerId === this.playerId) {
          p.inputs.push({
            inputs: input,
            time: this.local_time,
            seq: this.input_seq,
          })
        }
        return p
      })

      //Send the packet of information to the server.
      //The input packets are labelled with an 'i' in front.
      // let server_packet = 'i.'
      // server_packet += input.join('-') + '.'
      // server_packet += this.local_time.toFixed(3).replace('.', '-') + '.'
      // server_packet += this.input_seq
      // console.log(`server_packet: ${server_packet}`)
      const move: Move = {
        playerId: this.playerId,
        input,
        local_time: this.local_time,
        input_seq: this.input_seq,
      }

      this.emit(ClientMessageType.move, move)

      //Return the direction if needed
      return physics_movement_vector_from_direction(x_dir, y_dir)
    } else {
      return { x: 0, y: 0 }
    }
  }

  on_server_tick(data: Tick) {
    // console.log('on_server_tick', data)
    //Store the server time (this is offset by the latency in the network, by the time we get it)
    this.server_time = data.t
    //Update our local offset time from the last server update
    this.client_time = this.server_time - this.net_offset / 1000

    //One approach is to set the position directly as the server tells you.
    //This is a common mistake and causes somewhat playable results on a local LAN, for example,
    //but causes terrible lag when any ping/latency is introduced. The player can not deduce any
    //information to interpolate with so it misses positions, and packet loss destroys this approach
    //even more so. See 'the bouncing ball problem' on Wikipedia.

    if (this.opts.client.naive_approach) {
      this.players = this.players.map(p => {
        const found = data.players.find(pp => pp.playerId === p.playerId)
        if (found) {
          p.pos = found.pos
          p.last_input_seq = found.last_input_seq
        }
        return p
      })
    } else {
      //Cache the data from the server,
      //and then play the timeline
      //back to the player with a small delay (net_offset), allowing
      //interpolation between the points.
      this.server_updates.push(data)

      //we limit the buffer in seconds worth of updates
      //60fps*buffer seconds = number of samples
      if (this.server_updates.length >= 60 * this.buffer_size) {
        this.server_updates.splice(0, 1)
      }

      //We can see when the last tick we know of happened.
      //If client_time gets behind this due to latency, a snap occurs
      //to the last tick. Unavoidable, and a reallly bad connection here.
      //If that happens it might be best to drop the game after a period of time.
      this.oldest_tick = this.server_updates[0].t

      //Handle the latest positions from the server
      //and make sure to correct our local predictions, making the server have final say.
      this.players = process_net_prediction_correction(
        this.server_updates,
        this.players,
        this.playerId,
        this.local_time,
        this._pdt
      )
    } //non naive
  }

  client_update() {
    if (!this.ctx) return
    // console.debug('client_update')
    //Clear the screen area
    this.ctx.clearRect(0, 0, 720, 480)

    //draw help/information if required
    this.client_draw_info()

    //Capture inputs from the player
    this.handle_client_keyboard_input()

    //Network player just gets drawn normally, with interpolation from
    //the server updates, smoothing out the positions from the past.
    //Note that if we don't have prediction enabled - this will also
    //update the actual local client position on screen as well.
    if (!this.opts.client.naive_approach) {
      this.players = process_server_updates(
        this.server_updates,
        this.players,
        this.playerId,
        this.target_time,
        this.client_time,
        this._pdt
      )
    }

    this.players.forEach(p => {
      p.draw(this.ctx as any)
      if (p.playerId === this.playerId) {
        //When we are doing client side prediction, we smooth out our position
        //across frames using local input states we have stored.
        client_update_local_position(p, this.local_time, this._pdt)
      }
    })

    //Work out the fps average
    this.client_refresh_fps()
  }

  client_create_ping_timer() {
    //Set a ping timer to 1 second, to maintain the ping/latency between
    //client and server and calculated roughly how our connection is doing
    clearInterval(this.pingInterval)
    this.pingInterval = setInterval(() => {
      this.opts.last_ping_time = new Date().getTime() - this.opts.fake_lag
      this.emit(ClientMessageType.ping, { ping: this.opts.last_ping_time })
    }, 1000)
  }

  // client_create_configuration() {
  //   this.show_help = false //Whether or not to draw the help text
  //   this.naive_approach = false //Whether or not to use the naive approach
  //   this.show_server_pos = false //Whether or not to show the server position
  //   this.show_dest_pos = false //Whether or not to show the interpolation goal
  //   this.client_predict = true //Whether or not the client is predicting input
  //   this.input_seq = 0 //When predicting client inputs, we store the last input as a sequence number
  //   this.client_smoothing = true //Whether or not the client side prediction tries to smooth things out
  //   this.client_smooth = 25 //amount of smoothing to apply to client update dest

  //   this.net_latency = 0.001 //the latency between the client and the server (ping/2)
  //   this.net_ping = 0.001 //The round trip time from here to the server,and back
  //   this.last_ping_time = 0.001 //The time we last sent a ping
  //   this.fake_lag = 0 //If we are simulating lag, this applies only to the input client (not others)
  //   this.fake_lag_time = 0

  //   this.net_offset = 100 //100 ms latency between server and client interpolation for other clients
  //   this.buffer_size = 2 //The size of the server history to keep for rewinding/interpolating.
  //   this.target_time = 0.01 //the time where we want to be in the server timeline
  //   this.oldest_tick = 0.01 //the last time tick we have available in the buffer

  //   this.client_time = 0.01 //Our local 'clock' based on server time - client interpolation(net_offset).
  //   this.server_time = 0.01 //The time the server reported it was at, last we heard from it

  //   this.dt = 0.016 //The time that the last frame took to run
  //   this.fps = 0 //The current instantaneous fps (1/this.dt)
  //   this.fps_avg_count = 0 //The number of samples we have taken for fps_avg
  //   this.fps_avg = 0 //The current average fps displayed in the debug UI
  //   this.fps_avg_acc = 0 //The accumulation of the last avgcount fps samples

  //   this.lit = 0
  //   this.llt = new Date().getTime()
  // }

  client_create_debug_gui() {
    // this.gui = new dat.GUI()
    // var _playersettings = this.gui.addFolder('Your settings')
    // this.colorcontrol = _playersettings.addColor(this, 'color')
    // //We want to know when we change our color so we can tell
    // //the server to tell the other clients for us
    // this.colorcontrol.onChange(
    //   function (value) {
    //     this.players.self.color = value
    //     localStorage.setItem('color', value)
    //     this.socket.send('c.' + value)
    //   }.bind(this)
    // )
    // _playersettings.open()
    // var _othersettings = this.gui.addFolder('Methods')
    // _othersettings.add(this, 'naive_approach').listen()
    // _othersettings.add(this, 'client_smoothing').listen()
    // _othersettings.add(this, 'client_smooth').listen()
    // _othersettings.add(this, 'client_predict').listen()
    // var _debugsettings = this.gui.addFolder('Debug view')
    // _debugsettings.add(this, 'show_help').listen()
    // _debugsettings.add(this, 'fps_avg').listen()
    // _debugsettings.add(this, 'show_server_pos').listen()
    // _debugsettings.add(this, 'show_dest_pos').listen()
    // _debugsettings.add(this, 'local_time').listen()
    // _debugsettings.open()
    // var _consettings = this.gui.addFolder('Connection')
    // _consettings.add(this, 'net_latency').step(0.001).listen()
    // _consettings.add(this, 'net_ping').step(0.001).listen()
    // //When adding fake lag, we need to tell the server about it.
    // var lag_control = _consettings.add(this, 'fake_lag').step(0.001).listen()
    // lag_control.onChange(
    //   function (value) {
    //     this.socket.send('l.' + value)
    //   }.bind(this)
    // )
    // _consettings.open()
    // var _netsettings = this.gui.addFolder('Networking')
    // _netsettings.add(this, 'net_offset').min(0.01).step(0.001).listen()
    // _netsettings.add(this, 'server_time').step(0.001).listen()
    // _netsettings.add(this, 'client_time').step(0.001).listen()
    // //_netsettings.add(this, 'oldest_tick').step(0.001).listen();
    // _netsettings.open()
  }

  client_reset_positions() {
    this.players = this.players.map(p => {
      if (p.isHost) {
        //Host always spawns at the top left.
        p.resetPos({ x: 20, y: 20 })
      } else {
        p.resetPos({ x: 500, y: 200 })
      }
      //Make sure the local player physics is updated
      if (p.playerId === this.playerId) {
        p.old_state.pos = pos(p.pos)
        p.pos = pos(p.pos)
        p.cur_state.pos = pos(p.pos)
      }
      return p
    })
  }

  on_player_left(data: ServerMessage[ServerMessageType.player_left]) {
    console.log('player left')
    this.players = this.players.filter(p => {
      if (p.playerId !== data.playerId && p.playerId === data.newHostId) {
        p.isHost = true
        p.info_color = '#cc0000' // blue
        p.state = 'hosting.waiting for a player'
        p.online = true
      }
      return p.playerId !== data.playerId
    })
  }

  on_client_join_game(data: ServerMessage[ServerMessageType.client_join]) {
    console.log('client_onjoingame', data)
    const newPlayers = data.players.filter(
      p => p.playerId !== this.playerId && !this.players.find(pp => pp.playerId === p.playerId)
    )
    const addedPlayers = [...this.players]
    newPlayers.forEach(p => {
      const newPlayer = new Player(p.playerId, this.opts.world)
      newPlayer.info_color = p.color
      newPlayer.state = 'connected.joined.waiting'
      newPlayer.isHost = p.isHost
      newPlayer.pos = p.pos
      addedPlayers.push(newPlayer)
    })
    this.players = addedPlayers.map(p => {
      if (p.isHost) {
        //Store their info colors for clarity. server is always blue
        p.info_color = '#2288cc'
        p.state = 'local_pos(hosting)'
      } else {
        p.info_color = '#cc8822'
        p.state = 'local_pos(joined)'
      }
      if (p.playerId === this.playerId) {
        // @ts-ignore
        p.state = 'YOU ' + p.state
      }
      p.online = true
      return p
    })

    //TODO sync colors Make sure colors are synced up
    // this.socket.send('c.' + this.players.self.color);

    //Make sure the positions match servers and other clients
    this.client_reset_positions()
  }

  on_client_host_game(data: ServerMessage[ServerMessageType.client_host]) {
    console.log('client_onhostgame')
    //The server sends the time when asking us to host, but it should be a new game.
    //so the value will be really small anyway (15 or 16ms)
    const server_time = parseFloat(data.replace('-', '.'))

    //Get an estimate of the current time on the server
    this.local_time = server_time + this.opts.net_latency

    // //Set the flag that we are hosting, this helps us position respawns correctly
    // this.players.self.host = true

    this.players = this.players.map(p => {
      if (p.playerId === this.playerId) {
        p.info_color = '#cc0000'
        p.state = 'hosting.waiting for a player'
        p.online = true
      }
      return p
    })

    //Make sure we start in the correct place as the host.
    this.client_reset_positions()
  }

  on_connected(data: ServerMessage[ServerMessageType.client_connected]) {
    //The server responded that we are now in a game,
    //this lets us store the information about ourselves and set the colors
    //to show we are now ready to be playing.
    this.players = this.players.map(p => {
      if (p.playerId === this.playerId) {
        p.info_color = '#cc0000'
        p.state = 'connected'
        p.online = true
      }
      return p
    })
  }

  on_other_client_color_change(data: ServerMessage[ServerMessageType.client_color]) {
    // this.players.other.color = data.color
  }

  on_client_ping(data: ServerMessage[ServerMessageType.client_ping]) {
    this.opts.net_ping = new Date().getTime() - parseFloat(data.ping)
    this.opts.net_latency = this.opts.net_ping / 2
  }

  on_disconnect() {
    //When we disconnect, we don't know if the other player is
    //connected or not, and since we aren't, everything goes to offline
    this.players = this.players.map(p => {
      if (p.playerId === this.playerId) {
        p.info_color = 'rgba(255,255,255,0.1)'
        p.state = 'not-connected'
        p.online = false
      } else {
        p.info_color = 'rgba(255,255,255,0.1)'
        p.state = 'not-connected'
      }
      return p
    })
  }

  client_refresh_fps() {
    //We store the fps for 10 frames, by adding it to this accumulator
    this.fps = 1 / this.dt
    this.fps_avg_acc += this.fps
    this.fps_avg_count++

    //When we reach 10 frames we work out the average fps
    if (this.fps_avg_count >= 10) {
      this.fps_avg = this.fps_avg_acc / 10
      this.fps_avg_count = 1
      this.fps_avg_acc = this.fps
    } //reached 10 frames
  }

  client_draw_info() {
    if (!this.ctx) return
    //We don't want this to be too distracting
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)'

    //They can hide the help with the debug GUI
    if (this.opts.client.show_help) {
      this.ctx.fillText(
        'net_offset : local offset of others players and their server updates. Players are net_offset "in the past" so we can smoothly draw them interpolated.',
        10,
        30
      )
      this.ctx.fillText('server_time : last known game time on server', 10, 70)
      this.ctx.fillText(
        'client_time : delayed game time on client for other players only (includes the net_offset)',
        10,
        90
      )
      this.ctx.fillText('net_latency : Time from you to the server. ', 10, 130)
      this.ctx.fillText('net_ping : Time from you to the server and back. ', 10, 150)
      this.ctx.fillText(
        'fake_lag : Add fake ping/lag for testing, applies only to your inputs (watch server_pos block!). ',
        10,
        170
      )
      this.ctx.fillText(
        'client_smoothing/client_smooth : When updating players information from the server, it can smooth them out.',
        10,
        210
      )
      this.ctx.fillText(
        ' This only applies to other clients when prediction is enabled, and applies to local player with no prediction.',
        170,
        230
      )
    } //if this.show_help

    //Draw some information for the host
    this.players.forEach(p => {
      //if we are the host
      if (p.playerId === this.playerId && p.isHost) {
        this.ctx!.fillStyle = 'rgba(255,255,255,0.7)'
        this.ctx!.fillText('You are the host', 10, 465)
      }
    })

    //Reset the style back to full white.
    this.ctx.fillStyle = 'rgba(255,255,255,1)'
  }

  emit<K extends keyof ClientMessage>(action: K, payload: ClientMessage[K]) {
    this.clientEvents.emit(action, [payload])
  }

  on<K extends keyof ClientMessage>(action: K, cb: (payload: ClientMessage[K]) => void) {
    this.clientEvents.on(action, cb)
  }

  destroy() {
    clearInterval(this.timerInterval)
    clearInterval(this.physicsInterval)
    clearInterval(this.pingInterval)
    this.cancelAnimationFrame(this.updateid)
    this.events.destroy()
    this.clientEvents.destroy()
  }
}
