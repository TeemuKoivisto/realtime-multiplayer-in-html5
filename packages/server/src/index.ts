import express from 'express'

const app = express()
const port = process.env.PORT || 8080

app.get('*', (req, res) => {
  res.send('<h1>Hello From Node on Fly!</h1>')
})

app.listen(port, () => console.log(`HelloNode app listening on port ${port}!`))

// import { enableDebug } from '@example/game'
// import { app } from './app'
// import { config, log } from './common'
// import { Server } from './Server'

// // enableDebug(true)

// const httpServer = app.listen(config.PORT, '0.0.0.0', () => {
//   console.log(`App started at port: ${config.PORT}`)
// })

// const server = new Server(httpServer)

// process.on('exit', () => {
//   console.log('Shutting down server')
// })
