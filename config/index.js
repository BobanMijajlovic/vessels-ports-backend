const  def   = require('./default.json')
const  local = require('./local.json')

const result  =  Object.assign(def,local)

module.exports = result
