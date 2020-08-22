import { Async, test, debug } from '../src'
import * as para from './fixtures/para'
import assert = require('assert')

function simpleAsync(para: para.Para, async: Async) {
  para(
    [
      function (cb) {
        async.wrap(cb)(null, 1)
      },
      function (cb) {
        async.wrap(cb)(null, 2)
      },
      function (cb) {
        async.wrap(cb)(null, 3)
      },
    ],
    function (err, results) {
      assert.deepStrictEqual(results, [1, 2, 3])
      async.done(err, results)
    }
  )
}

describe('basic', () => {
  it('simple-failures', (done) => {
    test(
      function (async) {
        simpleAsync(para.para1, async)
      },
      function (_, results, stats) {
        expect(stats.failures).toBeGreaterThan(0)
        expect(stats.passes).toBeLessThan(100)

        test(
          function (async) {
            simpleAsync(para.para1, async)
          },
          function (_, _results, _stats) {
            expect(_stats).toEqual(stats)
            expect(_results).toEqual(results)
            done()
          }
        )
      }
    )
  })

  it('calls-twice', (done) => {
    test(
      function (async) {
        simpleAsync(para.para2, async)
      },
      function (_, results, stats) {
        expect(stats.failures).toBeGreaterThan(0)
        expect(stats.passes).toBeLessThan(100)

        test(
          function (async) {
            simpleAsync(para.para2, async)
          },
          function (_, _results, _stats) {
            debug(_stats)
            expect(_stats).toEqual(stats)
            expect(_results).toEqual(results)
            done()
          }
        )
      }
    )
  })

  it('calls-correctly', (done) => {
    test(
      function (async) {
        simpleAsync(para.para3, async)
      },
      function (_, results, stats) {
        expect(stats.failures).toBe(0)
        expect(stats.passes).toBe(100)

        test(
          function (async) {
            simpleAsync(para.para3, async)
          },
          function (_, _results, _stats) {
            debug(_stats)
            expect(_stats).toEqual(stats)
            expect(_results).toEqual(results)
            done()
          }
        )
      }
    )
  })
})
