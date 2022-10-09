import { Socket } from 'socket.io'
import { GameInstance, GameServer } from '@example/game'

import { v4 as uuidv4 } from 'uuid'

const verbose = true

export class Server {
  game: GameServer
  games: Record<string, GameInstance> = {}
  game_count = 0
  fake_latency = 0
  local_time = 0
  _dt = new Date().getTime()
  _dte = new Date().getTime()
  //a local queue of messages we delay if faking latency
  messages: { client: any; message: string }[] = []

  constructor(game_server: GameServer) {
    this.game = game_server
    setInterval(() => {
      game_server._dt = new Date().getTime() - game_server._dte
      game_server._dte = new Date().getTime()
      game_server.local_time += game_server._dt / 1000.0
    }, 4)
  }

  log = (...args: string[]) => {
    if (verbose) console.log.apply(this, args)
  }

  onMessage = (client: any, message: string) => {
    if (this.fake_latency && message.split('.')[0].substr(0, 1) == 'i') {
      //store all input message
      this.messages.push({ client: client, message: message })

      setTimeout(() => {
        if (this.messages.length) {
          this._onMessage(this.messages[0].client, this.messages[0].message)
          this.messages.splice(0, 1)
        }
      }, this.fake_latency)
    } else {
      this._onMessage(client, message)
    }
  }

  _onMessage(client: Socket, message: string) {
    //Cut the message up into sub components
    const message_parts = message.split('.')
    //The first is always the type of message
    const message_type = message_parts[0]

    const other_client =
      client.data.game.player_host.userid == client.data.userid
        ? client.data.game.player_client
        : client.data.game.player_host

    if (message_type == 'i') {
      //Input handler will forward this
      this.onInput(client, message_parts)
    } else if (message_type == 'p') {
      client.send('s.p.' + message_parts[1])
    } else if (message_type == 'c') {
      //Client changed their color!
      if (other_client) other_client.send('s.c.' + message_parts[1])
    } else if (message_type == 'l') {
      //A client is asking for lag simulation
      this.fake_latency = parseFloat(message_parts[1])
    }
  }

  onInput(client: Socket, parts: string[]) {
    //The input commands come in like u-l,
    //so we split them up into separate commands,
    //and then update the players
    const input_commands = parts[1].split('-')
    const input_time = parts[2].replace('-', '.')
    const input_seq = parts[3]

    //the client should be in a game, so
    //we can tell that game to handle the input
    if (client.data?.game?.gamecore) {
      client.data.game.gamecore.handle_server_input(client, input_commands, input_time, input_seq)
    }
  }

  createGame(playerSocket: Socket) {
    //Create a new game instance
    const thegame: GameInstance = {
      id: uuidv4(), //generate a new id for the game
      player_host: playerSocket, //so we know who initiated the game
      player_client: null, //nobody else joined yet, since its new
      player_count: 1, //for simple checking of state
    }
    //Create a new game core instance, this actually runs the
    //game code like collisions and such.
    const gamecore = new GameServer(thegame)
    //Start updating the game loop on the server
    gamecore.update(new Date().getTime())
    thegame.gamecore = gamecore

    //Store it in the list of game
    this.games[thegame.id] = thegame

    //Keep track
    this.game_count++

    //tell the player that they are now the host
    //s=server message, h=you are hosting

    playerSocket.send('s.h.' + String(gamecore.local_time).replace('.', '-'))
    console.log('server host at  ' + gamecore.local_time)
    playerSocket.data.game = thegame
    playerSocket.data.hosting = true

    this.log(
      'player ' + playerSocket.data.userid + ' created a game with id ' + playerSocket.data.game.id
    )

    //return it
    return thegame
  }

  endGame(gameid: string, userid: string) {
    const thegame = this.games[gameid]

    if (thegame) {
      //stop the game updates immediate
      thegame.gamecore?.stop_update()

      //if the game has two players, the one is leaving
      if (thegame.player_count > 1) {
        //send the players the message the game is ending
        if (userid == thegame.player_host.data.userid) {
          //the host left, oh snap. Lets try join another game
          if (thegame.player_client) {
            //tell them the game is over
            thegame.player_client.send('s.e')
            //now look for/create a new game.
            this.findGame(thegame.player_client)
          }
        } else {
          //the other player left, we were hosting
          if (thegame.player_host) {
            //tell the client the game is ended
            thegame.player_host.send('s.e')
            //i am no longer hosting, this game is going down
            thegame.player_host.data.hosting = false
            //now look for/create a new game.
            this.findGame(thegame.player_host)
          }
        }
      }

      delete this.games[gameid]
      this.game_count--

      this.log('game removed. there are now ' + this.game_count + ' games')
    } else {
      this.log('that game was not found!')
    }
  }

  startGame(game: GameInstance) {
    if (game.player_client) {
      //right so a game has 2 players and wants to begin
      //the host already knows they are hosting,
      //tell the other client they are joining a game
      //s=server message, j=you are joining, send them the host id
      game.player_client.emit('s.j.' + game.player_host.data.userid)
      game.player_client.data.game = game

      //now we tell both that the game is ready to start
      //clients will reset their positions in this case.
      game.player_client.emit('s.r.' + String(game.gamecore?.local_time).replace('.', '-'))
    }
    if (game.player_host) {
      game.player_host.emit('s.r.' + String(game.gamecore?.local_time).replace('.', '-'))
    }

    //set this flag, so that the update loop can run it.
    game.active = true
  }

  findGame(playerSocket: Socket) {
    this.log('looking for a game. We have : ' + this.game_count)

    //so there are games active,
    //lets see if one needs another player
    if (this.game_count) {
      let joined_a_game = false

      //Check the list of games for an open game
      for (const gameid in this.games) {
        //only care about our own properties.
        if (!this.games.hasOwnProperty(gameid)) continue
        //get the game we are checking against
        const game_instance = this.games[gameid]

        //If the game is a player short
        if (game_instance.player_count < 2) {
          //someone wants us to join!
          joined_a_game = true
          //increase the player count and store
          //the player as the client of this game
          game_instance.player_client = playerSocket
          if (game_instance.gamecore) {
            game_instance.gamecore.players.other.socket = playerSocket
          }
          game_instance.player_count++

          //start running the game on the server,
          //which will tell them to respawn/start
          this.startGame(game_instance)
        } //if less than 2 players
      } //for all games

      //now if we didn't join a game,
      //we must create one
      if (!joined_a_game) {
        this.createGame(playerSocket)
      } //if no join already
    } else {
      //if there are any games at all

      //no games? create one!
      this.createGame(playerSocket)
    }
  }
}
