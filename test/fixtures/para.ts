export type Callback = (err: Error | null, value: any) => void
export type ParaFunc = (cb: Callback) => void

export type Para = (items: ParaFunc[], cb: Callback) => void

// Intentional bug.: W
//  when cb is an asynchronous function, k will always be length-1, resulting in an exception
export const para1: Para = (items, cb) => {
  let n = items.length
  const output: any[] = []
  let k: string
  for (k in items) {
    items[k](function (_, value) {
      output[k] = value
      if (!--n) {
        return cb(null, output)
      }
    })
  }
}

// BUG: may fail with sync callbacks
// count up when calling something,
// and count down until 0.
// if the first cb is sync, it will cb too early.
export const para2: Para = (items, cb) => {
  let n = 0
  const output: any[] = []
  let k: any
  for (k in items) {
    ;(function (k) {
      n++
      items[k](function (_, value) {
        output[k] = value
        if (!--n) {
          return cb(null, output)
        }
      })
    })(k)
  }
}

export const para3: Para = (items, cb) => {
  let n = items.length
  const output: any[] = []
  let k: any
  for (k in items) {
    ;(function (k) {
      items[k](function (_, value) {
        output[k] = value
        if (!--n) {
          return cb(null, output)
        }
      })
    })(k)
  }
}
