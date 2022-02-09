import {
  expect,
  test,
} from 'vitest'

import {
  setI18nInstance,
  useValidation,
} from '../src/composables'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
setI18nInstance(({ global: { t: () => 'translation' } }) as any)

const { applyRules } = useValidation()

test('required', async () => {
  const requiredNull = await applyRules(null, { required: true })
  expect(typeof requiredNull).toBe('string')

  const requiredStringA = await applyRules('Foo', { required: true })
  expect(requiredStringA).toBe(null)

  const requiredStringB = await applyRules('', { required: true })
  expect(typeof requiredStringB).toBe('string')

  const requiredArrayA = await applyRules([ 'Foo' ], { required: true })
  expect(requiredArrayA).toBe(null)

  const requiredArrayB = await applyRules([], { required: true })
  expect(typeof requiredArrayB).toBe('string')
})

test('minLength', async () => {
  const minLengthStringA = await applyRules('Foo', { minLength: 2 })
  expect(minLengthStringA).toBe(null)

  const minLengthStringB = await applyRules('F', { minLength: 2 })
  expect(typeof minLengthStringB).toBe('string')

  const minLengthArrayA = await applyRules([ 'Foo', 'Bar' ], { minLength: 2 })
  expect(minLengthArrayA).toBe(null)

  const minLengthArrayB = await applyRules([ 'Foo' ], { minLength: 2 })
  expect(typeof minLengthArrayB).toBe('string')
})

test('min', async () => {
  const minNumberA = await applyRules(10, { min: 5 })
  expect(minNumberA).toBe(null)

  const minNumberB = await applyRules(4, { min: 5 })
  expect(typeof minNumberB).toBe('string')

  // TODO: add date validation tests
})

test('max', async () => {
  const maxNumberA = await applyRules(5, { max: 10 })
  expect(maxNumberA).toBe(null)

  const maxNumberB = await applyRules(5, { max: 4 })
  expect(typeof maxNumberB).toBe('string')

  // TODO: add date validation tests
})

test('fileSize', async () => {
  const file = new File([], 'image.png')

  const oneMb = 1024 * 1024 + 1

  Object.defineProperty(file, 'size', { value: oneMb })

  const maxFileSizeA = await applyRules(file, { fileSize: oneMb })
  expect(maxFileSizeA).toBe(null)

  const maxFileSizeB = await applyRules(file, { fileSize: oneMb - 1 })
  expect(typeof maxFileSizeB).toBe('string')
})

test('email', async () => {
  const emailA = await applyRules('foo@bar.com', { email: true })
  expect(emailA).toBe(null)

  const emailB = await applyRules('foo@bar', { email: true })
  expect(typeof emailB).toBe('string')
})
