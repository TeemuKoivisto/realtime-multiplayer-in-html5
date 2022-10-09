import { drawPlayer } from './player'
import { drawBullets } from './bullets'

export function Renderer(ctx, game, options = {}) {
  function draw() {
    ctx.clearRect(0, 0, 720, 480)

    for (const player of game.getPlayers()) {
      drawPlayer(ctx, player, {
        color: '#c58242',
        infoColor: '#cc8822',
        stateText: player.getName() + ' (local_pos)',
      })

      const ghosts = game.getGhosts(player.getId())

      if (
        options.showDestinationPosition &&
        !options.naiveApproach &&
        player !== game.getLocalPlayer()
      ) {
        drawPlayer(ctx, ghosts.local, {
          stateText: 'dest_pos',
        })
      }

      if (options.showServerPosition && !options.naiveApproach) {
        const ghostOptions = {
          stateText: 'server_pos',
          infoColor: 'rgba(255,255,255,0.2)',
        }

        drawPlayer(ctx, ghosts.server, ghostOptions)
      }
    }

    drawBullets(ctx, game.getBullets())
  }

  return Object.freeze({
    draw,
  })
}
