import React from 'react'

export default class Help extends React.Component {
  render() {
    return (
      <div className="border-left border">
        <div className="pl-3">
          <ul className="mr-3 ml-3 mt-3 mb-3">
            <li>"w/a/s/d" or "Arrow keys" to move</li>
            <li>"space" to fire</li>
            <li>"r" to change color for half a second (demonstration of an "event")</li>
          </ul>
        </div>
      </div>
    )
  }
}
