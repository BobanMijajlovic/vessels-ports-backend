import {PORT_CALL_STATUS} from '../sequelize/models/PortCall.model'

export enum PORT_CALL_STATUS_STR {
    NOT_DEFINED='NOT_DEF',
    REMOVED ='REMOVED',
    DELETED ='DELETED',
    INSERTED ='INSERTED',
    ADDED ='ADDED',
    NEW='NEW',
    PROCESSED='PROCESSED',
    VALID ='VALID'

}

interface INodeStatus {
    isRemovedPort: (portId: number)=> boolean,
    isAddedPort: (portId: number)=> boolean,
    arrayNew: PortCall[],
    arrayOld: PortCall[],
    indexNew: number,
    indexOld: number,
    result: INodeStatusResult[]
}

interface INodeStatusResult {
    array: PortCall[]
    arrayOld: PortCall[]
    changes: number
    arrivalDif: number
}

class PortCall {
    status: number
    source: 'N'| 'O'   /** new or old*/
    portCallModel: any

    constructor (portCallModel: object, source: 'N' | 'O',  status?: number, ) {
        this.status = status ? status : PORT_CALL_STATUS.NOT_DEFINED
        this.source = source
        this.portCallModel = portCallModel
    }

    get newInstance () {
        const instance = new PortCall(this.portCallModel,this.source,this.status)
        return instance
    }

    get arrivalDate () {
        return this.portCallModel.arrivalDate
    }

    get departureDate () {
        return this.portCallModel.departureDate
    }

    get portId () {
        return this.portCallModel.fkPortId
    }

    isDifferenceInDates (p: PortCall) {
        return (Math.floor((this.arrivalDate - p.arrivalDate) / 60000) !== 0 ) ||  (Math.floor((this.departureDate - p.departureDate) / 60000) !== 0)

    }

    getTimeArrivalDifference (p: PortCall) {
        return Math.floor((this.arrivalDate - p.arrivalDate) / 60000)
    }

}

export interface  IComparePortsResult {
    resultArrStr: string[]
    resultCompare: INodeStatusResult
}

export const compareSchedulePortCalls  =  (realArrayNew, realArrayPrev): IComparePortsResult => {

    const previousArray = realArrayPrev.map((x, index) => new PortCall(x, 'O'))
    const currentArray = realArrayNew.map((x, index) => new PortCall(x, 'N'))

    /** pick up all in previous that we are sure are removed */
    const removedPorts = previousArray.filter(pp => !(currentArray.find(x => x.portId === pp.portId))).map(y => y.portId)

    /** pick up all that are new for sure */
    const addedPorts = currentArray.filter(np => !(previousArray.find(x => x.portId === np.portId))).map(y => y.portId)

    const isRemovedPort = (portId) => {
        return !!removedPorts.find(x => x === portId)
    }

    const isAddedPort = (portId) => {
        return !!addedPorts.find(x => x === portId)
    }
    let result: INodeStatusResult[] = []

    PortCallsCompareNode.compareSchedule({
        isRemovedPort: isRemovedPort,
        isAddedPort: isAddedPort,
        arrayNew: currentArray.map(x => x.newInstance),
        arrayOld: previousArray.map(x => x.newInstance),
        indexNew: 0,
        indexOld: 0,
        result: result
    })

    const  findResults = (index) => {
        if (realArrayNew.length === 0) {
            return
        }
        let previousArray = realArrayPrev.map((x, index) => new PortCall(x, 'O'))
        const currentArray = realArrayNew.map((x, index) => new PortCall(x, 'N'))
        const p = currentArray[0]
        const i = previousArray.findIndex((x,ind) => {
            if (ind <= index ) {
                return false
            }
            return x.portId === p.portId
        })
        if (i === -1) {
            return
        }
        const arr = []
        previousArray.every((x,indx) => {
            if (indx === i) {
                return false
            }
            x.status = PORT_CALL_STATUS.PROCESSED
            arr.push(x)
            return true
        })

        previousArray = [...arr, ...previousArray]
        const _result: INodeStatusResult[] = []
        PortCallsCompareNode.compareSchedule({
            isRemovedPort: isRemovedPort,
            isAddedPort: isAddedPort,
            arrayNew: currentArray.map(x => x.newInstance),
            arrayOld: previousArray.map(x => x.newInstance),
            indexNew: 0,
            indexOld: 0,
            result: _result
        })
        result.push(..._result)
        findResults(i)
    }

    findResults(0)

    if (result.length === 0) {
        return void(0)
    }

    const x = result[result.length - 1]
    result = result.filter(x => PortCallsCompareNode.isAcceptable(x))
    PortCallsCompareNode.isAcceptable(x)

    if (result.length > 1) {
        result.sort((a,b) => {
            return Math.abs(a.arrivalDif) - Math.abs(b.arrivalDif)
        })
    }

    if (result.length === 0) {
        return void(0)
    }

    let res = result[0]
    /** just take with minumum time difference */
    result = result.filter(x => {
        return Math.abs(x.arrivalDif) === Math.abs(res.arrivalDif)
    })

    if ( result.length > 0) {
        /** if more then one result take one with minimum changes */
        result.sort((a,b) => {
            return a.changes - b.changes
        })
        res = result[0]
    }

    const portCallStatusStr = Object.keys(PORT_CALL_STATUS_STR)

    return {
        resultCompare: res,
        resultArrStr: res.array.map(x => {
            return portCallStatusStr[x.status]
        })
    }
}

const MAX_DEEP = 500

export interface INodeResult {
    array:  PortCall[],
    arrayOld:  PortCall[]
    changes: number,
    arrivalDif: number
}

class PortCallsCompareNode {
    private data: INodeStatus
    constructor ( data: INodeStatus) {
        this.data = {...data }
    }

    static compareSchedule (data: INodeStatus) {
        const p = new PortCallsCompareNode(data)
        p.fixNode()
    }

    getCurrentProcessingPortCall (array,indexStr) {
        const len = array.length
        let index = this.data[indexStr]
        while (index < len) {
            const pp = array[index]
            if (pp.status !== PORT_CALL_STATUS.NOT_DEFINED) {
                index++
                continue
            }
            this.data[indexStr] = index
            return pp
        }
        return void(0)
    }

    static isAcceptable (result: INodeResult) {
        if (result.array.length === 0) {
            return true
        }
        const p = result.array[0]
        if (p.status !== PORT_CALL_STATUS.PROCESSED  &&  p.status !== PORT_CALL_STATUS.VALID ) {
            return false
        }

        let startRoute = result.arrayOld.filter(p =>  p.source === 'O')
        let endRoute = result.array.filter(p => p.source === 'N')
        if (startRoute.length === 0 || endRoute.length === 0) {
            return
        }
        const isErrorInSystem = startRoute.find(x => {
            return (x.status === PORT_CALL_STATUS.INSERTED ||  x.status === PORT_CALL_STATUS.NEW || x.status === PORT_CALL_STATUS.ADDED)
        })
        const isErrorInSystem2 = endRoute.find((x => {
            return (x.status === PORT_CALL_STATUS.DELETED  || x.status === PORT_CALL_STATUS.PROCESSED ||  x.status === PORT_CALL_STATUS.REMOVED)
        }))

        if (isErrorInSystem || isErrorInSystem2) {
            return false /** this has to be additionally processed */
        }

        /** all start route processed removed from start */
        let index = startRoute.findIndex(x => x.status !== PORT_CALL_STATUS.PROCESSED)
        if (index > 0) {
            startRoute = startRoute.slice(index)
        }

        endRoute = endRoute.reverse()
        index = endRoute.findIndex(x => x.status !== PORT_CALL_STATUS.ADDED)
        if (index > 0) {
            endRoute = endRoute.slice(index)
        }
        endRoute = endRoute.reverse()

        while (endRoute.length > 0 && startRoute.length > 0) {
            const o = endRoute.pop()
            const n = startRoute.pop()

            if (!o) {
                if (n.status === PORT_CALL_STATUS.ADDED) {
                    continue
                } else {
                    return false
                }
            }
            if (!n) {
                if (o.status === PORT_CALL_STATUS.REMOVED) {
                    continue
                } else {
                    return false
                }
            }

            if (n.portId === o.portId) {
                if (n.status !== o.status) {
                    return false
                }
            }
        }
        return true
    }

    checkChanges (result: INodeStatusResult) {
        /** first mark all at start that have removed that are processed */

        result.array.every( x => {
            if (x.status !== PORT_CALL_STATUS.REMOVED) {
                return false
            }
            x.status  = PORT_CALL_STATUS.PROCESSED
            return true
        })

        result.array.every((x,index,array) => {
            const y = array[array.length - 1 - index]
            if (y.status !== PORT_CALL_STATUS.NEW) {
                return false
            }
            y.status = PORT_CALL_STATUS.ADDED
            return true
        })

        let index =  0
        /** all at start that are marked PROCESSED count as one changes */
        while (index < result.array.length) {
            const c = result.array[index]
            if (c.status !== PORT_CALL_STATUS.PROCESSED) {
                break
            }
            result.changes = 1
            index++
        }

        /** all at end marked as ADDED  count as one change */
        let lenEnd = result.array.length
        let _added = 0
        while (lenEnd > index) {
            const c = result.array[lenEnd - 1]
            if ( c.status !== PORT_CALL_STATUS.ADDED ) {
                break
            }
            _added = 1
            lenEnd--
        }
        result.changes += _added

        while ( index < lenEnd ) {
            const c = result.array[index++]
            if (c.status !== PORT_CALL_STATUS.VALID) {
                result.changes++
            }
            switch (c.status) {
                case
                    PORT_CALL_STATUS.NEW: c.status = PORT_CALL_STATUS.INSERTED
                    break
                case
                    PORT_CALL_STATUS.REMOVED: c.status = PORT_CALL_STATUS.DELETED
                    break
            }
        }
        result.arrivalDif = result.array.reduce((acc,p,index) => {
            return acc + p.getTimeArrivalDifference(result.arrayOld[index])
        },0)

    }

    fixNodePoint (firstRemoved: boolean) {
        const portCallOld = this.data.arrayOld[this.data.indexOld]
        let newData: INodeStatus = {} as INodeStatus
        if (this.data.result.length < MAX_DEEP) {
            newData = Object.assign({}, this.data, {
                arrayNew: this.data.arrayNew.map(x => x.newInstance),
                arrayOld: this.data.arrayOld.map(x => x.newInstance),
            })
        }

        portCallOld.status = PORT_CALL_STATUS.REMOVED
        this.data.arrayNew.splice(this.data.indexNew,0,portCallOld)
        if (firstRemoved) {
            this.fixNode()
        }

        /** only deep allowed */
        if (this.data.result.length < MAX_DEEP) {
            const nPortCallNew = newData.arrayNew[newData.indexNew]
            nPortCallNew.status = PORT_CALL_STATUS.NEW
            newData.arrayOld.splice(newData.indexOld, 0, nPortCallNew)
            PortCallsCompareNode.compareSchedule(newData)
        }

        if (!firstRemoved) {
            this.fixNode()
        }
        return
    }

    fixNode () {
        const portCallOld: PortCall = this.getCurrentProcessingPortCall(this.data.arrayOld, 'indexOld')
        const portCallNew: PortCall = this.getCurrentProcessingPortCall(this.data.arrayNew, 'indexNew')
        if (!portCallOld && !portCallNew) {
            const res = {
                array :  this.data.arrayNew,
                arrayOld:  this.data.arrayOld,
                changes: 0,
                arrivalDif: 0
            }
            this.checkChanges(res)
            this.data.result.push(res)
            return
        }

        if (!portCallNew) {
            /** this means point is deleted */
            portCallOld.status = PORT_CALL_STATUS.REMOVED
            this.data.arrayNew.push(portCallOld)
            this.fixNode()
            return
        }

        if (!portCallOld) {
            /** this means port is added */
            portCallNew.status = PORT_CALL_STATUS.NEW
            this.data.arrayOld.push(portCallNew)
            this.fixNode()
            return
        }

        /** if port call same then we have matching */
        if (portCallNew.portId === portCallOld.portId) {
            portCallOld.status = PORT_CALL_STATUS.VALID
            portCallNew.status = PORT_CALL_STATUS.VALID
            this.fixNode()
            return
        }

        /** in this point we have two portCalls with different portId
         *  we can assume two possibilities one that point is removed from current
         *  point that is in prevArray or new point is added in current array
         */

        /** if we  sure that is removed then only one step */
        if (this.data.isRemovedPort(portCallOld.portId)) {
            portCallOld.status = PORT_CALL_STATUS.REMOVED
            this.data.arrayNew.splice(this.data.indexNew,0,portCallOld)
            this.fixNode()
            return
        }

        /** if we sure that is added for sure */
        if (this.data.isAddedPort(portCallNew.portId)) {
            portCallNew.status = PORT_CALL_STATUS.NEW
            this.data.arrayOld.splice(this.data.indexOld,0,portCallNew)
            this.fixNode()
            return
        }

        /** we must start new search in two direction */
        /** give priority to some search*/

        if (this.data.indexNew === 0  || (this.data.arrayNew[this.data.indexNew - 1].status === PORT_CALL_STATUS.REMOVED) ) {
            /** if first then probably is done  - processed */
            this.fixNodePoint(true)
            return
        }

        if (this.data.arrayNew[this.data.indexNew - 1].status === PORT_CALL_STATUS.ADDED) {
            this.fixNodePoint(false)
            return
        }

        /** try to match new in previous array */

        if (this.data.arrayOld.findIndex(x => {
            if (x.status !== PORT_CALL_STATUS.NOT_DEFINED) {
                return false
            }
            return x.portId === portCallNew.portId
        }) > -1) { /** then possibility it is that point to match is is bigger so we go in way remove old */
            this.fixNodePoint(true)
        } else   {
            this.fixNodePoint(false)
        }
    }

}

