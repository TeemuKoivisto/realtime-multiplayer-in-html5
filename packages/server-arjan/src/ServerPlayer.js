import uuid from 'node-uuid'
import { Player } from '@example/game-arjan'

export function ServerPlayer({ name, x = 0, y = 0, width = 16, height = 16, speed = 50 }) {
  return Player({
    id: uuid.v4(),
    name,
    x,
    y,
    width,
    height,
    speed,
  })
}
