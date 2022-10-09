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

app.use(morgan('short', { stream: logStream }))

export { app }
