<script setup lang="ts">
import {
  nextTick,
  ref,
  watch,
} from 'vue'

import {
  useEventListener,
  useObjectHelper,
} from '@wouterlms/composables'

import {
  Form,
  FormObject,
} from '@/composables'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: Omit<Form<any>, 'formObject' | 'validate'> & { validate: any }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formObject: FormObject<any>
  prepare?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  prepare: false,
})

/* eslint-disable-next-line */
const emit = defineEmits<{
  (event: 'submit', done: () => void): void
  (event: 'prepare', done: () => void): void
}>()

const { deepClone } = useObjectHelper()

const isDirty = ref(false)
const isSubmitting = ref(false)
const isFormLoaded = ref(false)
const initialFormState = ref(deepClone(props.formObject))

if (props.prepare) {
  emit('prepare', () => {
    nextTick().then(() => {
      initialFormState.value = deepClone(props.formObject)
      isFormLoaded.value = true
    })
  })
} else {
  isFormLoaded.value = true
}

const handleSubmit = () => {
  if (!isDirty.value) {
    return
  }

  props.form.validate(undefined, false)

  setTimeout(() => {
    if (!props.form.isValid.value) {
      props.form.validate()
      return
    }

    isSubmitting.value = true

    emit('submit', () => {
      initialFormState.value = deepClone(props.formObject)
      isDirty.value = false
      isSubmitting.value = false
    })
  }, 0)
}

useEventListener('keydown', (e: KeyboardEvent) => {
  const {
    key,
    ctrlKey,
    metaKey,
  } = e

  if (key === 's' && (ctrlKey || metaKey)) {
    e.preventDefault()
    handleSubmit()
  }
})

defineExpose({
  handleSubmit,
  isDirty,
})

watch(
  props.formObject,
  (formObject) => {
    if (!isFormLoaded.value) {
      return
    }

    isDirty.value = false

    Object.entries(initialFormState.value as Record<string, { value: unknown }>)
      .forEach(([ key, value ]) => {
        const initialFormValue = value.value

        const currentFormValue = formObject[key].value

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
    deep: true,
  }
)
</script>

<template>
  <form
    :novalidate="true"
    @submit.prevent="handleSubmit"
  >
    <slot
      :is-dirty="isDirty"
      :is-valid="form.isValid.value"
      :is-submitting="isSubmitting"
    />
  </form>
</template>
