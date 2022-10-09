import debug from 'debug'

export const logger = debug('game')

export const log = {
  debug(str: string, obj?: any) {
    if (obj) {
      logger(`%c DEBUG ${str}`, 'color: #c563ff', obj)
    } else {
      logger(`%c DEBUG ${str}`, 'color: #c563ff')
    }
  },
  info(str: string, obj?: any) {
    if (obj) {
      logger(str, obj)
    } else {
      logger(str)
    }
  },
  warn(str: string, obj?: any) {
    if (obj) {
      logger(`%c WARNING ${str}`, 'color: #f3f32c', obj)
    } else {
      logger(`%c WARNING ${str}`, 'color: #f3f32c')
    }
  },
  error(str: string, obj?: any) {
    if (obj) {
      logger(`%c ERROR ${str}`, 'color: #ff4242', obj)
    } else {
      logger(`%c ERROR ${str}`, 'color: #ff4242')
    }
  },
}

/**
 * Sets debug logging enabled/disabled.
 * @param enabled
 */
export const enableDebug = (enabled: boolean) => {
  if (enabled) {
    debug.enable('game')
  } else {
    debug.disable()
  }
}
