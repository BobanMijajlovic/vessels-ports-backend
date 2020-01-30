import 'reflect-metadata'
import {createSchemaGraphQL}                      from './sequelize/sequelize'
import {ApolloServer}                             from 'apollo-server-express'
import {ApolloServerTestClient} from            'apollo-server-testing'

let server: any = void(0)
/* const testServer: any = void(0)*/

const context = (data: any) => {
    const {req, res} = data
    return {
        req: req,
        res: res,
        url: `${req.protocol}://${req.get('host')}`,
        session: req.session

    }
}

const createApolloServer = () => {
    if (server) {
        return server
    }
    const schema = createSchemaGraphQL()
    server = new ApolloServer({
        playground: true,
        introspection: true,
        schema,
        context: (data) => context(data),
        formatError (err) {
            return err
        }

    })
    return server
}

/* interface ICreateTestApolloServer extends  ApolloServerTestClient {
    setContext: (data: any)=> void
    resetContext: ()=> void
}*/
/*
const createTestApolloServer = (): ICreateTestApolloServer => {
    if (testServer) {
        return testServer
    }
    const schema = createSchemaGraphQL()

    let testReq = {
        req: {cookies: {}},
        res: {
            cookie: (param: any, value: any) => {
                testReq.req.cookies[param]  = value
            }
        }
    }

    const server = new ApolloServer({
        schema,
        context: (data) => context(_.merge({},data,testReq)),
        formatError (err) {
            return err
        }
    })
    const setContext = (data: any) => {
        testReq = _.merge(testReq,data)
    }
    testServer = createTestClient(server)
    testServer = {
        ...testServer,
        ...{
            setContext
        }
    }
    return testServer
}*/

export default createApolloServer
/* export {
    createTestApolloServer

}*/
