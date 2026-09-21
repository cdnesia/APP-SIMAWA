// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Komponen dasar/atomik (Button, Card, Badge, Input, Select2) sengaja dipakai flat 1 kata
    // konsisten dengan penamaan yang sudah dipakai sepanjang project - risiko bentrok nama
    // dengan elemen HTML native/masa depan rendah untuk nama-nama ini.
    files: ['app/components/ui/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)
