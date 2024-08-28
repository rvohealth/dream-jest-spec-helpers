import { getObjectSubset } from '@jest/expect-utils'
import {
  EXPECTED_COLOR,
  RECEIVED_COLOR,
  matcherHint,
  printDiffOrStringify,
  printExpected,
  printReceived,
  stringify,
} from 'jest-matcher-utils'
import sortBy from 'lodash.sortby'

const EXPECTED_LABEL = 'Expected'
const RECEIVED_LABEL = 'Received'
const ERROR_COLOR = RECEIVED_COLOR

type OwnMatcher<Params extends unknown[]> = (
  this: jest.MatcherContext,
  received: unknown,
  ...params: Params
) => jest.CustomMatcherResult

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R> {
      toMatchDreamModel(expected: any): jest.CustomMatcherResult
      toMatchDreamModels(expected: any): jest.CustomMatcherResult
      toBeWithin(precision: number, expected: number): jest.CustomMatcherResult
      toEqualCalendarDate(expected: any): jest.CustomMatcherResult
    }
    interface Expect {
      toMatchDreamModel<T>(expected: T): T;
      toMatchDreamModels<T>(expected: T): T;
      toBeWithin<T>(precision: number, expected: T): T;
      toEqualCalendarDate<T>(expected: T): T;
    }
    interface ExpectExtendMap {
      toMatchDreamModel: OwnMatcher<[expected: any]>
      toMatchDreamModels: OwnMatcher<[expected: any]>
      toBeWithin: OwnMatcher<[precision: number, expected: number]>
      toEqualCalendarDate: OwnMatcher<[expected: any]>
    }
  }
}

expect.extend({
  toEqualCalendarDate(received: any, expected: any) {
    if (!(received?.constructor?.name === 'CalendarDate')) {
      return {
        pass: false,
        message: () =>
          `Expected received object to be an calendarDate, but was ${received?.constructor?.name}`,
      }
    }

    const pass = expected.equals(received)
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received.toISO()} NOT to equal ${expected.toISO()}`
          : `expected ${received.toISO()} to equal ${expected.toISO()}`,
    }
  },

  // https://stackoverflow.com/questions/50896753/jest-tobeclosetos-precision-not-working-as-expected#answer-75639525
  toBeWithin(received: any, precision: number, expected: number) {
    if (typeof received !== 'number') {
      throw new TypeError(`Received ${typeof received}, but expected number`)
    }

    const pass = Math.abs(received - expected) < precision
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} NOT to be within ${precision} of ${expected}`
          : `expected ${received} to be within ${precision} of ${expected}`,
    }
  },

  toMatchDreamModel(received: any, expected: any) {
    return expectMatchingDreamModels(received, expected, 'toMatchDreamModel')
  },

  toMatchDreamModels(received: any, expected: any) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `Expected received object to be an Array, but was ${received?.constructor?.name}`,
      }
    } else if (!Array.isArray(expected)) {
      return {
        pass: false,
        message: () => `Expected expected object to be an Array, but was ${expected?.constructor?.name}`,
      }
    } else if (expected.length != received.length) {
      return {
        pass: false,
        message: () =>
          `Expected arrays of the same length, but expected has ${expected.length} elements and received has ${received.length}`,
      }
    } else if (expected.length === 0) {
      return {
        pass: true,
        message: () => 'Expected arrays not to match, but both were empty',
      }
    }

    let results: jest.CustomMatcherResult

    received = sortBy(received, received[0]?.primaryKey)
    expected = sortBy(expected, expected[0]?.primaryKey)

    received.forEach((receivedElement: any, i: number) => {
      results = expectMatchingDreamModels(receivedElement, expected[i], 'toMatchDreamModels')
      if (!results.pass) return
    })

    if (results!.pass) {
      return {
        pass: true,
        message: () => 'Expected arrays of Dream objects not to match, but they do',
      }
    } else {
      return results!
    }
  },
})

function attributes(obj: any) {
  return { instanceof: obj.constructor.name, ...obj.attributes }
}

export function expectMatchingDreamModels(
  received: any,
  expected: any,
  matcherName: string
): jest.CustomMatcherResult {
  let pass: boolean = false
  let message: () => string

  if (expected === undefined) {
    message = () => ERROR_COLOR('expected is undefined but should be an instance of Dream')
  } else if (expected === null) {
    message = () => ERROR_COLOR('expected is null but should be an instance of Dream')
  } else if (typeof expected !== 'object') {
    message = () => ERROR_COLOR(`expected is ${expected.constructor.name} but must be an instance of Dream`)
  } else if (received === undefined) {
    message = () => ERROR_COLOR('received is undefined but should be an instance of Dream')
  } else if (received === null) {
    message = () => ERROR_COLOR('received is null but should be an instance of Dream')
  } else if (typeof received !== 'object') {
    message = () => ERROR_COLOR(`received is ${received.constructor.name} but must be an instance of Dream`)
  } else if (expected.constructor !== received.constructor) {
    message = () =>
      EXPECTED_COLOR(`expected ${expected.constructor.name}, `) +
      RECEIVED_COLOR(`received ${received.constructor.name}`)
  } else if (expected.primaryKeyValue !== received.primaryKeyValue) {
    message = () =>
      EXPECTED_COLOR(
        `expected is ${expected.constructor.name} with primary key ${expected.primaryKeyValue}\n`
      ) +
      RECEIVED_COLOR(`received is ${received.constructor.name} with primary key ${received.primaryKeyValue}`)
  } else {
    const comparableReceived = attributes(received)
    const comparableExpected = attributes(expected)
    pass = JSON.stringify(comparableReceived) === JSON.stringify(comparableExpected)

    message = pass
      ? () =>
          matcherHint(matcherName) +
          '\n\n' +
          `Expected: not ${printExpected(comparableExpected)}` +
          (stringify(comparableExpected) !== stringify(comparableReceived)
            ? `\nReceived:     ${printReceived(comparableReceived)}`
            : '')
      : () =>
          matcherHint(matcherName) +
          '\n\n' +
          printDiffOrStringify(
            stringify(comparableExpected),
            getObjectSubset(stringify(comparableReceived), stringify(comparableExpected)),
            EXPECTED_LABEL,
            RECEIVED_LABEL,
            false
          )
  }

  return { message, pass }
}
