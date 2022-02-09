import {
  expect,
  test,
} from 'vitest'

import {
  nextTick,
  reactive,
} from 'vue'

import useForm from '../src/composables/useForm'

test('getFormValues()', () => {
  const form = useForm(reactive({
    foo: {
      value: 'Foo',
    },
    bar: {
      value: 'Bar',
    },
  }))

  expect(JSON.stringify(form.getFormValues()))
    .toBe(JSON.stringify({
      foo: 'Foo',
      bar: 'Bar',
    }))

  expect(JSON.stringify(form.getFormValues({ exclude: [ 'bar' ] })))
    .toBe(JSON.stringify({ foo: 'Foo' }))

  expect(JSON.stringify(form.getFormValues({ include: [ 'foo' ] })))
    .toBe(JSON.stringify({ foo: 'Foo' }))
})

test('setFormValues()', () => {
  const { formObject, ...form } = useForm(reactive({
    name: {
      value: 'Foo',
    },
  }))

  expect(formObject.name.value).toBe('Foo')

  form.setFormValues({ name: 'Bar' })

  expect(formObject.name.value).toBe('Bar')
})

test('setFormErrors(), isValid', async () => {
  const { formObject, ...form } = useForm(reactive({
    name: {
      value: 'Foo',
      validate: (name) => (name === 'Foo' ? null : 'Value must be foo'),
    },
  }))

  expect(form.isValid.value).toBe(true)

  form.setFormErrors({ name: 'Error' })

  // Even though an error is set, this doesn't mean the form isn't valid.
  // A form is only invalid when a validation rule fails.
  // Otherwise there is no way to tell if an error set from the backend
  // is fixed.
  expect(form.isValid.value).toBe(true)
  expect(formObject.name.error).toBe('Error')

  form.setFormValues({ name: 'Bar' })

  await nextTick()

  expect(form.isValid.value).toBe(false)
})

test('validate()', async () => {
  const { formObject, ...form } = useForm(reactive({
    name: {
      value: 'Bar',
      validate: (name) => (name === 'Foo' ? null : 'Value must be foo'),
    },
    email: {
      value: null,
      validate: (email) => !!email,
    },
  }))

  form.validate([ 'name' ])

  await nextTick()
  await nextTick()

  expect(formObject.name.error).toBe('Value must be foo')
  expect(formObject.email.error).toBe(undefined)

  form.validate()

  await nextTick()
  await nextTick()

  expect(formObject.name.error).toBe('Value must be foo')
  expect(formObject.email.error).toBe(false)
})
