import cors from 'cors'
import express from 'express'
import morgan from 'morgan'

import { logStream } from './common'

const app = express()

const corsOptions: cors.CorsOptions = {
  origin: function (origin: any, callback: any) {
    callback(null, true)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}

app.use(cors(corsOptions))
app.use(express.urlencoded({ extended: true }))
app.use(express.json({ limit: '10mb' }))

// By adding this route before morgan prevents it being logged which in production setting
// is annoying and pollutes the logs with gazillion "GET /health" lines
app.get('/health', (req: any, res: any) => {
  res.sendStatus(200)
})

app.use(morgan('short', { stream: logStream }))

export { app }
