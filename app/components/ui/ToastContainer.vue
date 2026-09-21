<script setup lang="ts">
const { toasts } = useToast();

const colorClass: Record<string, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-500',
  info: 'bg-blue-600',
};
</script>

<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'animate-slide-in flex min-w-[260px] max-w-sm items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
        colorClass[toast.type],
      ]"
    >
      {{ toast.message }}
    </div>
  </div>
</template>
