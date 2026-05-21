import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  safelist: [
    {
      pattern:
        /^(bg|border|text|accent)-(indigo|emerald|cyan|rose|pink)-(300|400|500|950)(\/\d+)?$/
    },
    {
      pattern: /^hover:bg-(indigo|emerald|cyan|rose|pink)-(400|500)$/
    },
    {
      pattern: /^focus:border-(indigo|emerald|cyan|rose|pink)-400$/
    }
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.22)'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
