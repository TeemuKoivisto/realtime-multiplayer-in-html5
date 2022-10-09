export { Network as GameNetwork } from './Network'
export { AbstractGame, Timer } from '@example/game-arjan'

export function ServerGame({ options }) {
  const game = AbstractGame({ options })
  const network = GameNetwork()
  const networkLoop = Timer({
    interval: options.networkTimestep,
    onUpdate() {
      network.sendUpdates(game.getStateForPlayer)

      game.clearEvents()
    },
  })

  function getNetwork() {
    return network
  }

  function addPlayer(player) {
    const { x, y } = options.playerPositions[0]

    player.setPosition(x, y)

    game.addPlayer(player)
  }

  function start() {
    networkLoop.start()

    game.start()
  }

  function stop() {
    networkLoop.stop()

    game.stop()
  }

  function onUpdate(delta) {
    for (const player of game.getPlayers()) {
      player.update(delta)
    }
  }

  game.setUpdateHandler(onUpdate)

  return Object.freeze(
    Object.assign({}, game, {
      addPlayer,
      getNetwork,
      start,
      stop,
    })
  )
}
