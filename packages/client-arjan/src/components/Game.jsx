import React from 'react'

export default class Game extends React.Component {
  componentDidMount() {
    const game = this.props.gameClient
    const canvas = this.refs.canvas
    const ctx = canvas.getContext('2d')

    ctx.font = '11px "Helvetica"'

    const renderer = Renderer(ctx, game, this.props.gameClient.getOptions())

    game.setRenderer(renderer)
    game.start()
  }

  render() {
    return (
      <div>
        <canvas
          ref="canvas"
          className="game"
          width={this.props.width}
          height={this.props.height}
        ></canvas>
      </div>
    )
  }
}
