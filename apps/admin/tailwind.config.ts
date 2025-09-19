import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f6ff',
          100: '#cdeeff',
          200: '#9edbff',
          300: '#6cc6ff',
          400: '#3fb0ff',
          500: '#1e9bff',
          600: '#0e7fdd',
          700: '#0a66b3',
          800: '#0a4f8a',
          900: '#0b3d69',
        },
        dark: {
          900: '#0b1020',
          800: '#0f172a',
          700: '#111a2e',
          600: '#13203b',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, rgba(30,155,255,1) 0%, rgba(14,127,221,1) 50%, rgba(11,61,105,1) 100%)',
        'hero-radial': 'radial-gradient(800px 400px at 10% -10%, rgba(30,155,255,0.35), rgba(11,61,105,0) 60%), radial-gradient(600px 300px at 110% -20%, rgba(14,127,221,0.3), rgba(11,61,105,0) 60%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)'
      }
    },
  },
  plugins: [],
}
