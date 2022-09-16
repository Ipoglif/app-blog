const db = require('../libs/db')

const TABLE_NAME = 'users'

async function update(record, symbol) {
    await db(TABLE_NAME).update(record).where(symbol)
}

async function search(symbol) {
    const [ result ] = await db(TABLE_NAME).where(symbol)
    return result
}

async function insert(record) {
    const [ id ] = await db(TABLE_NAME).insert(record)
    return id
}

async function select() {
    return db(TABLE_NAME).select('*')
}

module.exports = {
    insert: insert,
    update: update,
    search: search,
    select: select
}