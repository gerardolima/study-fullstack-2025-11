import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {Chance} from 'chance'

import * as sample from './double.ts'

const chance = new Chance(process.env['RANDOM_SEED'] ?? '')

void describe('sample', function () {
  void describe('double', function () {
    void it('doubles the number', function () {
      const n = chance.integer()
      const res = sample.double(n)

      assert.equal(res / 2, n)
    })
  })
})
