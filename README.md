# EventEmitter

Store listener functions and emit events.

Similar to [Node.js - Class: EventEmitter][node-ee].

## Installation

Install from Git repository:

```
npm i flipeador/js-eventemitter#semver:^2.0.0
```

You may also install just from the subdirectory:

```
pnpm i "flipeador/js-eventemitter#path:src&semver:^2.0.0"
```

It is recommended to install from the subdirectory if your package manager supports it.

## Examples

<details>
<summary><h4>Synchronous listener functions</h4></summary>

```js
import { EventEmitter } from '@flipeador/js-eventemitter';

const ee = new EventEmitter();

ee.on('message', () => {
    console.log('message #1');
    return 'value #1';
});

ee.on('message', () => {
    console.log('message #2');
    throw new Error('error #2'); // (1)
});

ee.on('message', async () => {
    console.log('message #3'); // (2)
    return 'value #3';
});

// By default, listener functions exceptions are thrown immediately.
// This stops the loop and subsequent listener functions will not be called.
try {
    ee.emit('message', ['arg1', 'arg2']);
} catch (error) {
    // Note that "message #3" (2) is not displayed.
    console.log('[CATCH]', error.message); // (1)
}

// Separator.
console.log('-'.repeat(50));

// The above behavior can be changed by specifying an error handler.
// The return value of the error handler is added as a result.
console.log(ee.emit('message', [], error => error));
```

```
message #1
message #2
[CATCH] error #2
--------------------------------------------------
message #1
message #2
message #3
[
  'value #1',
  Error: error #2
      ...,
  Promise { <pending> }
]
```

</details>

<details>
<summary><h4>Asynchronous listener functions</h4></summary>

```js
import { EventEmitter } from '@flipeador/js-eventemitter';

const ee = new EventEmitter();

ee.on('message', () => {
    console.log('message #1');
    return 'value #1';
});

ee.on('message', async () => {
    console.log('message #2');
    throw new Error('error #2'); // (1)
});

ee.on('message', async () => {
    console.log('message #3'); // (2)
    return 'value #3';
});

try {
    // In async functions, exceptions are not thrown immediately.
    // This allows 'message #3' (2) to be displayed on the console.
    const results = ee.emit('message', ['arg1', 'arg2']);
    await Promise.all(results ?? []); // throws (1)
} catch (error) {
    console.log('[CATCH]', error.message); // (1)
}

// Separator.
console.log('-'.repeat(50));

// Note that 'value #3' is no longer a promise.
let results = ee.emit('message', [], error => error);
results = await Promise.allSettled(results ?? []);
results = results.map(result => result.reason ?? result.value);
console.log(results);
```

```
message #1
message #2
message #3
[CATCH] error #2
--------------------------------------------------
message #1
message #2
message #3
[
  'value #1',
  Error: error #2
      ...,
  'value #3'
]
```

</details>

<details>
<summary><h4>Access results from previous listeners</h4></summary>

```js
import { EventEmitter } from '@flipeador/js-eventemitter';

const ee = new EventEmitter();

ee.on('message', async function() {
    return new Promise(resolve => { // (1)
        setTimeout(
            () => resolve('message #1'),
            3000
        );
    });
});

ee.on('message', async function() {
    // Get the result of the previous listener.
    const result = this.results.at(-1);
    // Returns a promise that resolves after the previous (1).
    return result.then(() => 'message #2'); // (2)
});

const results = ee.emit('message');
await results[1]; // wait for (2)
console.log(results);
```

```js
[ Promise { 'message #1' }, Promise { 'message #2' } ]
```

</details>

<details>
<summary><h4>Valid event names and maximum number of listeners</h4></summary>

```js
import { EventEmitter } from '@flipeador/js-eventemitter';

const MAX_LISTENERS = 10; // default

const ee = new EventEmitter(
    // List of valid event names.
    'message'
);

// Set the maximum number of listeners.
ee.setMaxListeners(MAX_LISTENERS);

try {
    // Emit an invalid event.
    ee.on('exit', console.log);
} catch (error) {
    console.log('[CATCH]', error);
}

// Add more than the maximum number of listeners.
for (let n = MAX_LISTENERS+1; n; --n)
    ee.on('message', console.log);
```

```
[CATCH] EventEmitterError: Invalid event name
    ... {
  event: 'exit'
}
(node:12580) Error: Possible memory leak detected: 11 listeners added to message
(Use `node --trace-warnings ...` to show where the warning was created)
```

</details>

## License

This project is licensed under the **GNU General Public License v3.0**.
See the [license file](LICENSE) for details.

<!-- REFERENCE LINKS -->
[node-ee]: https://nodejs.org/api/events.html#class-eventemitter
