<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit';
    variant?: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
    disabled?: boolean;
    class?: string;
  }>(),
  {
    type: 'button',
    variant: 'primary',
    isLoading: false,
    disabled: false,
    class: '',
  },
);

const variantClass: Record<string, string> = {
  primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white',
  secondary: 'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10',
  danger: 'bg-[var(--color-danger)] hover:bg-red-700 text-white',
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || isLoading"
    :class="[
      'flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
      variantClass[variant],
      props.class,
    ]"
  >
    <span
      v-if="isLoading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
    <slot />
  </button>
</template>
