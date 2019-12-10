const { test } = require('tap')
const fastify = require('fastify')
const pgPubSub = require('.')

let app
test('Before all', async (t) => {
  app = fastify()
  app.register(require('fastify-postgres'), {
    pg: require('@nearform/no-gres')
  })
  app.register(pgPubSub)
  await app.ready()
  t.end()
})

test('pubsub - emit events', async (t) => {
  t.plan(1)
  t.tearDown(() => {
    app.pg.pool.done()
  })

  app.pg.pool.expect('LISTEN "emit_events"')
  app.pg.pool.expect(/SELECT pg_notify\(.*?, .*?\)/, ['emit_events', 'testval'], [])

  let r
  const promise = new Promise((resolve) => {
    r = resolve
  })
  await app.pubsub.subscribe('emit_events')
  app.pubsub.once('emit_events', (val) => {
    t.same(val, 'testval')
    r()
  })
  await app.pubsub.publish('emit_events', 'testval')
  app.pg.pool.client.emit('notification', {
    channel: 'emit_events',
    payload: 'testval'
  })
  await promise
})

test('pubsub - only subscribe to valid pg identifiers', async (t) => {
  t.plan(6)
  t.tearDown(() => {
    app.pg.pool.done()
  })

  app.pg.pool.expect(/LISTEN "abc"/)
  app.pg.pool.expect(/LISTEN "emit-events"/)
  app.pg.pool.expect(/LISTEN "x0y"/)

  await t.rejects(() => app.pubsub.subscribe('what ever'), /channel must be a valid PG identifier/)
  await t.rejects(() => app.pubsub.subscribe('###'), /channel must be a valid PG identifier/)
  await t.resolves(() => app.pubsub.subscribe('abc'))
  await t.rejects(() => app.pubsub.subscribe('"; -- drop table everything'), /channel must be a valid PG identifier/)
  await t.resolves(() => app.pubsub.subscribe('emit-events'))
  await t.resolves(() => app.pubsub.subscribe('x0y'))
})

test('pubsub - only unsubscribe from valid pg identifiers', async (t) => {
  t.plan(6)
  t.tearDown(() => {
    app.pg.pool.done()
  })

  app.pg.pool.expect(/UNLISTEN "abc"/)
  app.pg.pool.expect(/UNLISTEN "emit-events"/)
  app.pg.pool.expect(/UNLISTEN "x0y"/)

  await t.rejects(() => app.pubsub.unsubscribe('what ever'), /channel must be a valid PG identifier/)
  await t.rejects(() => app.pubsub.unsubscribe('###'), /channel must be a valid PG identifier/)
  await t.resolves(() => app.pubsub.unsubscribe('abc'))
  await t.rejects(() => app.pubsub.unsubscribe('"; -- drop table everything'), /channel must be a valid PG identifier/)
  await t.resolves(() => app.pubsub.unsubscribe('emit-events'))
  await t.resolves(() => app.pubsub.unsubscribe('x0y'))
})

test('pubsub - only publish to valid pg identifiers', async (t) => {
  t.plan(6)
  t.tearDown(() => {
    app.pg.pool.done()
  })

  app.pg.pool.expect(/SELECT pg_notify\(.*?, .*?\)/, ['abc', 'bbbbbbbb'], [])
  app.pg.pool.expect(/SELECT pg_notify\(.*?, .*?\)/, ['emit-events', 'xyz'], [])
  app.pg.pool.expect(/SELECT pg_notify\(.*?, .*?\)/, ['x0y', 'aaaaaaaa'], [])

  await t.rejects(() => app.pubsub.publish('what ever', 'xyz'), /channel must be a valid PG identifier/)
  await t.rejects(() => app.pubsub.publish('###', 'xyz'), /channel must be a valid PG identifier/)
  await t.resolves(() => app.pubsub.publish('abc', 'bbbbbbbb'))
  await t.rejects(() => app.pubsub.publish('"; -- drop table everything', 'xyz'), /channel must be a valid PG identifier/)
  await t.resolves(() => app.pubsub.publish('emit-events', 'xyz'))
  await t.resolves(() => app.pubsub.publish('x0y', 'aaaaaaaa'))
})

test('pubsub - only publish strings', async (t) => {
  t.plan(6)
  t.tearDown(() => {
    app.pg.pool.done()
  })

  app.pg.pool.expect(/SELECT pg_notify\(.*?, .*?\)/, ['abc', 'string'], [])

  await t.rejects(() => app.pubsub.publish('abc', null), /message must be a string/)
  await t.rejects(() => app.pubsub.publish('abc', undefined), /message must be a string/)
  await t.rejects(() => app.pubsub.publish('abc', { object: true }), /message must be a string/)
  await t.rejects(() => app.pubsub.publish('abc', ['array']), /message must be a string/)
  await t.rejects(() => app.pubsub.publish('abc', new Set(new Map())), /message must be a string/)
  await t.resolves(() => app.pubsub.publish('abc', 'string'))
})

test('After all', async (t) => {
  await app.close()
  t.end()
})
