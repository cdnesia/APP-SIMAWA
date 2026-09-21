<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'success' | 'primary' | 'warning' | 'danger' | 'neutral' }>(), { tone: 'neutral' });

const toneClass: Record<string, string> = {
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  neutral: 'bg-[var(--color-border)] text-[var(--color-text-muted)]',
};
</script>

<template>
  <span :class="['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', toneClass[tone]]">
    <slot />
  </span>
</template>
