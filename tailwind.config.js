/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        'surface-elevated': 'var(--color-surface-elevated)',
        border: 'var(--color-border)',
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',
        'ink-subtle': 'var(--color-ink-subtle)',
        accent: 'var(--color-accent)',
        'accent-soft': 'var(--color-accent-soft)',
        'accent-contrast': 'var(--color-accent-contrast)',
        danger: 'var(--color-danger)',
      },
      backgroundColor: {
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        'surface-elevated': 'var(--color-surface-elevated)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
        border: 'var(--color-border)',
      },
      textColor: {
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',
        'ink-subtle': 'var(--color-ink-subtle)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
