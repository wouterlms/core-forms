<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useFormState } from './composables';

import useForm from './composables/useForm';
import Form from './components/Form.vue'

interface PostForm {
  id: {
    value: string | null
    returns: string
  }
  content: {
    value: string | null
    returns: string
  }
}

const formState = useFormState<PostForm>(reactive({
  id: {
    value: null,
  },
  content: {
    value: null,
    // validate: (content) => {
    //   if (content === null || content.length === 0) {
    //     return 'Error!'
    //   }

    //   return null
    // }
  }
}))

const handleSubmit = async () => {
  console.log('submit')
}

const handlePrepare = async () => {
  console.log('prepare')
}

const form = useForm(formState, {
  handleSubmit
})

watch(() => form.isDirty, () => {
  console.log('isDirty')
})

formState.setData({content: 'testje'})
</script>

<template>
  <Form :form="form">
    <div style="whitespace: pre; font-size: 0.6rem;">
      {{ form }} - {{ formState }}
    </div>

    <input v-model="formState.formObject.content.value" />

    <div>
      {{ formState.formObject.content.error }}
    </div>

    <div>
      <button type="submit">submit</button>
    </div>
  </Form>
</template>