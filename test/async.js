import test from 'node:test';
import assert from 'node:assert/strict';

import { EventEmitter } from '@flipeador/js-eventemitter';

const emitter = new EventEmitter(
    'message'
);

await test('asynchronous passing test', async (ctx) => {
    await ctx.test('emit2', async () => {
        emitter.addListener('message', async (...args) => {
            assert.deepEqual(args, [1, 2]);
            return Promise.resolve('val1');
        });

        emitter.addListener('message', () => 'val2');

        let result = emitter.emit2('message', [1, 2]);
        assert(result instanceof Promise);
        result = await result;

        assert.deepEqual(result, ['val1', 'val2']);
    });

    emitter.removeAllListeners();

    await ctx.test('emit2 ignore errors', async () => {
        emitter.addListener('message', () => new Promise((_, r) => {
            setTimeout(() => r(new Error(1)), 250);
        }));

        emitter.addListener('message', () => new Promise((r) => {
            setTimeout(() => r(2), 500);
        }));

        emitter.addListener('message', () => new Promise((_, r) => {
            setTimeout(() => r(new Error(3)), 750);
        }));

        const result = await emitter.emit2('message', [], null);
        assert.deepEqual(result, [2]);
    });
});
