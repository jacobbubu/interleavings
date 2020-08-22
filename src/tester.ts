import { infer } from '@jacobbubu/infer-partial-order'
import { debug } from './logger'
import { Async, AsyncCallback, AsyncResult, AsyncError } from './async'

function min(ary: any[], get: (x: any) => number) {
  let m = Infinity
  let _m: number
  let v: any

  ary.forEach(function (_v) {
    _m = get(_v)
    if (_m < m) {
      v = _v
      m = _m
    }
  })
  return v
}

export interface TestStats {
  passes: number
  total: number
  failures: number
  errors: number
}

export interface TestFunc {
  (async: Async): void
}

export interface BatchedCallback {
  (err: AsyncError | null, results: AsyncResult[], stats: TestStats): void
}

export function test(testFunc: TestFunc, cb?: AsyncCallback | BatchedCallback) {
  function run(seed: number, cb: AsyncCallback) {
    const async = new Async(seed, cb)
    testFunc(async)
  }

  let seed = Number(process.env.INTLVS)
  if (!isNaN(seed)) {
    return run(seed, function (err, result) {
      // has a seed means we want to reproduce previous error
      if (cb) {
        return (cb as AsyncCallback)(err, result)
      } else if (err) {
        // DO NOT allow anything to swallow this error.
        console.error(err.stack)
        process.exit(1)
      } else debug(result || 'passed')
    })
  }

  const total = Number(process.env.INTLVR) || 100
  let n = total
  const results: AsyncResult[] = []

  for (let i = 0; i < total; i++) {
    ;(function (i) {
      run(i, function (err, result) {
        if (err) {
          result.error = err
        }
        results[i] = result
        done()
      })
    })(i)
  }

  function done() {
    if (--n) return

    const stats: TestStats = {
      passes: 0,
      total: results.length,
      failures: 0,
      errors: 0,
    }

    let err: AsyncError | null = null
    let seed: null | number = null

    // collect the most common error messages
    const messages: Record<string, AsyncResult[]> = {}

    results.forEach(function (r) {
      const error = r.error
      if (!r.error && r.calls === 1) stats.passes++
      else {
        seed = seed ?? r.seed
        err = err ?? r.error
        stats.failures++
      }
      const outcome = error ? error.message : 'passed'
      if (!messages[outcome]) {
        messages[outcome] = [r]
      } else {
        messages[outcome].push(r)
      }

      if (r.calls > 1) {
        stats.errors++
      }
    })

    const outcomes = Object.keys(messages)
      .sort(function (a, b) {
        if (a === 'passed') return -1
        if (b === 'passed') return 1
        return messages[b].length - messages[a].length
      })
      .slice(0, 5)

    debug(outcomes)

    const worstErrors = outcomes.map(function (key) {
      return {
        outcome: key,
        average:
          messages[key].reduce(function (a, b) {
            return a + b.called.length
          }, 0) / messages[key].length,
        min: (function () {
          const v = min(messages[key], function (b) {
            return b.called.length
          })
          return { seed: v.seed, length: v.called.length, called: v.called }
        })(),
      }
    })

    debug(JSON.stringify(worstErrors, null, 2))

    debug(
      infer(
        messages[outcomes[0]].map(function (e) {
          return e.called
        }),
        true
      )
    )

    if (stats.failures) {
      const message =
        '(interleavings: failed ' +
        stats.failures +
        ' out of ' +
        stats.total +
        ', first failing seed: ' +
        seed +
        ')'

      if (!err) {
        err = new Error(message)
      }
      err.message = err.message + '\n  ' + message
    }
    if (cb) {
      ;(cb as BatchedCallback)(err, results, stats)
    } else if (err) {
      // DO NOT allow anything to swallow this error.
      console.error(err.stack)
      process.exit(1)
    } else debug(stats)
  }
}
