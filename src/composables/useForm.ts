import { reactive, ref, watch } from 'vue'

import {
  FormPropertyTypes,
  Form,
  FormObject
} from './useFormState'

type MaybePromise<T> = T | Promise<T>

interface Options<T extends FormPropertyTypes<T>> {
  allowPristineSubmit?: boolean
  handlePrepare?: () => MaybePromise<void>
  handleSubmit: () => MaybePromise<void>
}

interface UseForm {
  isDirty: boolean
  isSubmitting: boolean
  isReady: boolean
  prepare: () => MaybePromise<void>
  submit: () => MaybePromise<void>
}

export default <T extends FormPropertyTypes<T>>(
  formState: Form<T>,
  {
    allowPristineSubmit,
    handleSubmit,
    handlePrepare
  }: Options<T>
): UseForm => {
  const isDirty = ref(false)
  const isSubmitting = ref(false)
  const isReady = ref(handlePrepare === undefined)

  const { formObject } = formState

  const initialFormState = ref<FormObject<T>>(JSON.parse(JSON.stringify(formObject)))

  const prepare = async (): Promise<void> => {
    await handlePrepare?.()

    isReady.value = true
    initialFormState.value = JSON.parse(JSON.stringify(formObject))
  }

  const submit = async (): Promise<void> => {
    formState.validate(undefined, false)

    if (!formState.isValid.value) {
      formState.validate()
      return
    }

    if (!isDirty.value && allowPristineSubmit !== true) {
      return
    }

    isSubmitting.value = true

    await handleSubmit()

    initialFormState.value = JSON.parse(JSON.stringify(formObject))
    isDirty.value = false
    isSubmitting.value = false
  }

  const watchFormInputs = (): void => {
    watch(
      formObject,
      () => {
        if (!isReady.value) {
          return
        }

        isDirty.value = false

        Object.entries(initialFormState.value)
          .forEach(([key, value]) => {
            const initialFormValue = (value as { value: unknown }).value
            const currentFormValue = formObject[key as keyof FormObject<T>].value

            // null and 0 length are equal
            if (initialFormValue === null && typeof currentFormValue === 'string') {
              if (currentFormValue !== null && currentFormValue.length !== 0) {
                isDirty.value = true
              }
            } else if (JSON.stringify(initialFormValue) !== JSON.stringify(currentFormValue)) {
              isDirty.value = true
            }
          })
      },
      {
        deep: true
      }
    )
  }

  watchFormInputs()

  return reactive({
    isDirty,
    isSubmitting,
    isReady,
    prepare,
    submit
  })
}
