const COLOR = '#00FF00'

export function drawBullets(ctx, bullets) {
  for (const bullet of bullets) {
    ctx.fillStyle = COLOR

    const { x, y } = bullet.getPosition()

    const width = 4
    const height = 4

    ctx.fillRect(x, y, width, height)
  }
}
