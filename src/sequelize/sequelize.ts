import 'reflect-metadata'
import {buildSchemaSync}             from 'type-graphql'
import {Sequelize, SequelizeOptions} from 'sequelize-typescript'
import settings                      from '../../config/index'
import resolvers                     from './graphql/resolvers'
import * as _ from 'lodash'

let sequelize: any = void(0)

export const initSequelize = async (env?: string, drop?: boolean) => {
    const config = env || 'local'
    let  options = {
        ...settings.sequelizeSettings[config],
        ...{
            underscored: true,
            modelPaths: [__dirname + '/**/*.model.ts']
        }
    }

    if (process.env.DATABASE_URL) { /** heroku connection */
        options = _.omit(options,['username','password','host','database'])
        options = {
            ...options,
            ssl:true,
            dialectOptions:{
                ssl:{
                    require:true
                }
            }
        }
        sequelize = new Sequelize( process.env.DATABASE_URL,options as SequelizeOptions)
        await sequelize.sync({force: !!drop})
        return
    }

    sequelize = new Sequelize(options as SequelizeOptions)
    await sequelize.sync({force: !!drop})
}
export const createSchemaGraphQL = () => buildSchemaSync({
    resolvers: resolvers,
})

export {
    sequelize
}
