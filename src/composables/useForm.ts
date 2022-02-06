import {
  Ref,
  isReactive,
  readonly,
  ref,
  watch,
} from 'vue'

type MaybeAsync<T> = Promise<T> | T

/* eslint-disable @typescript-eslint/no-explicit-any */
interface FormPropertyType {
  value: any
  returns: any
  set?: any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

type FormPropertyTypes<T> = Record<keyof T, FormPropertyType>

type Validate<V, F extends Record<keyof F, FormPropertyType>> = {
  // eslint-disable-next-line no-use-before-define
  (value: V, form: FormObject<F>): MaybeAsync<string | boolean | null | undefined>
}

type ValidateWithOptions<V, F extends Record<keyof F, FormPropertyType>> = {
  options: {
    watch?: boolean
  },
  // eslint-disable-next-line no-use-before-define
  handler: (value: V, FormObject: FormObject<F>) => MaybeAsync<string | boolean | null | undefined>
}

type GFVOptions<T extends FormPropertyTypes<T>> = {
  include?: (keyof T)[]
  exclude?: (keyof T)[]
}

type ValueType<T extends { [K in keyof T]: FormPropertyType }> = {
  [P in keyof T]: T[P]['value']
}

type ReturnType<T extends { [K in keyof T]: FormPropertyType }> = {
  [P in keyof T]: T[P]['returns']
}

type WithIncludeOrExclude<
  T extends FormPropertyTypes<T>,
  K extends GFVOptions<T>, G
> =
  K extends { exclude: (infer U)[] }
    ? U extends string | number | symbol
      ? Omit<G extends true ? ReturnType<T> : ValueType<T>, U>
      : never
    : K extends { include: (infer U)[] }
    ? U extends keyof T
      // ? Does not work when U size > 1, not sure why
      ? Pick<G extends true ? ReturnType<T> : ValueType<T>, U>
      : never
    : never

type GetFormValues<T extends FormPropertyTypes<T>> = <
  O extends GFVOptions<T>,
  G extends boolean = true
>(options?: O, useGetter?: G) => WithIncludeOrExclude<T, O, G>

type SetFormValues<T extends FormPropertyTypes<T>> = (values: {
  [K in keyof T]?: undefined extends T[K]['set'] ? T[K]['value'] : T[K]['set']
}) => void

type SetFormErrors<T extends FormPropertyTypes<T>> = (
  errors: Partial<Record<keyof T, string | boolean | null>>
) => void

export type FormObject<T extends FormPropertyTypes<T>> = {
  [K in keyof T]: {
    value: T[K]['value']
    error?: string | boolean | null
    get?: (value: T[K]['value'], form: FormObject<T>) => T[K]['returns']
    set?: (value: T[K]['set'], form: FormObject<T>) => T[K]['value']
    validate?: Validate<T[K]['value'], T> | ValidateWithOptions<T[K]['value'], T>
  }
}

export type Form<T extends FormPropertyTypes<T>> = {
  isValid: Readonly<Ref<boolean>>
  formObject: FormObject<T>
  validate: (input?: (keyof T)[], setError?: boolean) => void
  getFormValues: GetFormValues<T>
  setFormValues: SetFormValues<T>
  setFormErrors: SetFormErrors<T>
}

export default <T extends FormPropertyTypes<T>>(formObject: FormObject<T>): Form<T> => {
  const isValid = ref(false)

  if (!isReactive(formObject)) {
    throw new Error('form object is not reactive')
  }

  // If async validation is common, might need to change this
  // to a single Promise.all instead of using `await` in the foreach
  const validate = async (inputs?: (keyof T)[], setError = true) => {
    const promises: Promise<string | boolean | null>[] = []

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
      const inputs = Object.values(formObject).filter((x) => (
        !!(x as typeof formObject[keyof T]).validate)) as (typeof formObject[keyof T])[]

      errors.forEach((error, index) => {
        const input = inputs[index]
        input.error = error
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFormValues: GetFormValues<T> = (options, useGetter = true as any) => {
    const { include, exclude } = options || {}

    if (include && exclude) {
      throw new Error('`include` and `exclude` cannot be used together')
    }

    const propertyValues: Record<string, unknown> = {}

    Object.entries(formObject).forEach(([ key, formProperty ]) => {
      const { value, get } = formProperty as typeof formObject[keyof T]

      if (exclude && exclude.indexOf(key as keyof T) !== -1) {
        return
      }

      if (!include || include.indexOf(key as keyof T) !== -1) {
        if (get) {
          propertyValues[key] = useGetter ? get(value, formObject) : value
        } else {
          propertyValues[key] = value
        }
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return propertyValues as any
  }

  const setFormValues: SetFormValues<T> = (values) => {
    Object.entries(formObject).forEach(([ key, value ]) => {
      const input = key as keyof T
      const formProperty = value as typeof formObject[keyof T]

      if (values[input] === undefined) {
        return
      }

      const { set } = formProperty

      if (set) {
        formProperty.value = set(values[input], formObject)
      } else {
        formProperty.value = values[input] as T[keyof T]['value']
      }
    })
  }

  const setFormErrors: SetFormErrors<T> = (errors) => {
    Object.entries(errors).forEach(([ key, error ]) => {
      const formProperty = (formObject as FormObject<T>)[key as keyof T]
      formProperty.error = error as string | boolean | null
    })
  }

  const watchChangesToCheckIfValid = () => {
    watch(
      formObject, async () => {
        isValid.value = true

        for (let i = 0; i < Object.keys(formObject).length; i += 1) {
          const { value, validate } = Object.values(formObject)[i] as typeof formObject[keyof T]

          // eslint-disable-next-line no-await-in-loop
          const validationResponse = await (
            typeof validate === 'function'
              ? validate(value, formObject)
              : validate?.handler(value, formObject)
          )

          if (typeof validationResponse === 'string'
            || (typeof validationResponse === 'boolean' && !validationResponse)) {
            isValid.value = false
            break
          }
        }
      }, {
        deep: true,
        immediate: true,
      }
    )
  }

  const watchForValidation = () => {
    Object.values(formObject).forEach((value) => {
      const formProperty = value as typeof formObject[keyof T]

      if (formProperty.validate) {
        if (typeof formProperty.validate === 'function' || formProperty.validate.options.watch) {
          watch(
            () => formProperty.value,
            async () => {
              if (formProperty.validate) {
                formProperty.error = await (
                  typeof formProperty.validate === 'function'
                    ? formProperty.validate(formProperty.value, formObject)
                    : formProperty.validate?.handler(formProperty.value, formObject)
                )
              }
            },
            { deep: true }
          )
        }
      }
    })
  }

  watchChangesToCheckIfValid()
  watchForValidation()

  return {
    isValid: readonly(isValid),
    formObject,
    validate,
    getFormValues,
    setFormValues,
    setFormErrors,
  }
}
