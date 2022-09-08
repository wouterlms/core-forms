<script setup lang="ts">
import useForm from '@/composables/useForm';

export interface Props {
  form: ReturnType<typeof useForm>
}

const props = withDefaults(defineProps<Props>(), {})

props.form.prepare()
</script>

<template>
  <form 
    novalidate
    @submit.prevent="form.submit()"
  >
    <slot />
  </form>
</template>