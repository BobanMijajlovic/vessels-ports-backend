import 'reflect-metadata'
import {
    Arg,
    Args,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver,
    Root,
    Subscription
} from 'type-graphql'
import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                from 'sequelize-typescript'
import Port      from './Port.model'
import Vessel    from './Vessel.model'
import Sequelize from 'sequelize'

export enum PORT_CALL_STATUS {
    NOT_DEFINED,
    REMOVED,
    DELETED,
    INSERTED,
    ADDED,
    NEW,
    PROCESSED,
    VALID,
    CHANGED
}

@ObjectType()
@Table({
    tableName: 'port_call',
    timestamps: false
})

export default class PortCall extends Model<PortCall> {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.BIGINT
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DATE,
        field: 'arrival_date'
    })
    arrivalDate: Date

    @Field()
    @Column({
        allowNull: false,
        type: DataType.DATE,
        field: 'departure_date'
    })
    departureDate: Date

    @Field( type => Int)
    @Column({
        comment: ' 0 - added regularly like new port , 1- inserted, 2 - changed ( new record that has same port but different arrival or departure time)',
        allowNull: false,
        defaultValue: 0,
        type: DataType.INTEGER,
        field: 'init_status'
    })
    initStatus: number

    @Field( type => Int)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
        field: 'last_status'
    })
    lastStatus: number

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
        field: 'valid_sequence'
    })
    validSequence: number

    @Field(type => Int,{nullable: true})
    @ForeignKey(() => PortCall)
    @Column({
        comment: 'pointer to last port call that consist data of changed arrival or departure time',
        allowNull: true,
        field: 'fk_port_call_id'
    })
    fkPortCallId: number

    @Field(type => Int)
    @ForeignKey(() => Port)
    @Column({
        allowNull: false,
        field: 'fk_port_id'
    })
    fkPortId:  number

    @Field(type => Int)
    @ForeignKey(() => Vessel)
    @Column({
        allowNull: false,
        field: 'fk_vessel_id'
    })
    fkVesselId: number

    @Field()
    @CreatedAt
    @Column({
        type: DataType.DATE,
        field: 'created_at'
    })
    createdAt: Date

    @Field()
    @UpdatedAt
    @Column({
        type: DataType.DATE,
        field: 'updated_at'
    })
    updatedAt: Date

    /** relations */
    @Field(type => Port)
    @BelongsTo(() => Port)
    port: Port

    @Field(type => Vessel)
    @BelongsTo(() => Vessel)
    vessel: Vessel

    @Field(type => PortCall)
    @BelongsTo(() => PortCall)
    portCall: PortCall

}

@ObjectType('portCallHistory')
class PortCallHistory {
    @Field(type => Int)
    id: number

    @Field()
    createdAt: Date

    @Field()
    updatedAt: Date

    @Field(type => Int)
    initStatus: number

    @Field(type => Int)
    lastStatus: number

    @Field()
    arrivalDate: Date

    @Field()
    departureDate: Date
}

@ObjectType()
export class Notification {
    @Field(type => ID)
    id: number

    @Field(type => Int)
    sequence: number
}

export interface INotificationPayload {
    id: number;
    sequence: number;
}

@Resolver()
export class PortResolver {

    @Subscription({ topics: 'NEW_VALID_SEQUENCE' })
    subscriptionSequence (@Root() { id, sequence }: INotificationPayload): Notification {
        return { id, sequence }
    }

    @Query(returns => [PortCall], {name: 'validSchedule'})
    async validSchedule (@Arg('vessel', type => Int) vessel: number) {
        const arrayPortCalls = (await PortCall.findAll({
            where: {
                fkVesselId:vessel,
                lastStatus: { [Sequelize.Op.in]:[PORT_CALL_STATUS.PROCESSED,PORT_CALL_STATUS.VALID,PORT_CALL_STATUS.DELETED]}
            },
            order: [['arrivalDate', 'ASC']]
        })).map(x => x.toJSON() as PortCall)

        for (let i = 0;i < arrayPortCalls.length;i++) {
            const pCall: PortCall  = arrayPortCalls[i]
            let port = pCall
            while (port.fkPortCallId) {
                port = await PortCall.findByPk(port.fkPortCallId)
                if (!port) {
                    break
                }
                pCall.createdAt = port.createdAt
                pCall.initStatus = port.initStatus
            }
        }

        /** group same subsequent ports */
        const finalArray = []
        while (arrayPortCalls.length !== 0 ) {
            const arr = []
            const pc = arrayPortCalls.shift()
            arr.push(pc)
            while (arrayPortCalls.length !== 0 ) {
                if (pc.fkPortId !== arrayPortCalls[0].fkPortId) {
                    break
                }
                arr.push(arrayPortCalls.shift())
            }
            arr.sort((x,y) => x.createdAt.getTime() - y.createdAt.getTime())
            pc.lastStatus = arr[arr.length - 1].lastStatus
            pc.updatedAt = arr[arr.length - 1].updatedAt
            finalArray.push(pc)
        }
        return finalArray
    }

    @Query(returns => [PortCallHistory], {name: 'portHistory'})
    async portHistory (@Arg('portCallId', type => Int) portCallId: number) {

        let port = await PortCall.findByPk(portCallId)
        if (!port) {
            return []
        }

        let arrayPortCalls = (await PortCall.findAll({
            where: {
                fkVesselId:port.fkVesselId,
                lastStatus: { [Sequelize.Op.in]:[PORT_CALL_STATUS.PROCESSED,PORT_CALL_STATUS.VALID,PORT_CALL_STATUS.DELETED]}
            },
            order: [['arrivalDate', 'ASC']]
        })).map(x => x.toJSON() as PortCall)

        let index = arrayPortCalls.findIndex(x => x.id === port.id)
        /** back to first occurrence */
        while (index > 0) {
            if (port.fkPortId !== arrayPortCalls[index - 1].fkPortId) {
                break
            }
            index--
        }

        arrayPortCalls =  arrayPortCalls.slice(index)
        index = arrayPortCalls.findIndex(x => x.fkPortId !== port.fkPortId)
        if (index !== -1) {
            arrayPortCalls = arrayPortCalls.slice(0,index)
        }

        arrayPortCalls.sort((x,y) => x.createdAt.getTime() - y.createdAt.getTime())

        port = arrayPortCalls.find(x => x.id === port.id)
        const historyArray = []

        while (arrayPortCalls.length > 0) {
            const childrens = []
            const port = arrayPortCalls.shift()
            let _port = port
            childrens.push(port)
            while (_port.fkPortCallId) {
                _port = await PortCall.findByPk(_port.fkPortCallId)
                if (!_port) {
                    break
                }
                childrens.push(_port)
            }
            historyArray.push(...childrens.reverse())
        }
        return historyArray.map(x => ({
            id: x.id,
            initStatus: x.initStatus,
            lastStatus: x.lastStatus,
            departureDate: x.departureDate,
            arrivalDate: x.arrivalDate,
            createdAt: x.createdAt,
            updatedAt:x.updatedAt
        }))
    }

    @Query(returns => [Port], {name: 'schedulePorts'})
    async schedulePorts (@Arg('vessel', type => Int) vessel: number) {

        const data =  await PortCall.findAll({
            attributes:['fkPortId'],
            group:['fkPortId'],
            where: {
                fkVesselId:vessel
            }
        })

        return  Port.findAll(({
            where: {
                id: { [Sequelize.Op.in]:data.map((x: any) => x.fkPortId)},
            }
        }))

    }

}
