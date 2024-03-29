import {
  ComputedRef,
  computed,
  isReactive,
  nextTick,
  reactive,
  watch
} from 'vue'

type MaybeAsync<T> = Promise<T> | T

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FormPropertyType {
  value: any
  returns: any
  set?: any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type FormPropertyTypes<T> = Record<keyof T, FormPropertyType>

// eslint-disable-next-line no-use-before-define
type Validate<V, F extends Record<keyof F, FormPropertyType>> = (value: V, form: FormObject<F>) => MaybeAsync<string | boolean | null | undefined>

interface ValidateWithOptions<V, F extends Record<keyof F, FormPropertyType>> {
  options: {
    watch?: boolean
    immediate?: boolean
  }
  // eslint-disable-next-line no-use-before-define
  handler: (value: V, FormObject: FormObject<F>) => MaybeAsync<string | boolean | null | undefined>
}

interface GFVOptions<T extends FormPropertyTypes<T>> {
  include?: Array<keyof T>
  exclude?: Array<keyof T>
  useReturnValue?: boolean
}

type ValueType<T extends { [K in keyof T]: FormPropertyType }> = {
  [P in keyof T]: T[P]['value']
}

type ReturnType<T extends { [K in keyof T]: FormPropertyType }> = {
  [P in keyof T]: T[P]['returns']
}

type WithIncludeOrExclude<
  T extends FormPropertyTypes<T>,
  K extends GFVOptions<T>
> =
  K extends { exclude: Array<infer U> }
    ? U extends string | number | symbol
      ? Omit<K['useReturnValue'] extends true ? ReturnType<T> : ValueType<T>, U>
      : never
    : K extends { include: Array<infer U> }
      ? U extends keyof T
        // ? Does not work when U size > 1, not sure why
        ? Pick<K['useReturnValue'] extends true ? ReturnType<T> : ValueType<T>, U>
        : never
      : K['useReturnValue'] extends true ? ReturnType<T> : ValueType<T>

type GetData<T extends FormPropertyTypes<T>> = <
  O extends GFVOptions<T>,
>(options?: O) => WithIncludeOrExclude<T, O>

type SetData<T extends FormPropertyTypes<T>> = (values: {
  [K in keyof T]?: undefined extends T[K]['set'] ? T[K]['value'] : T[K]['set']
}) => Promise<void>

type SetErrors<T extends FormPropertyTypes<T>> = (
  errors: Partial<Record<keyof T, string | boolean | null>>
) => void

export type FormObject<T extends FormPropertyTypes<T>> = {
  [K in keyof T]: {
    value: T[K]['value']
    error?: string | boolean | null
    get?: (value: T[K]['value'], form: FormObject<T>) => T[K]['returns']
    set?: (value: T[K]['set'], form: FormObject<T>) => MaybeAsync<T[K]['value']>
    validate?: Validate<T[K]['value'], T> | ValidateWithOptions<T[K]['value'], T>
  }
}

export interface Form<T extends FormPropertyTypes<T>> {
  isValid: ComputedRef<boolean>
  formObject: FormObject<T>
  validate: (input?: Array<keyof T>, setError?: boolean) => void
  isValidProperty: (property: keyof T) => boolean
  getData: GetData<T>
  setData: SetData<T>
  setErrors: SetErrors<T>
  resetToInitialState: () => void
}

export default <T extends FormPropertyTypes<T>>(formObject: FormObject<T>, debug = false): Form<T> => {
  const errorMap = reactive(new Map())
  const isValid = computed(() => [...errorMap.values()].every((error) => !error))

  const initialState = JSON.parse(JSON.stringify(formObject))

  if (!isReactive(formObject)) {
    throw new Error('form object is not reactive')
  }

  const validate = async (inputs?: Array<keyof T>, setError = true): Promise<void> => {
    const promises: Array<MaybeAsync<string | boolean | null>> = []

    if (inputs?.length) {
      inputs.forEach((input) => {
        const { value, validate } = formObject[input]

        const error = (typeof validate === 'function'
          ? validate(value, formObject)
          : validate?.handler(value, formObject))

        promises.push(error as Promise<string | boolean | null>)
      })

      const errors = await Promise.all(promises)

      if (setError) {
        errors.forEach((error, index) => {
          const input = inputs[index]
          formObject[input].error = error
        })
      }

      return
    }

    Object.values(formObject).forEach((value) => {
      const formProperty = value as typeof formObject[keyof T]

      if (formProperty.validate) {
        const error = (
          typeof formProperty.validate === 'function'
            ? formProperty.validate(formProperty.value, formObject)
            : formProperty.validate?.handler(formProperty.value, formObject)
        )

        promises.push(error as Promise<string | boolean | null>)
      }
    })

    const errors = await Promise.all(promises)

    if (setError) {
      const inputs = Object.values(formObject).filter((input) => (
        !!(input as typeof formObject[keyof T]).validate)) as Array<typeof formObject[keyof T]>

      errors.forEach((error, index) => {
        const input = inputs[index]
        input.error = error
      })
    }
  }

  const getData: GetData<T> = (options) => {
    const {
      include,
      exclude,
      useReturnValue
    } = options ?? {}

    if (include && exclude) {
      throw new Error('`include` and `exclude` cannot be used together')
    }

    const propertyValues: Record<string, unknown> = {}

    Object.entries(formObject).forEach(([key, formProperty]) => {
      const { value, get } = formProperty as typeof formObject[keyof T]

      if (exclude?.includes(key as keyof T)) {
        return
      }

      if (!include || include.includes(key as keyof T)) {
        if (get) {
          propertyValues[key] = useReturnValue ? get(value, formObject) : value
        } else {
          propertyValues[key] = value
        }
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return propertyValues as any
  }

  const setData: SetData<T> = async (values) => {
    for (const k in formObject) {
      const input = k as keyof T
      const formProperty = formObject[k] as typeof formObject[keyof T]

      if (values[k] === undefined) {
        continue
      }

      const { set } = formProperty

      if (set === undefined) {
        formProperty.value = values[input] as T[keyof T]['value']
      } else {
        formProperty.value = await set(values[input], formObject)
      }
    }
  }

  const setErrors: SetErrors<T> = (errors) => {
    Object.entries(errors).forEach(([key, error]) => {
      const formProperty = (formObject)[key as keyof T]
      formProperty.error = error as string | boolean | null
    })
  }

  const isValidProperty = (property: keyof T): boolean => !errorMap.get(property)

  const setInitialErrors = async (): Promise<void> => {
    Object.keys(formObject).forEach((k) => {
      errorMap.set(k, false)
    })

    for (let i = 0; i < Object.keys(formObject).length; i += 1) {
      const key = Object.keys(formObject)[i]
      const { value, validate } = Object.values(formObject)[i] as typeof formObject[keyof T]

      if (typeof validate === 'object' && !validate.options.immediate) {
        errorMap.set(key, true)
      } else {
        // eslint-disable-next-line no-await-in-loop
        const validationResponse = await (
          typeof validate === 'function'
            ? validate(value, formObject)
            : validate?.handler(value, formObject)
        )

        if (
          typeof validationResponse === 'string' ||
          (typeof validationResponse === 'boolean' && !validationResponse)
        ) {
          errorMap.set(key, true)
        }
      }
    }
  }

  const watchForValidation = (): void => {
    Object.entries(formObject).forEach(([key, value]) => {
      const formProperty = value as typeof formObject[keyof T]

      if (formProperty.validate) {
        const validator = typeof formProperty.validate === 'function' ? formProperty.validate : formProperty.validate.handler

        if (typeof formProperty.validate === 'function' || formProperty.validate.options.watch) {
          watch(
            [() => formProperty.value, () => validator(formProperty.value, formObject)],
            async () => {
              errorMap.set(key, true)

              const validationResponse = await (
                typeof formProperty.validate === 'function'
                  ? formProperty.validate(formProperty.value, formObject)
                  : formProperty.validate?.handler(formProperty.value, formObject)
              )

              errorMap.set(key, validationResponse === false || typeof validationResponse === 'string')

              formProperty.error = validationResponse
            },
            { deep: true }
          )
        }
      }
    })
  }

  const resetToInitialState = async (): Promise<void> => {
    Object.keys(formObject).forEach((key) => {
      formObject[key as keyof T].value = initialState[key].value

      void nextTick().then(() => {
        formObject[key as keyof T].error = null
      })
    })

    // setInitialErrors()
  }

  void setInitialErrors()
  watchForValidation()

  if (debug) {
    Object.keys(formObject).forEach((key) => {
      const stringified = computed(() => JSON.stringify(formObject[key as keyof T]))

      watch(stringified, (newDataStringified, oldDataStringified) => {
        const oldData = JSON.parse(oldDataStringified)
        const newData = JSON.parse(newDataStringified)

        const logData: Record<string, unknown> = {}

        if (JSON.stringify(oldData.value) !== JSON.stringify(newData.value)) {
          logData.oldValue = oldData.value
          logData.newValue = newData.value
        }

        if (oldData.error !== newData.error) {
          logData.oldError = oldData.error
          logData.newError = newData.error
        }

        console.log(key)
        console.table(logData)
        console.log(errorMap)
      })
    })
  }

  return {
    isValid,
    formObject,
    validate,
    getData,
    setData,
    setErrors,
    isValidProperty,
    resetToInitialState
  }
}
