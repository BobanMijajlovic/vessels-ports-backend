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
    printPorts: ()=> void
}

export interface ICompareMatch {
    indexPrev: number
    indexCurrent: number
    count: number
}

const __result = (prevArr, newArr, totalChange, arrivalDif) => {
    const res = {
        array: newArr,
        arrayOld: prevArr,
        changes: totalChange,
        arrivalDif: arrivalDif
    }

    const portCallStatusStr = Object.keys(PORT_CALL_STATUS_STR)
    const resultArrStr =  res.array.map(x => portCallStatusStr[x.status])
    return {
        resultCompare: res,
        resultArrStr: resultArrStr,
        printPorts: () => {
            console.log()
            let arr =  prevArr.filter(x => x.source === 'O').map(x => x.portId)
            console.log(arr.join(','))
            arr =  newArr.filter(x => x.source === 'N').map(x => x.portId)
            console.log(arr.join(','))
            console.log(resultArrStr.join(','))
            console.log()
        }
    }
}

const findMatchingPart = (arrayCurrent,arrayPrev) => {

    const arrayResult = []

    const findMatching  = (portCurrent: PortCall,indexCurrent: number, indexPrev: number) => {
        const pos = arrayPrev.findIndex((x,index) => {
            if (index < indexPrev) {
                return false
            }
            return x.portId  === portCurrent.portId
        })

        if (pos === -1) {
            return
        }

        indexPrev = pos

        let count: number = 0
        while (indexPrev + count < arrayPrev.length && indexCurrent + count < arrayCurrent.length) {
            if (arrayPrev[indexPrev + count].portId !== arrayCurrent[indexCurrent + count].portId) {
                break
            }
            count++
        }

        if (count < 3) {
            return
        }

        arrayResult.push({
            indexPrev,
            indexCurrent,
            count
        })

        findMatching(portCurrent,indexCurrent,indexPrev + 1)

    }

    arrayCurrent.forEach((x,index) => {
        findMatching(x,index,0)
    })

    return arrayResult.sort((x,y) => y.count - x.count)

}

export const compareSchedulePortCalls  =  (realArrayNew, realArrayPrev): IComparePortsResult => {

    const previousArray = realArrayPrev.map((x) => new PortCall(x, 'O'))
    const currentArray = realArrayNew.map((x) => new PortCall(x, 'N'))
    /** new new ports from service , mark all previous processed */
    if (currentArray.length === 0) {
        previousArray.forEach(x => {
            x.status = PORT_CALL_STATUS.PROCESSED
            currentArray.push(x)
        })
        return __result(previousArray,currentArray,0,0)

    }

    if (previousArray.length === 0)  {
        currentArray.forEach(x => {
            x.status = PORT_CALL_STATUS.ADDED
            previousArray.push(x)
        })
        return __result(previousArray,currentArray,0,0)
    }

    /** pick up all in previous that we are sure are removed */
    const removedPorts = previousArray.filter(pp => !(currentArray.find(x => x.portId === pp.portId))).map(y => y.portId)

    /** pick up all that are new for sure */
    const addedPorts = currentArray.filter(np => !(previousArray.find(x => x.portId === np.portId))).map(y => y.portId)

    const isRemovedPort = (portId) => {
        return !!removedPorts.find(x => x === portId)
    }

    const isAddedPort = (portId) =>  !!addedPorts.find(x => x === portId)
    let result: INodeStatusResult[] = []

    const matchingArray = findMatchingPart(currentArray,previousArray).slice(0,10)

    matchingArray.forEach((match: ICompareMatch, indm) => {
        let resultTempFront = []
        let resultTempBack = []

        PortCallsCompareNode.compareSchedule({
            isRemovedPort: isRemovedPort,
            isAddedPort: isAddedPort,
            arrayNew: currentArray.slice(0,match.indexCurrent).map(x => x.newInstance),
            arrayOld: previousArray.slice(0,match.indexPrev).map(x => x.newInstance),
            indexNew: 0,
            indexOld: 0,
            result: resultTempFront
        })

        PortCallsCompareNode.compareSchedule({
            isRemovedPort: isRemovedPort,
            isAddedPort: isAddedPort,
            arrayNew: currentArray.slice(match.indexCurrent + match.count).map(x => x.newInstance),
            arrayOld: previousArray.slice(match.indexPrev + match.count).map(x => x.newInstance),
            indexNew: 0,
            indexOld: 0,
            result: resultTempBack
        })

        resultTempFront = resultTempFront.sort((a,b) =>  a.changes - b.changes).filter((x,i,array) => {
            return x.changes === array[0].changes
        })
            .sort((a,b) => Math.abs(a.arrivalDif) - Math.abs(b.arrivalDif))

        resultTempBack = resultTempBack.sort((a,b) =>  a.changes - b.changes).filter((x,i,array) => {
            return x.changes === array[0].changes
        })
            .sort((a,b) => Math.abs(a.arrivalDif) - Math.abs(b.arrivalDif))

        const resF: INodeResult = resultTempFront.length > 0 ? resultTempFront[0] : {
            array:0,
            arrayOld:0,
            changes:0,
            arrivalDif: 0
        }

        const resB: INodeResult = resultTempBack.length > 0 ? resultTempBack[0] : {
            array:0,
            arrayOld:0,
            changes:0,
            arrivalDif: 0
        }

        /** fix array in resF */

        resF.array.reverse().every(x => {
            if (x.status === PORT_CALL_STATUS.ADDED) {
                x.status = PORT_CALL_STATUS.INSERTED
                return true
            }
            return false
        })
        resF.array.reverse()

        resF.arrayOld.reverse().every(x => {
            if (x.status === PORT_CALL_STATUS.ADDED) {
                x.status = PORT_CALL_STATUS.INSERTED
                return true
            }
            return false
        })
        resF.arrayOld.reverse()

        resB.array.every(x => {
            if (x.status === PORT_CALL_STATUS.PROCESSED) {
                x.status = PORT_CALL_STATUS.DELETED
                return true
            }
            return false
        })

        resB.arrayOld.every(x => {
            if (x.status === PORT_CALL_STATUS.PROCESSED) {
                x.status = PORT_CALL_STATUS.DELETED
                return true
            }
            return false
        })

        const res = {
            array: [...resF.array, ...currentArray.slice(match.indexCurrent,match.indexCurrent + match.count).map(x => x.newInstance)
                .map(x => {
                    x.status = PORT_CALL_STATUS.VALID; return x
                }), ...resB.array],
            arrayOld: [...resF.arrayOld, ...previousArray.slice(match.indexPrev, match.indexPrev + match.count).map(x => x.newInstance)
                .map(x => {
                    x.status = PORT_CALL_STATUS.VALID; return x
                }),
            ...resB.arrayOld],
            changes: resF.changes + resB.changes,
            arrivalDif: resF.arrivalDif + resB.arrivalDif
        }

        result.push(res)

    })

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
        const previousArray = realArrayPrev.map((x) => new PortCall(x, 'O'))
        let currentArray = realArrayNew.map((x) => new PortCall(x, 'N'))
        const p = currentArray[0]
        const i = previousArray.findIndex((x,ind) => {
            return ind <= index  ?  false :  x.portId === p.portId
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

        currentArray = [...arr, ...currentArray]
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

    result = result.sort((a,b) =>  a.changes - b.changes).filter((x,i,array) => {
        return x.changes === array[0].changes
    })
        .sort((a,b) => Math.abs(a.arrivalDif) - Math.abs(b.arrivalDif))

    const res = result.length > 0 ? result[0] : {
        array:0,
        arrayOld:0,
        changes:0,
        arrivalDif: 0
    }
    return __result(res.arrayOld,res.array,res.changes,res.arrivalDif)
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
        result.changes = 0
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

        /** swapped position fix */

        let index =  0
        /** all at start that are marked PROCESSED count as one changes */
        while (index < result.array.length) {
            const c = result.array[index]
            if (c.status !== PORT_CALL_STATUS.PROCESSED) {
                break
            }
            result.changes++
            index++
        }

        /** all at end marked as ADDED  count as one change */
        let lenEnd = result.array.length
        while (lenEnd > index) {
            const c = result.array[lenEnd - 1]
            if ( c.status !== PORT_CALL_STATUS.ADDED ) {
                break
            }
            result.changes++
            lenEnd--
        }

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

