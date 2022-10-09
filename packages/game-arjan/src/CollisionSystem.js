export function CollisionSystem({ world }) {
  const players = new Set()

  function update() {
    for (const player of players) {
      const width = player.getWidth()
      const height = player.getHeight()

      const positionLimits = {
        xMin: width / 2,
        xMax: world.width - width / 2,
        yMin: height / 2,
        yMax: world.height - height / 2,
      }

      let { x, y } = player.getPosition()

      // Left wall.
      if (x <= positionLimits.xMin) {
        x = positionLimits.xMin
      }

      // Right wall
      if (x >= positionLimits.xMax) {
        x = positionLimits.xMax
      }

      // Roof wall.
      if (y <= positionLimits.yMin) {
        y = positionLimits.yMin
      }

      // Floor wall
      if (y >= positionLimits.yMax) {
        y = positionLimits.yMax
      }

      player.setPosition(x, y)
    }
  }

  function addPlayer(player) {
    players.add(player)
  }

  function removePlayer(player) {
    players.delete(player)
  }

  return Object.freeze({
    update,
    addPlayer,
    removePlayer,
  })
}
