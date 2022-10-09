import React from 'react'
import { io, Socket } from 'socket.io-client'

import RoomList from '../components/RoomList'
import Game from '../components/Game'
import { Network } from '../game/Network'
import { ClientGame } from '../game/ClientGame'
import Stats from '../components/Stats'
import { debugMode } from '../debug'

export default class Lobby extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      socket: null,
      user: null,
      rooms: [],
      currentRoomId: null,
      gameClient: null,
    }
  }

  componentDidMount() {
    const socket = io('http://localhost:4004', {
      reconnectionDelayMax: 10000,
    })
    this.setState({ socket })

    socket.on('connect_error', () => {
      console.log('error')
      this.props.onLobbyError('Error connecting to server.')
      socket.close()
    })

    socket.on('disconnect', () => {
      console.log('disconnected')
    })

    socket.on('connect', () => {
      console.log('socket connected')
      socket.on('onConnected', data => {
        console.log('socket on_connected', socket)
        const gameClient = ClientGame({
          options: this.props.gameSettings,
        })

        const network = Network({
          game: gameClient,
          pingTimeout: this.props.gameSettings.pingTimeout,
          socket,
        })

        gameClient.setNetwork(network)

        this.setState(old => ({
          ...old,
          user: data.user,
          socket: socket,
          rooms: data.rooms,
          gameClient: gameClient,
        }))
      })

      socket.on('roomCreated', data => {
        console.log('roomCreated')
        this.setState(old => ({
          ...old,
          rooms: this.state.rooms.filter(room => room.id !== data.room.id).concat(data.room),
        }))
      })

      socket.on('roomDeleted', data => {
        this.setState(old => ({
          ...old,
          rooms: this.state.rooms.filter(room => room.id !== data.roomId),
        }))
      })

      socket.on('onJoinedRoom', data => {
        this.setState(old => ({
          ...old,
          currentRoomId: data.room.id,
        }))
      })

      socket.on('onLeftRoom', () => {
        this.setState(old => ({
          ...old,
          currentRoomId: null,
        }))
      })

      socket.send('register', {
        name: this.props.name,
      })
    })

    if (debugMode) {
      this.onCreateRoom()
    }
  }

  onJoinRoom(room) {
    if (this.state.socket) {
      this.state.socket.send('joinRoom', { roomId: room.id })
    }
  }

  onLeaveRoom(roomId) {
    if (this.state.socket) {
      this.state.socket.send('leaveRoom', { roomId: roomId })
    }
  }

  onCreateRoom() {
    if (this.state.socket) {
      console.log('create room')
      this.state.socket.send('createRoom')
    }
  }

  onLogout() {
    console.log('onLogout')
    if (this.state.socket) {
      if (this.state.currentRoomId) {
        this.onLeaveRoom(this.state.currentRoomId)
      }

      this.state.socket.close()
    }

    this.props.logoutHandler()
  }

  render() {
    return (
      <div>
        <div className="columns">
          <div className="single-column">
            <div className="menu">
              <div className="menu-heading">
                Logged in: {this.props.name}
                <button
                  className="btn btn-sm btn-primary menu-btn"
                  onClick={this.onLogout.bind(this)}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="columns">
          <div className="one-fourth column">
            <RoomList
              rooms={this.state.rooms}
              onRoomClick={this.onJoinRoom.bind(this)}
              onRoomCreateClick={this.onCreateRoom.bind(this)}
              onRoomLeaveClick={this.onLeaveRoom.bind(this)}
              currentRoomId={this.state.currentRoomId}
            />
          </div>
          <div className="three-fourths column">
            {this.state.gameClient && this.state.currentRoomId ? (
              <div>
                <div className="text-center">
                  <Game
                    width={this.props.gameSettings.world.width}
                    height={this.props.gameSettings.world.height}
                    gameClient={this.state.gameClient}
                  />
                </div>
                <Stats game={this.state.gameClient} />
              </div>
            ) : (
              <div className="blankslate mb-5"></div>
            )}
          </div>
        </div>
      </div>
    )
  }
}
