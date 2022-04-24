<script setup lang="ts">
import { reactive } from 'vue';
import { useValidation, useForm } from './composables';

interface UserForm {
  name: {
    value: string | null
    returns: string
  }
}

const { applyRules } = useValidation()

const {} = useForm<UserForm>(reactive({
  name: {
    value: null,
    validate: (name) => applyRules(name, {
      required: true
    })
  }
}))
</script>

<template>
  <div></div>
</template>