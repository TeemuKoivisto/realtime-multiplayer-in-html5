import { Player } from '@example/game-arjan'

export function ClientPlayer({ id, name, x = 0, y = 0, width = 16, height = 16, speed = 50 }) {
  return Player({
    id,
    name,
    x,
    y,
    width,
    height,
    speed,
  })
}
