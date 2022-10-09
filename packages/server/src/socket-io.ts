import { Server as SocketServer } from 'socket.io'

import { v4 as uuidv4 } from 'uuid'
import { Server as HTTPServer } from 'http'
import { Server } from './Server'

export class SocketIO {
  io: SocketServer

  constructor(httpServer: HTTPServer, game_server: Server) {
    const io = new SocketServer(httpServer, {
      cors: {
        origin: '*',
      },
      // transports: ['websocket'],
      pingInterval: 1000 * 60 * 5,
      pingTimeout: 1000 * 60 * 3,
    })
    this.io = io

    io.on('connection', async socket => {
      // @ts-ignore
      console.log('new connection: ', socket.conn?.id)
      socket.join('all')

      //Generate a new UUID, looks something like
      //5b2ca132-64bd-4513-99da-90e838ca47d1
      //and store this on their socket/connection
      socket.data.userid = uuidv4()

      //tell the player they connected, giving them their id
      socket.send('onconnected', { id: socket.data.userid })

      //now we can find them a game to play with someone.
      //if no game exists with someone waiting, they create one and wait.
      game_server.findGame(socket)

      //Useful to know when someone connects
      console.log('\t socket.io:: player ' + socket.data.userid + ' connected')

      //Now we want to handle some of the messages that clients will send.
      //They send messages here, and we send them to the game_server to handle.
      socket.on('message', function (m) {
        game_server.onMessage(socket, m)
      }) //client.on message

      socket.on('disconnect', client => {
        console.log(
          '\t socket.io:: client disconnected ' + socket.data.userid + ' ' + socket.data.game_id
        )

        //If the client was in a game, set by game_server.findGame,
        //we can tell the game server to update that game state.
        if (socket.data.game && socket.data.game.id) {
          //player leaving a game should destroy that game
          game_server.endGame(socket.data.game.id, socket.data.userid)
        }
      })

      socket.on('error', err => {
        console.log('socket error: ', err)
      })
    })
  }
}
