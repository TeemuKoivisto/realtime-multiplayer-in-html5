import React from 'react'

export default class Stats extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      serverTime: 0,
      clientTime: 0,
      localTime: 0,
      networkLatency: 0,
      networkPing: 0,
    }
  }

  componentWillMount() {
    const game = this.props.game

    game.addAfterViewLoopHook('stats', data => {
      this.setState({
        serverTime: data.serverTime.toFixed(3),
        clientTime: data.clientTime.toFixed(3),
        localTime: data.time.toFixed(3),
        networkLatency: data.netLatency,
        networkPing: data.netPing,
      })
    })
  }

  componentWillUnmount() {
    this.props.game.removeAfterViewLoopHook('stats')
  }

  render() {
    return (
      <div className="menu">
        <div className="menu-heading">Stats</div>
        <div className="blankslate text-left">
          <ul>
            <li>Server time: {this.state.serverTime}</li>
            <li>Client time: {this.state.clientTime}</li>
            <li>Local time: {this.state.localTime}</li>
            <li>Network latency: {this.state.networkLatency}</li>
            <li>Network ping: {this.state.networkPing}</li>
          </ul>
        </div>
      </div>
    )
  }
}
