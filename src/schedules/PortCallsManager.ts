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

    static async processPortsInBase (portCalls: {port: string}[]): Promise<Port[]> {
        let ports = portCalls.map((x: any) => x.port)
        /** get only ports */
        ports.sort((a: any, b: any) => (a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0))
        /** sort it by id */
        ports = ports.filter((p: any, index: any, arr: any) => index === 0 ? true : p.id !== arr[index - 1].id) /** just get unique */
        /** get all records from database for these ports
         *  function that we going to use more then ones
         * */
        const findPorts = async () => {
            return Port.findAll({
                where: {
                    portUniqueStr: {
                        [Sequelize.Op.in]: ports.map((x: any) => x.id)
                    }
                }
            })
        }

        let portsInBase = await findPorts()  /** get all ports with these ids */
        if (portsInBase.length !== ports.length) {
            /** if the length is not the same then some ports not exists in our db and must be stored first */
            const transaction = await sequelize.transaction()
            portsInBase = await findPorts()
            /** get ports once again under transaction, for security maybe there is more then one process and tables are changed */
            const pArr = ports.filter((p: any) => !portsInBase.find((x: any) => x.portUniqueStr === p.id)) /** filter only not not stored in db */
            for (let i = 0; i < pArr.length; i++) {
                await Port.findOrCreate({
                    /** use find or create, is less critical */
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
            await transaction.commit() /** we do not need roll back except database not working , transaction is here just to lock tables*/
            /** take ports again now all are there */
            portsInBase = await findPorts()
        }
        return portsInBase
    }

    async process (date: Date) {
        /** this is only in test, set the time as it is noon, to be the same for all records
         * */
        date = new Date(Math.floor(date.getTime() / 60000) * 60000)
        date.setHours(12); date.setMinutes(0)
        const lastValidPortCall = await PortCall.findOne({
            where: {
                fkVesselId: this.vesselNumber
            },
            order: [['validSequence', 'DESC']]
        })
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
        /** up to here, this is just in testing, to prevent same data to be processed, this can't happen in real situation  and this part can be removed */

        /** get next data from end point */
        const result = await axios.get(`https://import-coding-challenge-api.portchain.com/api/vessel-schedules/${this.vesselNumber}?cursor=${date.toISOString().substring(0, 10)}`)
        let portCalls = result.data
        if (portCalls.length === 0) {
            /** we are going to leave last state as valid */
            return
        }

        /** check ports in database, inserts not existing and get models from our database */
        const portModels = await VesselPortCall.processPortsInBase(portCalls)
        /** form array of portCalls as all are new for writing in db */
        portCalls = portCalls.map((x: any) => {
            return {
                arrivalDate: new Date(x.arrival),
                departureDate: new Date(x.departure),
                initStatus: PORT_CALL_STATUS.ADDED,
                lastStatus: PORT_CALL_STATUS.VALID,
                validSequence: lastValidPortCall ? lastValidPortCall.validSequence + 1 : 1, /** valid sequence is incremented for one of last valid sequence n db, so all new route instance will have unique valid sequence */
                fkVesselId: this.vesselNumber,
                fkPortId: portModels.find((p: any) => p.portUniqueStr === x.port.id).id,
                createdAt: date,
                updatedAt: date,
            }
        })

        /** if there is no any record for portCalls for this vessel then write these portCalls as first valid route */
        if (!lastValidPortCall) {
            await PortCall.bulkCreate(portCalls)
            return
        }

        /** sort new route by arrival time */
        portCalls.sort((a: any, b: any) => (a.arrivalDate < b.arrivalDate) ? -1 : ((a.arrivalDate > b.arrivalDate) ? 1 : 0))
        /** get the last valid route, from our db, our valid route has unique validSequence(number)  this number is incremented every time with new data from endpoint */
        const previousValidPorts = await PortCall.findAll({
            where: {
                fkVesselId: this.vesselNumber,
                validSequence: lastValidPortCall.validSequence,
                lastStatus: PORT_CALL_STATUS.VALID
            },
            order: [['arrivalDate', 'ASC']]
        })

            /** compare two arrays, old valid route from our DB, and new route from endpoint, results is two arrays where every portcall has valid status for  database
             *  result has two arrays, ( array-new data from  endpoints with defined status, with injected portCalls instances from last valid portCalls from our DB that has to be changed
             *
             * */
        const compareResult = compareSchedulePortCalls(portCalls, previousValidPorts)
      //  compareResult.printPorts()

        /** Write data to DB  */
        const transaction = await sequelize.transaction()
        const properties = {transaction: transaction}

        try {

            const dataBasePromise = compareResult.resultCompare.array.map((pc, index) => {
                const prevPoint = compareResult.resultCompare.arrayOld[index]
                switch (pc.status) {
                    case PORT_CALL_STATUS.PROCESSED:
                        /** in this case this represent instance of our last valid sequence, (database model), and just have to change status,
                         *  record is going to keep lastValidSequence and will have just updatedAt like new value ( * updatedAt will not be processed like here in real situation this is done
                         *  onlu for testing
                         */
                        return prevPoint.portCallModel.update({
                            lastStatus: PORT_CALL_STATUS.PROCESSED,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.DELETED:
                        /** Like PROCESSED this is also instance of previous sequence from DB, so we just change STATUS to DELETED */
                        return prevPoint.portCallModel.update({
                            lastStatus: PORT_CALL_STATUS.DELETED,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.INSERTED:
                        /** This is new instance, from new route and have to be inserted, NOTE; valid sequence is already defined before and is greater for 1 then last valid in DB*/
                        return PortCall.create({
                            ...pc.portCallModel,
                            initStatus: PORT_CALL_STATUS.INSERTED,
                            createdAt: date,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.ADDED:
                        /** this is also from new coming route but we mark ADDED, it is same like InSERT but it is at the end or new route*/
                        return PortCall.create({
                            ...pc.portCallModel,
                            createdAt: date,
                            updatedAt: date
                        }, properties)
                    case PORT_CALL_STATUS.VALID: /** this is valid point, it means that same position in route */
                        if (!pc.isDifferenceInDates(prevPoint)) { /** if there is no difference in arrival and departure time then we keep the same record and just validate it by validSequence */
                            return prevPoint.portCallModel.update({
                                validSequence: lastValidPortCall.validSequence + 1,
                                updatedAt: date
                            },properties)
                        }
                        /** if we have differences in time then we keep old one and create new one with new dates and pointer( foreign key ) to last one to keep tracking of change */
                        return Promise.all([
                            prevPoint.portCallModel.update({  /** change last record as changed, but keep sequnceNumber of previous route, this record not belongs to new route */
                                lastStatus: PORT_CALL_STATUS.CHANGED,
                                updatedAt: date
                            }, properties),
                            PortCall.create({ /** crete new point , for this route with valid data */
                                ...pc.portCallModel,
                                fkPortCallId: prevPoint.portCallModel.id,
                                initStatus: PORT_CALL_STATUS.CHANGED,
                                createdAt: date,
                                updatedAt: date
                            },properties)
                        ])
                }
            })
            await Promise.all(dataBasePromise) /** write to DB, now we have new route and updated status of old records */
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
        this.currentDate = new Date(2019, 0, 1, 12, 12)
        this.lastDate = new Date(2019,6,1, 12,12)
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

    /** Run is the function that can be used to call in intervals to getting data from endpoints ( portcalls ) */
    async run () {
        const vessels = (await Vessel.findAll())
          // /  .filter( x => x.id === 9387425)
            // .filter( x => x.id === 9335173)

        /** get the process for every vessel in database, process in promise */
        const vesselsProcess = vessels.map((x: any) => {
            const vp = new VesselPortCall(x.id)
            return vp.process(this.currentDate) /** this is main process for every vessel and new portcalls data */
        })
        /** execute all as once, this should be change if there is too much vessels, to prevent memory  usage */
        await Promise.all(vesselsProcess)
        /** this part is only in simulation part, in reality this part we be removed */
        this.currentDate.setDate(this.currentDate.getDate() + 1)
       // console.log(this.currentDate)
        if (this.lastDate < this.currentDate) {
            return
        }
        this.setTimerInterval(100)
    }
}

export const instance = new PortCallsManager()
export default instance
