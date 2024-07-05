import test from 'node:test';
import assert from 'node:assert/strict';

import { EventEmitter } from '../src/index.js';

const emitter = new EventEmitter(
    'message'
);

await test('synchronous passing test', async (ctx) => {
    let listeners;

    await ctx.test('access invalid events', () => {
        assert.throws(() => {
            emitter.listeners('invalid event');
        });
    });

    await ctx.test('access valid events', () => {
        listeners = emitter.listeners('message');
        assert.deepEqual(listeners, []);

        const events = emitter.events();
        assert.deepEqual([...events.keys()], ['message']);
    });

    await ctx.test('addListener', () => {
        assert.throws(() => {
            emitter.addListener('message', 'invalid function');
        });

        emitter.addListener('message', console.log, { count: 1 });
        emitter.addListener('message', [console.warn, console.error]);

        assert.deepEqual(listeners, [
            { callback: console.log, count: 1 },
            { callback: console.warn, count: Infinity },
            { callback: console.error, count: Infinity }
        ]);
    });

    await ctx.test('removeListener', () => {
        emitter.removeListener('message', console.warn);

        assert.deepEqual(listeners, [
            { callback: console.log, count: 1 },
            { callback: console.error, count: Infinity }
        ]);
    });

    await ctx.test('removeAllListeners', () => {
        emitter.removeAllListeners('message');
        assert.deepEqual(listeners, []);
    });

    await ctx.test('emit without errors', () => {
        emitter.addListener('message', (...args) => {
            assert.deepEqual(args, [1, 2]);
            return 'val1';
        });

        emitter.addListener('message', () => 'val2');

        const results = emitter.emit('message', [1, 2]);
        assert.deepEqual(results, ['val1', 'val2']);
    });

    await ctx.test('emit with errors', () => {
        const error = new Error('ERROR');

        emitter.addListener('message', () => {
            throw error;
        });

        assert.throws(() => {
            emitter.emit('message', [1, 2]);
        }, error);

        const results = emitter.emit('message', [1, 2], error => error);
        assert.deepEqual(results, ['val1', 'val2', error]);
    });
});
