import React from 'react'

export default class RoomList extends React.Component {
  render() {
    return (
      <div>
        {this.props.currentRoomId ? (
          <div className="menu">
            <span className="menu-heading">
              Rooms
              <button
                className="btn btn-sm menu-btn"
                onClick={this.props.onRoomLeaveClick.bind(this, this.props.currentRoomId)}
              >
                Leave room
              </button>
            </span>
            <span className="menu-item">Room id: {this.props.currentRoomId}</span>
          </div>
        ) : (
          <div className="menu">
            <span className="menu-heading">
              Rooms
              <button
                className="btn btn-sm btn-primary menu-btn"
                onClick={this.props.onRoomCreateClick}
              >
                Create room
              </button>
            </span>
            {this.props.rooms.map((room, index) => {
              return (
                <span className="menu-item" key={index}>
                  <span className="css-truncate">{room.id}</span>
                  <button
                    className="btn btn-sm menu-btn"
                    onClick={this.props.onRoomClick.bind(this, room)}
                  >
                    Join
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>
    )
  }
}
