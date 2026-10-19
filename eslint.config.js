import { readdirSync } from 'node:fs'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const worlds = readdirSync('src/worlds', { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const restrict = (message, ...group) => ({
  'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
})

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  { files: ['scripts/**'], languageOptions: { globals: globals.node } },
  // Worlds are isolated: they never import other worlds.
  ...worlds.map((name) => ({
    files: [`src/worlds/${name}/**`],
    rules: restrict(
      'Worlds must not import other worlds. Move shared code to core/, utils/ or components/.',
      '@/worlds',
      '@/worlds/**',
      '@/app',
      '@/app/**',
    ),
  })),
  // utils/ is the bottom layer: it knows nothing about the page's own modules.
  {
    files: ['src/utils/**'],
    rules: restrict(
      'utils/ must not depend on core/, components/, worlds/ or app/.',
      '@/core',
      '@/core/**',
      '@/components',
      '@/components/**',
      '@/worlds',
      '@/worlds/**',
      '@/app',
      '@/app/**',
    ),
  },
  // core/ (world contract, beats, timeline) depends only on utils/.
  {
    files: ['src/core/**'],
    rules: restrict(
      'core/ must not depend on components/, worlds/ or app/.',
      '@/components',
      '@/components/**',
      '@/worlds',
      '@/worlds/**',
      '@/app',
      '@/app/**',
    ),
  },
  {
    files: ['src/components/**'],
    rules: restrict(
      'components/ must not depend on worlds/ or app/.',
      '@/worlds',
      '@/worlds/**',
      '@/app',
      '@/app/**',
    ),
  },
  // The app shell may only use a world through its index.
  {
    files: ['src/app/**'],
    rules: restrict(
      'Import a world only through its index (e.g. "@/worlds/pong").',
      '@/worlds/*/*',
    ),
  },
)
