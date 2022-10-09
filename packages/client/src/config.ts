const getEnv = (env: string | undefined) => {
  if (!env) {
    throw new Error('Undefined environment variable!')
  }
  return env
}

export const API_URL = getEnv(import.meta.env.VITE_API_URL)
export const DEV = import.meta.env.DEV
