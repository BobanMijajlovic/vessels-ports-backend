import 'reflect-metadata'
import {initSequelize, sequelize}    from './sequelize/sequelize'

beforeAll(async () => {
    await initSequelize('test',  false)

})

afterAll(async (done) => {
    await sequelize.close()
    done()
})

