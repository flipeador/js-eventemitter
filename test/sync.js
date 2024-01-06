import test from 'node:test';
import assert from 'node:assert/strict';

import { EventEmitter } from '@flipeador/js-eventemitter';

const emitter = new EventEmitter(
    'message',
    'other'
);

await test('synchronous passing test', async (ctx) => {
    assert.throws(() => {
        emitter.listeners('invalid event');
    });

    const listeners = emitter.listeners('message');
    assert.deepEqual(listeners, []);

    const events = emitter.events();
    assert.deepEqual([...events.keys()], ['message']);

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

    await ctx.test('emit', () => {
        emitter.addListener('other', (...args) => {
            assert.deepEqual(args, [1, 2]);
            return 'val1';
        });

        emitter.addListener('other', () => 'val2');

        const result = emitter.emit('other', [1, 2]);
        assert.deepEqual(result, ['val1', 'val2']);
    });
});
