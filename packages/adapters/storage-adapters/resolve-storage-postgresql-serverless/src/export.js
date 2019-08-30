import stream from 'stream'
import through from 'through2'

import { BATCH_SIZE } from './constants'

const injectString = ({ escape }, value) => `${escape(value)}`
const injectNumber = (pool, value) => `${+value}`

function EventStream(pool, cursor = 0) {
  stream.Readable.call(this, { objectMode: true })

  this.pool = pool
  this.cursor = cursor
  this.offset = cursor

  this.injectString = injectString.bind(this, pool)
  this.injectNumber = injectNumber.bind(this, pool)

  this.reader = null
  this.rows = []
}

EventStream.prototype = Object.create(stream.Readable.prototype)
EventStream.prototype.constructor = stream.Readable

EventStream.prototype.processEvents = function() {
  for (
    let event = this.rows.shift();
    event != null;
    event = this.rows.shift()
  ) {
    if (this.destroyed) {
      this.rows.length = 0
      return
    } else {
      const isPaused =
        this.push({
          ...event,
          payload: JSON.parse(event.payload)
        }) === false
      this.cursor = event.eventOffset

      if (isPaused) {
        this.reader = null
        return
      }
    }
  }
}

EventStream.prototype._read = function() {
  this.processEvents()

  if (this.reader == null) {
    const nextReader = (async () => {
      await this.pool.waitConnectAndInit()

      const { executeStatement, escapeId, tableName, databaseName } = this.pool

      while (true) {
        if (this.reader !== nextReader) {
          return
        }

        const query = [
          `WITH ${escapeId('cte')} AS (`,
          `  SELECT ${escapeId('filteredEvents')}.*,`,
          `  SUM(${escapeId('filteredEvents')}.${escapeId('eventSize')})`,
          `  OVER (ORDER BY ${escapeId('filteredEvents')}.${escapeId(
            'eventId'
          )}) AS ${escapeId('totalEventSize')}`,
          `  FROM (`,
          `    SELECT * FROM ${escapeId(databaseName)}.${escapeId(tableName)}`,
          `    ORDER BY ${escapeId('eventId')} ASC`,
          `    OFFSET ${this.offset}`,
          `    LIMIT ${+BATCH_SIZE}`,
          `  ) ${escapeId('filteredEvents')}`,
          `)`,
          `SELECT * FROM ${escapeId('cte')}`,
          `WHERE ${escapeId('cte')}.${escapeId('totalEventSize')} < 512000`,
          `ORDER BY ${escapeId('cte')}.${escapeId('eventId')} ASC`
        ].join(' ')

        const nextRows = await executeStatement(query)

        if (this.reader !== nextReader) {
          return
        }

        for (let index = 0; index < nextRows.length; index++) {
          const event = nextRows[index]
          event.eventOffset = this.offset + index
          this.rows.push(event)
        }
        this.offset += nextRows.length

        this.processEvents()

        if (nextRows.length === 0) {
          if (!this.destroyed) {
            this.push(null)
          }
          return
        }
      }
    })()

    this.reader = nextReader
  }
}

const exportStream = (
  pool,
  { cursor, bufferSize = Number.POSITIVE_INFINITY } = {}
) => {
  const eventStream = new EventStream(pool, cursor)

  let size = 0
  let lastEventOffset = 0
  let isDestroyed = false

  const resultStream = through.obj(
    (event, encoding, callback) => {
      lastEventOffset = event.eventOffset
      delete event.eventOffset
      delete event.totalEventSize
      delete event.eventSize
      delete event.eventId

      const chunk = Buffer.from(JSON.stringify(event) + '\n', encoding)
      const byteLength = chunk.byteLength
      if (size + byteLength > bufferSize) {
        eventStream.destroy()
        if (!isDestroyed) {
          resultStream.cursor = lastEventOffset
          isDestroyed = true
        }
        callback(false, null)
      } else {
        size += byteLength
        callback(false, chunk)
      }
    },
    callback => {
      eventStream.destroy()

      if (resultStream.cursor == null) {
        resultStream.cursor = lastEventOffset + 1
      }

      callback()
    }
  )

  eventStream.pipe(resultStream)

  return resultStream
}

export default exportStream
