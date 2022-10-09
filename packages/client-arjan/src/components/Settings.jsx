import React from 'react'

export default class Settings extends React.Component {
  constructor(props) {
    super(props)

    this.state = Object.assign({}, props.defaultSettings)
  }

  handleNumberChange(event) {
    this.setState({
      [event.target.name]: Number.parseFloat(event.target.value),
    })
  }

  handleValueChange(event) {
    this.setState({
      [event.target.name]: event.target.value,
    })
  }

  handleCheckboxChange(event) {
    this.setState({
      [event.target.name]: event.target.checked,
    })
  }

  shouldComponentUpdate(nextProps, nextState) {
    const shouldUpdate = Object.keys(this.state).some(stateProp => {
      return this.state[stateProp] !== nextState[stateProp]
    })

    if (shouldUpdate) {
      this.props.settingsChangeHandler(Object.assign({}, nextState))

      return true
    }

    return false
  }

  render() {
    return (
      <div className="border-left border">
        <form className="mr-3 ml-3">
          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="naiveApproach"
                checked={this.state.naiveApproach}
                onChange={this.handleCheckboxChange.bind(this)}
              />{' '}
              Use server position
            </label>
          </div>

          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="clientSmoothing"
                checked={this.state.clientSmoothing}
                onChange={this.handleCheckboxChange.bind(this)}
              />{' '}
              Client smoothing
            </label>
          </div>

          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="showServerPosition"
                checked={this.state.showServerPosition}
                onChange={this.handleCheckboxChange.bind(this)}
              />{' '}
              Show server position
            </label>
          </div>

          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="showDestinationPosition"
                checked={this.state.showDestinationPosition}
                onChange={this.handleCheckboxChange.bind(this)}
              />{' '}
              Show destination position
            </label>
          </div>
          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="clientPrediction"
                checked={this.state.clientPrediction}
                onChange={this.handleCheckboxChange.bind(this)}
              />
              Client prediction
            </label>
          </div>

          <dl>
            <dt>
              <label>Network offset</label>
            </dt>
            <dd>
              <select
                className="form-select select-sm"
                name="networkOffset"
                value={this.state.networkOffset}
                onChange={this.handleNumberChange.bind(this)}
              >
                {[0, 50, 100, 200, 500, 1000, 2000].map(value => {
                  return (
                    <option key={value} value={value}>
                      {value} ms
                    </option>
                  )
                })}
              </select>
            </dd>
          </dl>

          <dl>
            <dt>
              <label>Network buffer size</label>
            </dt>
            <dd>
              <select
                className="form-select select-sm"
                name="networkBufferSize"
                selected={this.state.networkBufferSize}
                onChange={this.handleNumberChange.bind(this)}
              >
                {[2, 4, 8].map(value => {
                  return (
                    <option key={value} value="value">
                      {value}
                    </option>
                  )
                })}
              </select>
            </dd>
          </dl>
        </form>
      </div>
    )
  }
}
