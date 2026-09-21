<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  icon: Component;
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center py-10 text-center">
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
      <component :is="icon" :size="22" />
    </div>
    <h3 class="text-sm font-semibold text-[var(--color-text)]">{{ title }}</h3>
    <p class="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
