<script setup lang="ts">
defineProps<{
  label: string;
  type?: string;
  modelValue: string;
  placeholder?: string;
  autocomplete?: string;
  required?: boolean;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <div>
    <label class="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{{ label }}</label>
    <div class="relative flex items-center">
      <span v-if="$slots.leftIcon" class="pointer-events-none absolute left-3 text-[var(--color-text-muted)]">
        <slot name="leftIcon" />
      </span>
      <input
        :type="type ?? 'text'"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :class="[
          'w-full rounded-lg border border-[var(--color-border-dark)] py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30',
          $slots.leftIcon ? 'pl-10' : 'pl-3',
          $slots.rightIcon ? 'pr-10' : 'pr-3',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <span v-if="$slots.rightIcon" class="absolute right-3">
        <slot name="rightIcon" />
      </span>
    </div>
  </div>
</template>
