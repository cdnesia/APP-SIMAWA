<script setup lang="ts">
import type { IpkTrendItem } from '~/features/khs/types';
import { parseKodeTahunAkademik } from '~/utils/tahunAkademik';

const props = defineProps<{ items: IpkTrendItem[] }>();

// Label sumbu-X ringkas - "23/1" (2 digit tahun + semester) supaya muat sampai ~11 titik di
// lebar dashboard, beda dari formatTahunAkademikLabel() yang penuh ("2023/2024 Ganjil") dan
// dipakai di tempat lain yang ruangnya lebih lega (dropdown periode KRS/KHS).
function shortLabel(kode: string): string {
  const { tahun, semester } = parseKodeTahunAkademik(kode);
  return `${tahun.slice(2)}/${semester}`;
}

const VIEW_W = 640;
const VIEW_H = 220;
const PAD = { top: 28, right: 16, bottom: 28, left: 28 };
const plotW = VIEW_W - PAD.left - PAD.right;
const plotH = VIEW_H - PAD.top - PAD.bottom;

// Skala Y tetap 0-4 (rentang resmi IPK, bukan auto-fit ke data) - supaya pembaca yang terbiasa
// dengan skala IPK 0-4 tidak salah baca kemiringan garis akibat sumbu yang di-crop.
const Y_MAX = 4;
const Y_TICKS = [0, 1, 2, 3, 4];

const points = computed(() =>
  props.items.map((item, i) => {
    const x = props.items.length > 1 ? PAD.left + (i / (props.items.length - 1)) * plotW : PAD.left + plotW / 2;
    const y = PAD.top + (1 - Number(item.ipk) / Y_MAX) * plotH;
    return { x, y, item };
  }),
);

const linePath = computed(() => points.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '));
const areaPath = computed(() => {
  if (points.value.length === 0) return '';
  const baseline = PAD.top + plotH;
  const first = points.value[0]!;
  const last = points.value[points.value.length - 1]!;
  return `${linePath.value} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
});

const svgRef = ref<SVGSVGElement | null>(null);
const hoverIndex = ref<number | null>(null);

function handlePointerMove(e: PointerEvent) {
  if (!svgRef.value || points.value.length === 0) return;
  const rect = svgRef.value.getBoundingClientRect();
  const xInView = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  // Snap ke titik data TERDEKAT (crosshair "menemukan X") - bukan butuh presisi pas di garis.
  let nearest = 0;
  let nearestDist = Infinity;
  points.value.forEach((p, i) => {
    const dist = Math.abs(p.x - xInView);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = i;
    }
  });
  hoverIndex.value = nearest;
}

function handlePointerLeave() {
  hoverIndex.value = null;
}

const hovered = computed(() => (hoverIndex.value !== null ? points.value[hoverIndex.value] : null));
const latest = computed(() => props.items[props.items.length - 1] ?? null);

// Tooltip HTML diposisikan lewat persentase (bukan px SVG mentah) supaya tetap pas walau SVG
// di-scale CSS (viewBox 640x220 dirender di lebar container berapa pun).
const tooltipStyle = computed(() => {
  if (!hovered.value) return {};
  return {
    left: `${(hovered.value.x / VIEW_W) * 100}%`,
    top: `${(hovered.value.y / VIEW_H) * 100}%`,
  };
});
</script>

<template>
  <div>
    <div class="mb-4 flex items-baseline justify-between">
      <h3 class="text-sm font-semibold text-[var(--color-text)]">Grafik IPK per Semester</h3>
      <p v-if="latest" class="text-sm">
        <span class="font-bold text-[var(--color-primary)]">{{ latest.ipk }}</span>
        <span class="ml-1 text-xs text-[var(--color-text-muted)]">IPK saat ini</span>
      </p>
    </div>

    <div v-if="items.length === 0" class="py-10 text-center text-sm text-[var(--color-text-muted)]">
      Belum ada IPK yang bisa ditampilkan - grafik muncul setelah nilai semester pertama Anda terkunci.
    </div>

    <div v-else class="relative">
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
        class="w-full touch-none"
        role="img"
        aria-label="Grafik tren IPK kumulatif per semester"
        @pointermove="handlePointerMove"
        @pointerleave="handlePointerLeave"
      >
        <!-- Gridline Y - hairline 1px solid, recessive (satu step dari warna surface). -->
        <g v-for="tick in Y_TICKS" :key="tick">
          <line
            :x1="PAD.left"
            :x2="VIEW_W - PAD.right"
            :y1="PAD.top + (1 - tick / Y_MAX) * plotH"
            :y2="PAD.top + (1 - tick / Y_MAX) * plotH"
            stroke="var(--color-border)"
            stroke-width="1"
          />
          <text
            :x="PAD.left - 8"
            :y="PAD.top + (1 - tick / Y_MAX) * plotH"
            text-anchor="end"
            dominant-baseline="middle"
            class="fill-[var(--color-text-muted)] text-[9px]"
          >
            {{ tick }}
          </text>
        </g>

        <!-- Label sumbu-X - semua titik ditampilkan (data cuma ~5-11 titik, masih muat). -->
        <text
          v-for="p in points"
          :key="p.item.kodeTahunAkademik"
          :x="p.x"
          :y="VIEW_H - 8"
          text-anchor="middle"
          class="fill-[var(--color-text-muted)] text-[9px]"
        >
          {{ shortLabel(p.item.kodeTahunAkademik) }}
        </text>

        <!-- Area fill - warna series di ~10% opacity, wash tipis bukan blok jenuh. -->
        <path :d="areaPath" fill="var(--color-primary)" fill-opacity="0.1" stroke="none" />

        <!-- Garis - 2px, round join/cap. -->
        <path :d="linePath" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

        <!-- Crosshair vertikal saat hover. -->
        <line
          v-if="hovered"
          :x1="hovered.x"
          :x2="hovered.x"
          :y1="PAD.top"
          :y2="PAD.top + plotH"
          stroke="var(--color-border-dark)"
          stroke-width="1"
        />

        <!-- Titik data - dot >=8px (r=4) dengan ring 2px warna surface, endpoint dilabeli langsung. -->
        <g v-for="(p, i) in points" :key="`dot-${p.item.kodeTahunAkademik}`">
          <circle
            :cx="p.x"
            :cy="p.y"
            :r="i === points.length - 1 || hoverIndex === i ? 5 : 4"
            fill="var(--color-primary)"
            stroke="var(--color-surface)"
            stroke-width="2"
          />
          <!-- Direct label cuma di titik terakhir (endpoint) - bukan tiap titik. -->
          <text v-if="i === points.length - 1" :x="p.x" :y="p.y - 12" text-anchor="middle" class="fill-[var(--color-text)] text-[10px] font-semibold">
            {{ p.item.ipk }}
          </text>
        </g>
      </svg>

      <!-- Tooltip hover - HTML overlay (bukan SVG <text>) supaya gampang styling & tidak ke-clip. -->
      <div
        v-if="hovered"
        class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs shadow-lg"
        :style="tooltipStyle"
      >
        <p class="font-semibold text-[var(--color-text)]">IPK {{ hovered.item.ipk }}</p>
        <p class="text-[var(--color-text-muted)]">{{ hovered.item.namaTahunAkademik ?? shortLabel(hovered.item.kodeTahunAkademik) }}</p>
      </div>
    </div>
  </div>
</template>
