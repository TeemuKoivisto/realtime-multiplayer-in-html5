if (process.env.NODE_ENV === undefined || process.env.NODE_ENV !== 'production') {
  await import('dotenv').then(exports => {
    exports.config()
  })
}

function parseNodeEnv(NODE_ENV?: string): 'production' | 'local' {
  if (NODE_ENV === 'production') {
    return 'production'
  }
  return 'local'
}

function parseInteger(env?: string) {
  try {
    return parseInt(env || '')
  } catch (err) {}
  return undefined
}

export const config = {
  ENV: parseNodeEnv(process.env.NODE_ENV),
  PORT: parseInteger(process.env.PORT) || 5090,
  LOG: {
    LEVEL: process.env.LOG_LEVEL || 'info',
  },
}
