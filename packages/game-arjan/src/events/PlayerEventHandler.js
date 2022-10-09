import { TimedEvent } from './TimedEvent'
import { Event } from './Event'
import { BulletEvent } from './BulletEvent'
import { Bullet } from '../Bullet'

export function PlayerEventHandler({ eventSystem, bulletSystem }) {
  function reload(eventData, player) {
    const { id, name } = eventData

    eventSystem.dispatch(
      TimedEvent({
        id,
        name,
        firedBy: player,
        duration: 500,
        onDispatch: () => {
          player.setReloading(true)
        },
        onDone: () => {
          player.setReloading(false)
        },
      })
    )
  }

  function fire(eventData, player) {
    const { id, name } = eventData
    const bullet = Bullet({
      id: eventData.data ? eventData.data.bullet.id : null,
      firedBy: player,
    })

    eventSystem.dispatch(
      BulletEvent({
        id,
        name,
        bullet,
        firedBy: player,
        onDispatch: () => {
          bulletSystem.addBullet(bullet)
          player.fireBullet()
        },
      })
    )
  }

  function onNetworkEvent(eventData, player) {
    if (eventData.name === 'reload') {
      reload(eventData, player)
    }

    if (eventData.name === 'bulletEvent') {
      fire(eventData, player)
    }
  }

  function onEvent(eventData, player) {
    if (eventData.name === 'reload' && !player.isReloading()) {
      reload(eventData, player)
    }

    if (eventData.name === 'bulletEvent' && player.canFire()) {
      fire(eventData, player)
    }
  }

  return Object.freeze({
    onEvent,
    onNetworkEvent,
  })
}
