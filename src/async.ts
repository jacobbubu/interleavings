import * as path from 'path'
import { RNG } from '@jacobbubu/rngmt'
import { debug } from './logger'

process.setMaxListeners(Infinity)

type Heap = Record<string, Function>
export type AsyncError = Error

export interface AsyncResult {
  error: AsyncError | null
  value: any
  passed: boolean
  calls: number
  seed: number
  called: string[]
}

export interface AsyncCallback {
  (err: AsyncError | null, result: AsyncResult): void
}

function first(o: Heap) {
  for (const k in o) return k
}

export class Async {
  private _rng: RNG
  private _queued = false
  private _ended = false

  private _heap: Heap = {}
  private _all: Record<string, number> = {}
  private _created: string[] = []
  private _called: string[] = []
  private _notCalled: string[] = []
  private _pending = 0

  private _result: AsyncResult | null = null

  constructor(private readonly _seed = 0, private readonly _cb?: AsyncCallback) {
    this._rng = new RNG(_seed)
    process.on('exit', this.forgot)
    this.next = this.next.bind(this)
  }

  private forgot() {
    this._notCalled.forEach(function (err) {
      console.error(err)
    })
    this.done(new Error('never called'))
  }

  private next() {
    if (this._queued) return
    this._queued = true
    if (this._ended) return

    this._rng.random() < 0.4 ? setImmediate(call) : setTimeout(call, 10)

    const self = this

    function call() {
      self._queued = false
      const key = first(self._heap)
      if (key) {
        const cb = self._heap[key]
        delete self._heap[key]
        if (cb) {
          try {
            cb()
          } catch (err) {
            return self.done(err)
          }
          setImmediate(self.next)
        }
      }
    }
  }

  wrap(cb: Function, name?: string) {
    let id: string

    if (!name) {
      const err = new Error('cb was not called\n  created at:')
      if (err.stack) {
        const line = err.stack
          .split('\n')
          .filter(function (line) {
            return /^\s+at /.test(line)
          })[1]
          .replace(/^\s+at\s/, '')
        name = path.relative(process.cwd(), line)
      } else {
        name = err.message
      }
    }

    this._all[name] = (this._all[name] ?? 0) + 1
    id = name + '(' + this._all[name] + ')'
    this._created.push(id)
    this._notCalled.push(id)

    const self = this
    return function (...args: any[]) {
      const { _rng, _heap, _called, _notCalled, next } = self
      self._pending++

      function _cb() {
        _called.push(id)
        _notCalled.splice(self._notCalled.indexOf(name!), 1)

        self._pending--
        return cb.apply(self, args)
      }

      const rn = self._rng.random()
      if (rn < 0.3) {
        try {
          return _cb()
        } catch (err) {
          return self.done(err)
        }
      }

      while (true) {
        const i = _rng.range(0, 0xffff)
        if (!_heap[i]) {
          _heap[i] = _cb
          break
        }
      }
      next()
    }
  }

  done(err: AsyncError | null, value?: any) {
    if (this._ended) return
    this._ended = true

    if (this._result) {
      this._result.passed = false
      this._result.calls += 1
      this._result.error = this._result.error || new Error('called done twice')
      return
    }

    process.removeListener('exit', this.forgot)

    this._result = {
      error: err,
      value,
      passed: !err,
      calls: 1,
      seed: this._seed,
      called: this._called,
    }

    if (this._cb) {
      this._cb(err, this._result)
    } else if (err) {
      throw err
    } else {
      debug(this._result)
    }
  }
}
