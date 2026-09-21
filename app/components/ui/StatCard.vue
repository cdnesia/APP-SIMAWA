<script setup lang="ts">
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon: Component;
    tone?: 'primary' | 'accent' | 'neutral';
  }>(),
  { tone: 'neutral' },
);

const toneClass: Record<string, string> = {
  primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  accent: 'bg-[var(--color-accent)]/10 text-[var(--color-accent-dark)]',
  neutral: 'bg-[var(--color-border)] text-[var(--color-text-muted)]',
};
</script>

<template>
  <div class="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
    <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClass[tone]]">
      <component :is="icon" :size="20" />
    </div>
    <div class="min-w-0">
      <p class="truncate text-xs font-medium text-[var(--color-text-muted)]">{{ label }}</p>
      <p class="truncate text-lg font-bold text-[var(--color-text)]">{{ value }}</p>
    </div>
  </div>
</template>
