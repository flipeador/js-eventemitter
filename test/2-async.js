import test from 'node:test';
import assert from 'node:assert/strict';

import { EventEmitter } from '../src/index.js';

const emitter = new EventEmitter(
    'message'
);

await test('asynchronous passing test', async (ctx) => {
    await ctx.test('emit without errors', async () => {
        emitter.addListener('message', async (...args) => {
            assert.deepEqual(args, [1, 2]);
            return Promise.resolve('val1');
        });

        emitter.addListener('message', () => 'val2');

        let results = emitter.emit('message', [1, 2]);
        results = await Promise.all(results);

        assert.deepEqual(results, ['val1', 'val2']);
    });

    emitter.removeAllListeners();

    await ctx.test('emit with errors', async () => {
        const errorSync = new Error('SYNC_ERROR');
        const errorAsync = new Error('ASYNC_ERROR');

        emitter.addListener('message', () => {
            throw errorSync;
        });

        emitter.addListener('message', async () => {
            throw errorAsync;
        });

        let results = await emitter.emit('message', [], error => error);
        results = await Promise.allSettled(results);
        assert.deepEqual(results, [
            { status: 'fulfilled', value: errorSync },
            { status: 'rejected', reason: errorAsync }
        ]);
    });
});
