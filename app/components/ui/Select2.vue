<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';

interface Option {
  value: string;
  label: string;
}

const props = defineProps<{ modelValue: string; options: Option[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => props.options.find((o) => o.value === props.modelValue)?.label ?? '');

function select(value: string) {
  emit('update:modelValue', value);
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) isOpen.value = false;
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
      @click="isOpen = !isOpen"
    >
      <span class="truncate">{{ selectedLabel || '-' }}</span>
      <ChevronDown :size="16" :class="['shrink-0 text-[var(--color-text-muted)] transition-transform', isOpen ? 'rotate-180' : '']" />
    </button>

    <div
      v-if="isOpen"
      class="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="[
          'block w-full truncate px-3 py-2 text-left text-sm',
          option.value === modelValue
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]',
        ]"
        @click="select(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
