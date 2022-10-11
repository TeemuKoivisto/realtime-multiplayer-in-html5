export interface GameOptions {
  world: {
    maxPlayers: number
    width: number
    height: number
  }
  client: {
    show_help: boolean //Whether or not to draw the help text
    naive_approach: boolean //Whether or not to use the naive approach
    show_server_pos: boolean //Whether or not to show the server position
    show_dest_pos: boolean //Whether or not to show the interpolation goal
    client_predict: boolean //Whether or not the client is predicting input
    client_smoothing: boolean //Whether or not the client side prediction tries to smooth things out
    client_smooth: number //amount of smoothing to apply to client update dest
  }
  net_latency: number //the latency between the client and the server (ping/2)
  net_ping: number //The round trip time from here to the server,and back
  last_ping_time: number //The time we last sent a ping
  fake_lag: number //If we are simulating lag, this applies only to the input client (not others)
  fake_lag_time: number
}

export enum GameStatus {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  ENDED = 'ENDED',
}

export interface Pos {
  x: number
  y: number
}
export interface Size {
  x: number
  y: number
  hx: number
  hy: number
}
export interface Input {
  inputs: string[]
  time: number
  seq: number
}
export interface Item {
  pos: Pos
  pos_limits: {
    x_min: number
    x_max: number
    y_min: number
    y_max: number
  }
}
