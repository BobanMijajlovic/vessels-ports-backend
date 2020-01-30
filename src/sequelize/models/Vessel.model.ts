import 'reflect-metadata'
import {
    Field,
    Int,
    ObjectType,
    Query,
    Resolver
} from 'type-graphql'
import {
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript'

@ObjectType()
@Table({
    tableName: 'vessel'
})

export default class Vessel extends Model<Vessel> {

    @Field(type => Int)
    @PrimaryKey
    @Column({
        unique: true
    })
    id: number

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
export class VesselResolver {

    @Query(returns => [Vessel], {name: 'vessels'})
    async ports () {
        return Vessel.findAll({attributes: ['id', 'name']})
    }
}
