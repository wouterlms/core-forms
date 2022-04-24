import {
  useDate,
  useFileHelper
} from '@wouterlms/composables'

import { useI18n } from 'vue-i18n'

const { toReadableDate } = useDate()
const { formatBytes } = useFileHelper()

export default (): {
  required: string
  url: string
  email: string
  minLength: (value: string | unknown[], min: number) => string
  maxLength: (value: string | unknown[], max: number) => string
  min: (value: number | Date, min: number) => string
  max: (value: number | Date, max: number) => string
  fileSize: (maxFileSize: number) => string
} => {
  const { t } = useI18n()

  return {
    required: t('core.validation.required'),
    url: t('core.validation.url'),
    email: t('core.validation.email'),
    minLength: (value: string | unknown[], min: number) => {
      if (Array.isArray(value)) {
        return t('core.validation.min', { min })
      }

      return t('core.validation.min_length', { min })
    },
    maxLength: (value: string | unknown[], max: number) => {
      if (Array.isArray(value)) {
        return t('core.validation.max', { max })
      }

      return t('core.validation.max_length', { max })
    },
    min: (value: number | Date, min: number) => {
      if (typeof value === 'number') {
        return t('core.validation.min', { min })
      }

      return t('core.validation.min_date', { date: toReadableDate(value) })
    },
    max: (value: number | Date, max: number) => {
      if (typeof value === 'number') {
        return t('core.validation.max', { max })
      }

      return t('core.validation.max_date', { date: toReadableDate(value) })
    },
    fileSize: (maxFileSize: number) => t('core.validation.file_size', { maxFileSize: formatBytes(maxFileSize) })
  }
}
