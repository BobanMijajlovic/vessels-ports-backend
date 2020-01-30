import 'reflect-metadata'
import {
    Arg,
    Field,
    ID,
    Int,
    ObjectType,
    Query,
    Resolver
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

    @Field()
    @Column({
        comment: ' 0 - added regularly like new port , 1- inserted, 2 - changed ( new record that has same port but different arrival or departure time)',
        allowNull: false,
        defaultValue: 0,
        type: DataType.INTEGER,
        field: 'init_status'
    })
    initStatus: number

    @Field()
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
        field: 'last_status'
    })
    lastStatus: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
        field: 'valid_sequence'
    })
    validSequence: number

    @Field(type => Int)
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

@Resolver()
export class PortResolver {

    @Query(returns => [PortCall], {name: 'validSchedule'})
    async validSchedule (@Arg('vessel', type => Int) vessel: number) {
        return PortCall.findAll({
            where: {
                fkVesselId:vessel,
                lastStatus: { [Sequelize.Op.in]:[PORT_CALL_STATUS.PROCESSED,PORT_CALL_STATUS.VALID,PORT_CALL_STATUS.DELETED]}
            },
            order: [['arrivalDate', 'ASC']]
        })
    }

    @Query(returns => [PortCall], {name: 'portHistory'})
    async portHistory (@Arg('portCallId', type => Int) portCallId: number) {

        const history = []

        let port = await PortCall.findByPk(portCallId)
        if (!port) {
            return []
        }
        history.push(port)
        while (port.fkPortCallId) {
            const pp = await PortCall.findByPk(port.fkPortCallId)
            if (!pp) {
                break
            }
            history.push(pp)
            port = pp
        }
        return history.reverse()

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

        return Port.findAll(({
            where: {
                id: { [Sequelize.Op.in]:data.map((x: any) => x.fkPortId)},
            }
        }))
    }

}
