# fastify-pg-pubsub

Minimal pub/sub for fastify servers using postgres.

## Install

`fastify-pg-pubsub` requires `fastify-postgres`.

```
npm install fastify-postgres fastify-pg-pubsub
```

## Usage

The `fastify-pg-pubsub` plugin decorates the server instance with a `pubsub` property.

```js
fastify.register(require('fastify-postgres'))
fastify.register(require('fastify-pg-pubsub'))
fastify.register(async function (server) {
  server.pubsub.on('some_channel', (message) => {
    console.log(message)
  })
  await server.pubsub.subscribe('some_channel')
  // ... elsewhere ...
  await server.pubsub.publish('some_channel', 'message')
  // ...
  await server.pubsub.unsubscribe('some_channel')
})
```

## API

### `fastify.register(require('fastify-pg-pubsub'))`

Register the plugin. There are no options. It will request a postgres connection from `fastify-postgres`.

### `fastify.pubsub`

The `pubsub` property is an EventEmitter. Listen for events using the typical `.on`, `.once` methods.

### `fastify.pubsub.subscribe(channel)`

Subscribe to a channel to start receiving messages from it. Returns a Promise that resolves when the subscription is added in postgres.

The `channel` name can contain a-z, 0-9, underscores, and dashes.

### `fastify.pubsub.unsubscribe(channel)`

Unsubscribe from a channel to stop receiving messages from it. Returns a Promise that resolves when the subscription is removed in postgres.

The `channel` name can contain a-z, 0-9, underscores, and dashes.

### `fastify.pubsub.publish(channel, message)`

Publish a message to a channel. You do not need to be subscribed to a channel to  publish to it. The message must be a string. Use `JSON.stringify` or some other serialization mechanism before publishing other things.

The `channel` name can contain a-z, 0-9, underscores, and dashes.

## License

[Apache-2.0](./LICENSE)
