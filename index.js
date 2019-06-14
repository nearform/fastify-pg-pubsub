const fp = require('fastify-plugin')
const sql = require('@nearform/sql')
const EventEmitter = require('events')

const rxPgIdentifier = /^[A-Z_][0-9A-Z_-]+$/i

class PGPubSub extends EventEmitter {
  constructor (client) {
    super()
    this.client = client
    this.client.on('notification', ({ channel, payload }) => {
      this.emit(channel, payload)
    })
  }

  async publish (channel, message) {
    if (!rxPgIdentifier.test(channel)) {
      throw new TypeError('channel must be a valid PG identifier')
    }
    if (typeof message !== 'string') {
      throw new TypeError('message must be a string')
    }
    await this.client.query(sql`SELECT pg_notify(${channel}, ${message})`)
  }

  async subscribe (channel) {
    if (!rxPgIdentifier.test(channel)) {
      throw new TypeError('channel must be a valid PG identifier')
    }
    await this.client.query(`LISTEN "${channel}"`)
  }

  async unsubscribe (channel) {
    if (!rxPgIdentifier.test(channel)) {
      throw new TypeError('channel must be a valid PG identifier')
    }
    await this.client.query(`UNLISTEN "${channel}"`)
  }
}

module.exports = fp(async function (fastify) {
  const client = await fastify.pg.connect()

  fastify.decorate('pubsub', new PGPubSub(client))
  fastify.addHook('onClose', () => {
    client.release()
  })
})
