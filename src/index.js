/*
    Store listener functions and emit events.
    https://github.com/flipeador/js-eventemitter
*/

// import process from 'node:process';

export class EventEmitterError extends Error {
    constructor(message, data) {
        super(message);
        this.data = data;
    }
}

class EventsMap extends Map { }

function warn(message)
{
    const error = new EventEmitterError(message);
    // eslint-disable-next-line no-undef
    try { process.emitWarning(error); } // Node.js
    catch { console.warn(error); } // browser
}

function handleError(results, error, onError, index)
{
    const setval = value => {
        if (index === undefined)
            results.push(value);
        else results[index] = value;
    };
    if (onError === undefined)
        throw error;
    if (onError === false)
        return setval(error);
    if (onError !== null) {
        const retval = onError(error);
        if (retval !== undefined)
            return setval(retval);
    }
    if (index !== undefined)
        delete results[index];
}

function getListenerFunction(listener, index)
{
    if (typeof(listener) === 'function')
        return listener;
    if (typeof(listener) === 'object' && typeof(listener.callback) === 'function')
        return listener.callback;
    throw new EventEmitterError(`Invalid function #${index}`);
}

function forEachListener(callback, listener, listeners)
{
    if (listeners && listener === listeners)
        listener = listener.slice();
    else if (!(listener instanceof Array))
        listener = [listener];
    for (let index = 0; index < listener.length; ++index) {
        const fn = getListenerFunction(listener[index], index);
        if (callback(fn, index)) break;
    }
}

/**
 * Stores listener functions and emits events.
 */
export class EventEmitter
{
    _events = new EventsMap();
    _maxListeners = 10;
    _validEvents = [];
    _warnings = [];

    /**
     * Create an EventEmitter object.
     * @param events
     * List of unique event names.
     * Attempting to add, remove or emit an event that is not on this list will throw an error.
     * @remarks
     * - The EventEmitter instance will emit its own `newListener` event before a listener is added.
     * - The EventEmitter instance will emit its own `removeListener` event after a listener is removed.
     */
    constructor(...events)
    {
        if (events.length) {
            this._validEvents.push(
                'newListener',
                'removeListener'
            );
            events.forEach((event, index) => {
                if (this._validEvents.includes(event))
                    throw new EventEmitterError(`Event #${index} is already on the list`, { event });
                this._validEvents.push(event);
            });
        }
    }

    /**
     * Set the maximum number of listeners that can be added for a particular event.
     * By default a warning is displayed if more than 10 listeners are added for a particular event.
     * @param {Number} count Set to `Infinity` to indicate an unlimited number of listeners.
     */
    setMaxListeners(count)
    {
        if (typeof(count) !== 'number' || isNaN(count))
            throw new EventEmitterError('Invalid count', { count });
        this._maxListeners = count;
        return this;
    }

    /**
     * Add a listener function for the specified event.
     * @param event Event name.
     * @param {Function} listener Listener function to be added.
     * @param {Object} options Options.
     * @param {Number} options.count The maximum number of times the listener can be emitted before being removed.
     * @param {Boolean} options.prepend Whether to add the listener to the beginning of the listeners array.
     */
    addListener(event, listener, options)
    {
        const listeners = this.listeners(event);

        forEachListener(listener => {
            this.emit('newListener', [event, listener, options]);
            listeners[options?.prepend?'unshift':'push']({
                callback: listener,
                count: options?.count ?? Infinity
            });
        }, listener);

        if (listeners.length > this._maxListeners && !this._warnings.includes(event)) {
            warn(`Possible memory leak detected: ${listeners.length} listeners added to ${event}`);
            this._warnings.push(event);
        }

        return this;
    }

    /**
     * Remove the most recently added listener from the specified event.
     * @param event Event name.
     * @param {Function} listener Listener function to be removed.
     */
    removeListener(event, listener)
    {
        const listeners = this.listeners(event);
        forEachListener(listener => {
            const pos = listeners.findIndex(x => x.callback === listener);
            if (pos !== -1) {
                listeners.splice(pos, 1);
                this.emit('removeListener', [event, listener]);
            }
        }, listener, listeners);
        return this;
    }

    /**
     * Remove all listeners from the specified event.
     * @param event Event name, or `undefined` to remove all listeners from all events.
     * @return {this}
     */
    removeAllListeners(event)
    {
        if (event !== undefined)
            return this.removeListener(event, this.listeners(event));
        for (const [event, listeners] of this._events.entries())
            if (event !== 'removeListener')
                this.removeListener(event, listeners);
        return this.removeAllListeners('removeListener');
    }

    /**
     * Synchronously calls each of the listeners registered for the specified event, in insertion order.
     * @param event Event name.
     * @param args List of arguments.
     * @param {undefined|null|false|Function} onError
     * Determines the behavior when a listener function throws an exception.
     * - `undefined` — Default. Throw errors.
     * - `null` — Ignore errors.
     * - `false` — Treat errors as results.
     * - `function` — Error handler, the return value is added as a result if it is not `undefined`.
     * @returns {Array?} List of results, or `null` if the event has no listeners.
     */
    emit(event, args, onError)
    {
        const listeners = this.listeners(event);
        if (!listeners.length) return null;
        if (!(args instanceof Array))
            args = args === undefined ? [] : [args];
        const ctx = { emitter: this, results: [], args };
        for (const listener of listeners.slice()) {
            if (--listener.count < 1) {
                const index = listeners.indexOf(listener);
                if (index !== -1) listeners.splice(index, 1);
            }
            try { ctx.results.push(listener.callback.call(ctx, ...args)); }
            catch (error) { handleError(ctx.results, error, onError); }
        }
        return ctx.results;
    }

    /**
     * Similar to {@link emit}, but returns a promise to deal with async listener functions.
     * @returns {Promise<Array>?} List of results, or `null` if the event has no listeners.
     */
    emit2(event, args, onError)
    {
        const results = this.emit(event, args, onError);
        if (!results) return results;
        const promises = [];
        results.forEach((result, index) => {
            if (result instanceof Promise)
                promises.push(result.then(
                    value => results[index] = value,
                    error => handleError(results, error, onError, index)
                ));
        });
        return Promise.all(promises).then(() => results.filter(() => true));
    }

    /**
     * Get or set the events.
     */
    events(events)
    {
        if (events !== undefined) {
            if (!(events instanceof EventsMap))
                throw new EventEmitterError('Invalid events object', { events });
            this._events = events;
        }
        return this._events;
    }

    /**
     * Get the array of listeners for the specified event.
     * @return {Array}
     */
    listeners(event)
    {
        if (this._validEvents.length && !this._validEvents.includes(event))
            throw new EventEmitterError('Invalid event name', { event });
        let listeners = this._events.get(event);
        if (!listeners) this._events.set(event, listeners = []);
        return listeners;
    }

    /**
     * Add a listener function for the specified event.
     * @reference {@link EventEmitter.addListener()}
     */
    on(event, listener, options={})
    {
        return this.addListener(event, listener, { ...options, count: Infinity });
    }

    /**
     * Add a one-time listener function for the specified event.
     * @reference {@link EventEmitter.addListener()}
     */
    once(event, listener, options={})
    {
        return this.addListener(event, listener, { ...options, count: 1 });
    }

    off = this.removeListener;
}

export default {
    EventEmitterError,
    EventEmitter
};
