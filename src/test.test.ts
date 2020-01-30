import 'reflect-metadata'
import 'jest-extended'

import {
    compareSchedulePortCalls,
    PORT_CALL_STATUS_STR
} from './schedules/portCallsCompare'

const {PROCESSED,VALID,ADDED,INSERTED,DELETED} = PORT_CALL_STATUS_STR

const setDate = (date: Date, value: number, type? : 'H'|'M'|'D') => {
    const dd = new Date(date)
    switch (type) {
        case 'H':
            dd.setHours(dd.getHours() + value)
            return dd
        case 'M':
            dd.setMinutes(dd.getMinutes() + value)
            return dd
        default:
            dd.setDate(date.getDate() + value)
            return dd
    }
}

describe('test pick data', () => {

    it('compare two routes - simple add',() => {
        const date = new Date(2019,0,1,12, 0,0)
        const oldPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)}]
        const newPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)},{fkPortId: 5, arrivalDate: setDate(date,4)}]

        const res = compareSchedulePortCalls(newPoints,oldPoints)
        const resExp = [VALID,VALID,VALID,VALID,ADDED]
        expect(res.resultArrStr).toEqual(resExp)
    })

    it('compare two routes - simple delete',() => {
        const date = new Date(2019,0,1,12, 0,0)
        const oldPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)}]
        const newPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)}]

        const res = compareSchedulePortCalls(newPoints,oldPoints)
        const resExp = [VALID,VALID,VALID,DELETED]
        expect(res.resultArrStr).toEqual(resExp)
    })

    it('compare two routes - simple processed',() => {
        const date = new Date(2019,0,1,12, 0,0)
        const oldPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)}]
        const newPoints = [{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)}]

        const res = compareSchedulePortCalls(newPoints,oldPoints)
        const resExp = [PROCESSED,VALID,VALID,VALID]
        expect(res.resultArrStr).toEqual(resExp)
    })

    it('compare two routes - simple inserted',() => {
        const date = new Date(2019,0,1,12, 0,0)
        const oldPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)}]
        const newPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 5, arrivalDate: setDate(date,4)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)}]

        const res = compareSchedulePortCalls(newPoints,oldPoints)
        const resExp = [VALID,VALID,INSERTED,VALID,VALID]
        expect(res.resultArrStr).toEqual(resExp)
    })

    it('compare two routes - simple processed,deleted,added',() => {
        const date = new Date(2019,0,1,12, 0,0)
        const oldPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)},{fkPortId: 7, arrivalDate: setDate(date,3)}]
        const newPoints = [{fkPortId: 3, arrivalDate: date},{fkPortId: 4, arrivalDate: setDate(date,1)},{fkPortId: 5, arrivalDate: setDate(date,2)},{fkPortId: 6, arrivalDate: setDate(date,3)}]

        const res = compareSchedulePortCalls(newPoints,oldPoints)
        const resExp = [PROCESSED,PROCESSED,VALID,VALID,DELETED,ADDED,ADDED]
        expect(res.resultArrStr).toEqual(resExp)
    })

    it('compare two routes - simple processed,inserted',() => {
        const date = new Date(2019,0,1,12, 0,0)
        const oldPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)}]
        const newPoints = [{fkPortId: 2, arrivalDate: date},{fkPortId: 3, arrivalDate: setDate(date,1)},{fkPortId: 7, arrivalDate: setDate(date,2)},{fkPortId: 6, arrivalDate: setDate(date,3)},{fkPortId: 4, arrivalDate: setDate(date,4)}]

        const res = compareSchedulePortCalls(newPoints,oldPoints)
        const resExp = [PROCESSED,VALID,VALID,INSERTED,INSERTED,VALID]
        expect(res.resultArrStr).toEqual(resExp)
    })

    it('compare two routes - simple processed, deleted, inserted',() => {
        const date = new Date(2019,0,1,12, 0,0)
        const oldPoints = [{fkPortId: 1, arrivalDate: date},{fkPortId: 2, arrivalDate: setDate(date,1)},{fkPortId: 3, arrivalDate: setDate(date,2)},{fkPortId: 4, arrivalDate: setDate(date,3)},{fkPortId: 5, arrivalDate: setDate(date,3)}]
        const newPoints = [{fkPortId: 2, arrivalDate: date}, {fkPortId: 3, arrivalDate: setDate(date,1)},{fkPortId: 7, arrivalDate: setDate(date,2)},{fkPortId: 6, arrivalDate: setDate(date,3)},{fkPortId: 5, arrivalDate: setDate(date,4)}]

        const res = compareSchedulePortCalls(newPoints,oldPoints)
        const resExp = [PROCESSED,VALID,VALID,DELETED,INSERTED,INSERTED,VALID]
        expect(res.resultArrStr).toEqual(resExp)
    })

    /*

        it('compare two routes,add,process',() => {
            const oldPoints = [{fkPortId: 1},{fkPortId: 2},{fkPortId: 3},{fkPortId: 4},{fkPortId: 5}]
            const newPoints = [{fkPortId: 2},{fkPortId: 3},{fkPortId: 4},{fkPortId: 5},{fkPortId: 6},{fkPortId: 7}]

            const res = compareSchedulePortCalls(newPoints,oldPoints)
            const resExp = [PROCESSED,VALIwD,VALID,VALID,VALID,ADDED,ADDED]
            expect(res.arrayStr).toEqual(resExp)
        })

        it('compare two routes,add,process, insert',() => {
            const oldPoints = [{fkPortId: 1},{fkPortId: 2},{fkPortId: 3},{fkPortId: 4},{fkPortId: 5}]
            const newPoints = [{fkPortId: 2},{fkPortId: 3},{fkPortId: 4},{fkPortId: 9},{fkPortId: 5},{fkPortId: 7}]

            const res = compareSchedulePortCalls(wnewPoints,oldPoints)
            const resExp = [PROCESSED,VALID,VALID,VALID,INSERTED,VALID,ADDED]
            expect(res.arrayStr).toEqual(resExp)
        })

        it('compare two routes,add,process, insert, removed',() => {
            const oldPoints = [{fkPortId: 1},{fkPortId: 2},{fkPortId: 3},{fkPortId: 4},{fkPortId: 5}]
            const newPoints = [{fkPortId: 2},{fkPortId: 3},{fkPortId: 5},{fkPortId: 7}]

            const res = compareSchedulePortCalls(newPoints,oldPoints)
            const resExp = [PROCESSED,VALID,VALID,DELETED,VALID,ADDED]
            expect(res.arrayStr).toEqual(resExp)
        })

        it('compare two routes - mix 1',() => {
            const oldPoints = [{fkPortId: 1},{fkPortId: 2},{fkPortId: 3},{fkPortId: 4},{fkPortId: 5},{fkPortId: 1},{fkPortId: 2}]
            const newPoints = [{fkPortId: 1},{fkPortId: 2},{fkPortId: 7}]

            const res = compareSchedulePortCalls(newPoints,oldPoints)
            const resExp = [PROCESSED]
            expect(res.arrayStr).toEqual(resExp)
        })
    */

})
