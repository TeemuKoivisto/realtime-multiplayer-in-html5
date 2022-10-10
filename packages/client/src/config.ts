const getEnv = (env: string | undefined) => {
  if (!env) {
    throw new Error('Undefined environment variable!')
  }
  return env
}

export const WS_URL = getEnv(import.meta.env.VITE_WS_URL)
export const DEV = import.meta.env.DEV
