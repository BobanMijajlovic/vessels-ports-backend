import Port                                      from './Port.model'
import PortCall                                  from './PortCall.model'
import Vessel                                    from './Vessel.model'
import {ValidationError as ClassValidationError} from 'class-validator'
import {ArgumentValidationError}                 from 'type-graphql'

const throwArgumentValidationError = (property: string, data: any, constrains: { [type: string]: string }): ArgumentValidationError => {
    const error = new ClassValidationError()
    error.target = data
    error.value = data[property]
    error.property = property
    error.constraints = constrains
    throw new ArgumentValidationError([error])
}

export {
    throwArgumentValidationError,
    Port,
    PortCall,
    Vessel,
}
