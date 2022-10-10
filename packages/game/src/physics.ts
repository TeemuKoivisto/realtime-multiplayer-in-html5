import { Player } from './Player'
import { toFixed, pos, v_add, v_sub, v_mul_scalar, lerp, v_lerp } from './utils/pos'
import { Tick } from './socket/events'

const opts = {
  playerspeed: 120,
  client: {
    // Client configuration
    show_help: false, //Whether or not to draw the help text
    naive_approach: false, //Whether or not to use the naive approach
    show_server_pos: false, //Whether or not to show the server position
    show_dest_pos: false, //Whether or not to show the interpolation goal
    client_predict: true, //Whether or not the client is predicting input
    input_seq: 0, //When predicting client inputs, we store the last input as a sequence number
    client_smoothing: true, //Whether or not the client side prediction tries to smooth things out
    client_smooth: 25, //amount of smoothing to apply to client update dest
  },
}

export function update_physics(p: Player, local_time: number) {
  //Fetch the new direction from the input buffer,
  //and apply it to the state so we can smooth it in the visual state
  if (opts.client.client_predict) {
    p.old_state.pos = pos(p.cur_state.pos)
    const nd = process_input(p)
    p.cur_state.pos = v_add(p.old_state.pos, nd)
    p.state_time = local_time
  }
  return p
}

export function process_input(player: Player) {
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
  const resulting_vector = physics_movement_vector_from_direction(x_dir, y_dir)
  if (player.inputs.length) {
    //we can now clear the array since these have been processed

    player.last_input_time = player.inputs[ic - 1].time
    player.last_input_seq = player.inputs[ic - 1].seq
  }
  //give it back
  return resulting_vector
}

export function physics_movement_vector_from_direction(x: number, y: number) {
  //Must be fixed step, at physics sync speed.
  return {
    x: toFixed(x * (opts.playerspeed * 0.015)),
    y: toFixed(y * (opts.playerspeed * 0.015)),
  }
}

export function process_server_updates(
  server_updates: Tick[],
  players: Player[],
  playerId: string,
  target_time: number,
  client_time: number,
  _pdt: number
) {
  //First : Find the position in the updates, on the timeline
  //We call this current_time, then we find the past_pos and the target_pos using this,
  //searching throught the server_updates array for current_time in between 2 other times.
  // Then :  other player position = lerp ( past_pos, target_pos, current_time );

  //Find the position in the timeline of updates we stored.
  const current_time = client_time
  let target: Tick | null = null
  let previous: Tick | null = null

  //We look from the 'oldest' updates, since the newest ones
  //are at the end (list.length-1 for example). This will be expensive
  //only when our time is not found on the timeline, since it will run all
  //samples. Usually this iterates very little before breaking out with a target.
  for (let i = 0; i < server_updates.length - 1; ++i) {
    const point = server_updates[i]
    const next_point = server_updates[i + 1]

    //Compare our point in time with the server times we have
    if (current_time > point.t && current_time < next_point.t) {
      target = next_point
      previous = point
      break
    }
  }

  //With no target we store the last known
  //server position and move to that instead
  if (!target) {
    target = server_updates[0]
    previous = server_updates[0]
  }
  if (!target || !previous) return players
  //Now that we have a target and a previous destination,
  //We can interpolate between then based on 'how far in between' we are.
  //This is simple percentage maths, value/target = [0,1] range of numbers.
  //lerp requires the 0,1 value to lerp to? thats the one.

  target_time = target.t

  const difference = target_time - current_time
  const max_difference = toFixed(target.t - previous.t)
  let time_point = toFixed(difference / max_difference)

  //Because we use the same target and previous in extreme cases
  //It is possible to get incorrect values due to division by 0 difference
  //and such. This is a safe guard and should probably not be here. lol.
  if (isNaN(time_point)) time_point = 0
  if (time_point == -Infinity) time_point = 0
  if (time_point == Infinity) time_point = 0

  //The most recent server update
  const latest_server_data = server_updates[server_updates.length - 1]

  return players.map(p => {
    if (p.playerId === playerId) {
      //Now, if not predicting client movement , we will maintain the local player position
      //using the same method, smoothing the players information from the past.
      if (!opts.client.client_predict && !opts.client.naive_approach) {
        //These are the exact server positions from this tick, but only for the ghost
        const my_server_pos = latest_server_data.players.find(pp => pp.playerId === p.playerId)

        //The other players positions in this timeline, behind us and in front of us
        const my_target_pos = target?.players.find(pp => pp.playerId === p.playerId)?.pos
        const my_past_pos = previous?.players.find(pp => pp.playerId === p.playerId)?.pos

        //Snap the ghost to the new server position
        // this.ghosts.server_pos_self.pos = pos(my_server_pos)
        if (!my_target_pos || !my_past_pos) return p
        const local_target = v_lerp(my_past_pos, my_target_pos, time_point)

        //Smoothly follow the destination position
        if (opts.client.client_smoothing) {
          p.pos = v_lerp(p.pos, local_target, _pdt * opts.client.client_smooth)
        } else {
          p.pos = pos(local_target)
        }
      }
    } else {
      if (opts.client.client_smoothing) {
        console.log('TODO')
        //   p.pos = v_lerp(
        //     p.pos,
        //     ghosts.pos_other.pos,
        //     this._pdt * this.client_smooth
        //   )
        // } else {
        //   p.pos = pos(ghosts.pos_other.pos)
      }
    }
    return p
  })
}
