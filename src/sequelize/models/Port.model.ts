import 'reflect-metadata'
import {
    Args,
    Ctx,
    Field,
    ID,
    InputType,
    ObjectType,
    Query,
    Resolver
}                                from 'type-graphql'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                from 'sequelize-typescript'

@ObjectType()
@Table({
    tableName: 'port'
})

export default class Port extends Model<Port> {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number

    @Field()
    @Column({
        field: 'port_unique_str',
        allowNull: false,
        unique: true,
        type: DataType.STRING(6),
    })
    portUniqueStr: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(128),
    })
    name: string

    @Field()
    @CreatedAt
    @Column({
        field: 'created_at'
    })
    createdAt: Date

    @Field()
    @UpdatedAt
    @Column({
        field: 'updated_at'
    })
    updatedAt: Date
}

@Resolver()
export class PortResolver {

    @Query(returns => [Port], {name: 'ports'})
    async ports () {
        return Port.findAll({attributes: ['id', 'name','portUniqueStr']})
    }
}
