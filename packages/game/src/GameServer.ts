import { Observable } from 'lib0/observable'

import { Game } from './Game'
import { Player } from './Player'
import { pos, v_add } from './utils/pos'
import { check_collision, process_input } from './physics'

import {
  ClientMessageType,
  ClientMessage,
  ServerMessage,
  ServerMessageType,
  Tick,
} from './socket/events'
import { GameOptions, GameStatus } from './types'

export class GameServer extends Game {
  server = true
  status = GameStatus.WAITING
  players: Player[] = []
  active = false
  laststate: Tick = {
    players: [],
    t: Date.now(),
  }
  serverEvents = new Observable<ServerMessageType>()

  constructor(opts?: GameOptions) {
    super(opts)
    this.server_time = 0
    this.events.on('physics', () => {
      this.update_physics()
    })
  }

  get isFull() {
    return this.players.length === this.opts.world.maxPlayers
  }

  update_physics() {
    this.players = this.players.map(p => {
      p.old_state.pos = pos(p.pos)
      const new_dir = process_input(p)
      p.pos = v_add(p.old_state.pos, new_dir)
      check_collision(p)
      p.inputs = []
      return p
    })
  }

  stop_update() {
    this.cancelAnimationFrame(this.updateid)
  }

  on_player_join(data: ClientMessage[ClientMessageType.join]) {
    const player = new Player(data.playerId, this.opts.world)
    if (this.players.length === 0) {
      player.pos = { x: 20, y: 20 }
      player.isHost = true
    } else if (this.players.length === 1) {
      player.pos = { x: 500, y: 200 }
    }
    this.players.push(player)
    this.emit(ServerMessageType.client_join, {
      server_time: this.server_time,
      players: this.players.map(p => ({
        isHost: p.isHost,
        playerId: p.playerId,
        pos: p.pos,
        color: p.color,
      })),
    })
  }

  on_player_left(data: ClientMessage[ClientMessageType.leave]) {
    this.status = GameStatus.WAITING
    let hostLeft = false
    this.players = this.players.filter(p => {
      if (p.playerId !== data.playerId) {
        return true
      }
      hostLeft = p.isHost
      return false
    })
    let newHostId = null
    if (hostLeft && this.players.length > 0) {
      this.players[0].isHost = true
      newHostId = this.players[0].playerId
    }
    this.emit(ServerMessageType.player_left, { playerId: data.playerId, newHostId })
  }

  on_tick() {
    //Update the state of our local clock to match the timer
    this.server_time = this.local_time

    //Make a snapshot of the current state, for updating the clients
    this.laststate = {
      players: this.players.map(p => ({
        playerId: p.playerId,
        pos: p.pos,
        last_input_seq: p.last_input_seq, // the last input we processed
      })),
      t: this.server_time, // our current local time on the server
    } as Tick

    this.emit(ServerMessageType.tick, this.laststate)
  }

  on_player_move(payload: ClientMessage[ClientMessageType.move]) {
    this.players = this.players.map(p => {
      if (p.playerId === payload.playerId) {
        p.inputs.push({ inputs: payload.input, time: payload.local_time, seq: payload.input_seq })
      }
      return p
    })
  }

  on_player_ping(payload: ServerMessage[ServerMessageType.client_ping]) {
    this.emit(ServerMessageType.client_ping, payload)
  }

  on_start_game() {
    // GAME START
    // //right so a game has 2 players and wants to begin
    // //the host already knows they are hosting,
    // //tell the other client they are joining a game
    // //s=server message, j=you are joining, send them the host id
    // game.player_client.send('s.j.' + game.player_host.userid);
    // game.player_client.game = game;

    //     //now we tell both that the game is ready to start
    //     //clients will reset their positions in this case.
    // game.player_client.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
    // game.player_host.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));

    //     //set this flag, so that the update loop can run it.
    // game.active = true;
    this.status = GameStatus.RUNNING
    // this.active = true
    this.emit(ServerMessageType.start_game, { server_time: this.local_time })
  }

  // TODO When no players in game, should pause whatever event listeners are running
  on_pause_game() {
    this.status = GameStatus.WAITING
  }

  on_end_game() {
    this.status = GameStatus.ENDED
    this.emit(ServerMessageType.end_game, true)
    this.destroy()
  }

  emit<K extends keyof ServerMessage>(action: K, payload: ServerMessage[K]) {
    this.serverEvents.emit(action, [payload])
  }

  on<K extends keyof ServerMessage>(action: K, cb: (payload: ServerMessage[K]) => void) {
    this.serverEvents.on(action, cb)
  }

  destroy() {
    clearInterval(this.timerInterval)
    clearInterval(this.physicsInterval)
    this.cancelAnimationFrame(this.updateid)
    this.stop_update()
    this.events.destroy()
    this.serverEvents.destroy()
  }
}
