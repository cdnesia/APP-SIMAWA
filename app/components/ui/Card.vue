<script setup lang="ts">
withDefaults(defineProps<{ class?: string; title?: string }>(), { class: '', title: undefined });
</script>

<template>
  <div
    :title="title"
    :class="['rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm', $props.class]"
  >
    <slot />
  </div>
</template>
