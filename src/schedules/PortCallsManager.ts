import Timeout = NodeJS.Timeout
import Sequelize          from 'sequelize'
import axios              from 'axios'
import {
    Port,
    PortCall,
    Vessel
}                         from '../sequelize/models'
import {sequelize}        from '../sequelize/sequelize'
import {
    compareSchedulePortCalls
}                         from './portCallsCompare'
import {PORT_CALL_STATUS} from '../sequelize/models/PortCall.model'

export class VesselPortCall {

    private vesselNumber: number

    constructor (v: number) {
        this.vesselNumber = v
    }

    async process (date: Date) {
        /** this is only in test */
        date = new Date(Math.floor(date.getTime() / 60000) * 60000)
        date.setHours(12); date.setMinutes(0)
        /** check maybe is done , this is only for test purpose */
        const lastValidPortCall = await PortCall.findOne({
            where: {
                fkVesselId: this.vesselNumber
            },
            order: [['validSequence', 'DESC']]
        })

        /** just to prevent same date from test */
        if (lastValidPortCall) {
            const pp = await PortCall.findOne({
                where: {
                    fkVesselId: this.vesselNumber,
                    validSequence: lastValidPortCall.validSequence
                },
                order: [['updatedAt', 'DESC']]
            })
            if (pp.updatedAt >= date) {
                return
            }
        }
        const result = await axios.get(`https://import-coding-challenge-api.portchain.com/api/vessel-schedules/${this.vesselNumber}?cursor=${date.toISOString().substring(0, 10)}`)
        let portCalls = result.data
        let ports = portCalls.map((x: any) => x.port)
        /** sort the ports  */
        ports.sort((a: any, b: any) => (a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0))
        /**  remove same  */
        ports = ports.filter((p: any, index: any, arr: any) => index === 0 ? true : p.id !== arr[index - 1].id)
        /** check base **/
        const findPorts = async () => {
            return Port.findAll({
                where: {
                    portUniqueStr: {
                        [Sequelize.Op.in]: ports.map((x: any) => x.id)
                    }
                }
            })
        }

        let portsInBase = await findPorts()
        if (portsInBase.length !== ports.length) {
            /** all ports not in base */
            const pArr = ports.filter((p: any) => !portsInBase.find((x: any) => x.portUniqueStr === p.id))
            const transaction = await sequelize.transaction()
            for (let i = 0; i < pArr.length; i++) {
                await Port.findOrCreate({
                    where: {
                        portUniqueStr: pArr[i].id
                    },
                    defaults: {
                        portUniqueStr: pArr[i].id,
                        name: pArr[i].name
                    },
                    transaction: transaction
                })
            }
            await transaction.commit()
            /** take ports again now all are there */
            portsInBase = await findPorts()
        }

        portCalls = portCalls.map((x: any) => {
            return {
                arrivalDate: new Date(x.arrival),
                departureDate: new Date(x.departure),
                initStatus: PORT_CALL_STATUS.ADDED,
                lastStatus: PORT_CALL_STATUS.VALID,
                validSequence: lastValidPortCall ? lastValidPortCall.validSequence + 1 : 1,
                fkVesselId: this.vesselNumber,
                fkPortId: portsInBase.find((p: any) => p.portUniqueStr === x.port.id).id,
                createdAt: date,
                updatedAt: date,
            }
        })

        portCalls.sort((a: any, b: any) => (a.arrivalDate < b.arrivalDate) ? -1 : ((a.arrivalDate > b.arrivalDate) ? 1 : 0))

        if (!lastValidPortCall) {
            /** first insert of route */
            await PortCall.bulkCreate(portCalls)
            return
        }

        /** take all last validated */
        const previousValidPorts = await PortCall.findAll({
            where: {
                fkVesselId: this.vesselNumber,
                validSequence: lastValidPortCall.validSequence,
                lastStatus: PORT_CALL_STATUS.VALID
            },
            order: [['arrivalDate', 'ASC']]
        })

        const compareResult = compareSchedulePortCalls(portCalls, previousValidPorts)
        compareResult.printPorts()

        /** Result have to bi fixed */
        const transaction = await sequelize.transaction()
        const properties = {transaction: transaction}

        try {

            const dataBasePromise = compareResult.resultCompare.array.map((pc, index) => {
                const prevPoint = compareResult.resultCompare.arrayOld[index]
                switch (pc.status) {
                    case PORT_CALL_STATUS.PROCESSED:
                        return prevPoint.portCallModel.update({
                            lastStatus: PORT_CALL_STATUS.PROCESSED,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.DELETED:
                        return prevPoint.portCallModel.update({
                            lastStatus: PORT_CALL_STATUS.DELETED,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.INSERTED:
                        return PortCall.create({
                            ...pc.portCallModel,
                            initStatus: PORT_CALL_STATUS.INSERTED,
                            createdAt: date,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.ADDED:
                        return PortCall.create({
                            ...pc.portCallModel,
                            createdAt: date,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.VALID:
                        if (!pc.isDifferenceInDates(prevPoint)) {
                            return prevPoint.portCallModel.update({
                                validSequence: lastValidPortCall.validSequence + 1,
                                updatedAt: date
                            },properties)
                        }
                        return Promise.all([
                            prevPoint.portCallModel.update({
                                lastStatus: PORT_CALL_STATUS.CHANGED,
                                updatedAt: date
                            }, properties),
                            PortCall.create({
                                ...pc.portCallModel,
                                fkPortCallId: prevPoint.portCallModel.id,
                                initStatus: PORT_CALL_STATUS.CHANGED,
                                createdAt: date,
                                updatedAt: date
                            },properties)
                        ])
                }
            })
            await Promise.all(dataBasePromise)
            transaction.commit()
        } catch (e) {
            transaction.rollback()
            /** have to send message to admin */
        }

    }

}

class PortCallsManager {

    private timer: Timeout
    private currentDate: Date
    private lastDate: Date

    constructor () {
        this.currentDate = new Date(2019, 0, 20, 12, 12)
        this.lastDate = new Date(2019,1,1, 12,12)
    }

    async setVessels () {
        const result = await axios.get('https://import-coding-challenge-api.portchain.com/api/vessels')
        for (let i = 0; i < result.data.length; i++) {
            await Vessel.findOrCreate({
                where: {
                    id: result.data[i].imo,
                },
                defaults: {
                    id: result.data[i].imo,
                    name: result.data[i].name
                }
            })
        }
    }

    setTimerInterval (interval: number) {
        this.timer && clearInterval(this.timer)
        const fn = this.run.bind(this)
        this.timer = setTimeout(fn, interval)
    }

    async run () {
        const vessels = (await Vessel.findAll()).filter( x => x.id === 9461867)
        const vesselsProcess = vessels.map((x: any) => {
            const vp = new VesselPortCall(x.id)
            return vp.process(this.currentDate)
        })
        await Promise.all(vesselsProcess)
        this.currentDate.setDate(this.currentDate.getDate() + 1)
        console.log(this.currentDate)
        if (this.lastDate < this.currentDate) {
            return
        }
        this.setTimerInterval(100)
    }
}

export const instance = new PortCallsManager()
export default instance
