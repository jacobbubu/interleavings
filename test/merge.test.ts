import assert = require('assert')
import * as pull from '@jacobbubu/pull-stream'
import merge from '@jacobbubu/pull-merge'
import { Async, test, debug } from '../src'

describe('merge', () => {
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
        merge(
          [pull.values([1, 4, 7, 10]), pull.values([2, 5, 8, 11]), pull.values([3, 6, 9, 12])].map(
            p
          )
        ),
        function (read) {
          return function (abort, cb) {
            read(abort, function (end, data) {
              debug(end, data)
              cb(end, data)
            })
          }
        },
        pull.collect(function (_, ary) {
          debug(ary)

          assert.deepStrictEqual(ary, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
          async.done(null)
        })
      )
    }
  })
})
