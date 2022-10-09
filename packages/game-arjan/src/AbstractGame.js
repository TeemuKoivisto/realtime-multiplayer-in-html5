import MainLoop from '@arjanfrans/mainloop'
import { Timer } from './Timer'
import { CollisionSystem } from './CollisionSystem'
import { EventSystem } from './events/EventSystem'
import { BulletSystem } from './BulletSystem'
import { PlayerEventHandler } from './events/PlayerEventHandler'

export function AbstractGame({ options, updateHandler = null, drawHandler = null }) {
  const players = new Map()
  let started = false
  let eventsFired = []
  const timer = Timer({ interval: options.timerFrequency })

  const eventSystem = EventSystem({
    onDispatch: event => {
      eventsFired.push(event)
    },
  })
  const bulletSystem = BulletSystem({ eventSystem })
  const playerEventHandler = PlayerEventHandler({ eventSystem, bulletSystem })
  const collisionSystem = CollisionSystem({ world: options.world })

  const simulationLoop = MainLoop({
    simulationTimestep: options.simulationTimestep,
  })

  function isStarted() {
    return started
  }

  function getPlayerById(playerId) {
    return players.get(playerId)
  }

  function getPlayers() {
    return players.values()
  }

  function getTime() {
    return timer.getTime()
  }

  function setTime(value) {
    timer.setTime(value)
  }

  function setUpdateHandler(handler) {
    updateHandler = handler
  }

  function setDrawHandler(handler) {
    drawHandler = handler

    if (typeof handler === 'function') {
      simulationLoop.setDraw(handler)
    }
  }

  function addPlayer(player) {
    player.setEventHandler(eventData => {
      playerEventHandler.onEvent(eventData, player)
    })

    player.setSpeed(options.playerSpeed)

    players.set(player.getId(), player)
    bulletSystem.addPlayer(player)
    collisionSystem.addPlayer(player)
  }

  function removePlayer(playerId) {
    const player = players.get(playerId)

    bulletSystem.removePlayer(player)
    collisionSystem.removePlayer(player)
    players.delete(playerId)
  }

  function start() {
    simulationLoop.start()
    timer.start()

    eventsFired = []

    started = true
  }

  function stop() {
    simulationLoop.stop()
    timer.stop()

    started = false
  }

  function clearInputs() {
    for (const player of players.values()) {
      player.clearInputs()
    }
  }

  function updateSystems(delta) {
    bulletSystem.clear()
    bulletSystem.update(delta)

    eventSystem.update(delta)

    collisionSystem.update(delta)
  }

  function update(delta) {
    if (typeof updateHandler === 'function') {
      updateHandler(delta)
    }

    updateSystems(delta)

    clearInputs()
  }

  function getStateForPlayer(player) {
    return {
      serverTime: getTime(),
      ownPlayer: player.toJSON(),
      players: Array.from(players.values())
        .filter(otherPlayer => {
          return otherPlayer !== player
        })
        .map(player => player.toJSON()),
      events: eventsFired
        .filter(event => {
          if (typeof event.getFiredBy === 'function') {
            return event.getFiredBy() !== player
          }

          return event
        })
        .map(event => event.toJSON()),
    }
  }

  function clearEvents() {
    eventsFired = []
  }

  function clearPlayers() {
    players.clear()
  }

  function getOptions() {
    return options
  }

  function getBullets() {
    return bulletSystem.getBullets()
  }

  function onEvent(eventData, dispatchedBy) {
    playerEventHandler.onEvent(eventData, dispatchedBy)
  }

  function onNetworkEvent(eventData) {
    if (eventData.name === 'hit') {
      bulletSystem.onHitEvent(eventData)
    } else {
      const dispatchedBy = getPlayerById(eventData.firedBy)

      playerEventHandler.onNetworkEvent(eventData, dispatchedBy)
    }
  }

  function getSimulationFps() {
    return Math.round(1000 / options.simulationTimestep)
  }

  simulationLoop.setUpdate(update)

  if (typeof drawHandler === 'function') {
    simulationLoop.setDraw(drawHandler)
  }

  return Object.freeze({
    isStarted,
    getPlayers,
    getOptions,
    getSimulationFps,
    setTime,
    addPlayer,
    getBullets,
    removePlayer,
    clearEvents,
    update,
    onEvent,
    onNetworkEvent,
    clearPlayers,
    getTime,
    clearInputs,
    getPlayerById,
    setUpdateHandler,
    setDrawHandler,
    getStateForPlayer,
    start,
    stop,
  })
}
