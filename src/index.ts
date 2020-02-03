import express            from 'express'
import bodyParser         from 'body-parser'
import cors               from 'cors'
import configuration      from '../config/index'
import {initSequelize}    from './sequelize/sequelize'
import createApolloServer from './apolloServer'
import portCallManager    from './schedules/PortCallsManager'

const cleanBase = process.env.CLEEN_BASE ? (process.env.CLEAN_BASE === 'Y') : !!configuration.cleanBase

const app = express()
app.use(bodyParser.json())

const corsOptions = {
    credentials: true,
    origin:
        function(origin: any, callback: any) {
            if (configuration.corsOrigin.whitelist.indexOf(origin) !== -1 || !origin) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        }
}

app.use(cors(corsOptions));

(async () => {
    await initSequelize('test', cleanBase)
    const PORT = process.env.PORT || configuration.PORT || 4000
    const server = createApolloServer()
    server.applyMiddleware({app,path: '/',cors:corsOptions})
    app.listen({port: PORT}, () => {
        console.log(`Apollo Server on http://localhost:${PORT}/graphql`)
    })

    if (process.env.GET_SCHEDULES ? (process.env.GET_SCHEDULES === 'Y') : !!configuration.getSchedules) {
        await portCallManager.setVessels()
        portCallManager.setTimerInterval(1000)
    }

})()

