import assert = require('assert')
import * as pull from '@jacobbubu/pull-stream'
import many from '@jacobbubu/pull-many'
import { Async, test, debug } from '../src'

describe('pull', () => {
  it('test', (done) => {
    test(strange, function (_, results, stats) {
      debug(results)
      assert.strictEqual(stats.failures, 0)
      debug('passed')
      done()
    })

    function strange(async: Async) {
      function p(read: pull.Source<number>): pull.Source<number> {
        return function (abort, cb) {
          read(abort, async.wrap(cb))
        }
      }

      pull(
        // pull many must return a result in the same partial order.
        // so if we have a stream of even and a stream of odd numbers
        // then those should be in the same order in the output.
        many([pull.values([1, 3, 5, 7]), pull.values([2, 4, 6, 8])].map(p)),
        function (read) {
          return function (abort, cb) {
            read(abort, function (end, data) {
              debug(end, data)
              cb(end, data)
            })
          }
        },
        pull.collect(function (_, ary: number[]) {
          debug(ary)

          const odd = ary.filter(function (e) {
            return e % 2
          })
          const even = ary.filter(function (e) {
            return !(e % 2)
          })

          expect(even).toEqual([2, 4, 6, 8])
          expect(odd).toEqual([1, 3, 5, 7])

          async.done()
        })
      )
    }
  })
})
