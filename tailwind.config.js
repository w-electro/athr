/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // لوحة "أثر" — مستوحاة من رمال النفود وجبال أجا الجرانيتية
        terracotta: {
          DEFAULT: '#C97A4A',
          50: '#FBF2EC',
          100: '#F5E1D3',
          200: '#E9C2A7',
          300: '#DBA179',
          400: '#D18C5F',
          500: '#C97A4A',
          600: '#AC6238',
          700: '#874B2A',
          800: '#61361E',
          900: '#3D2213',
        },
        night: {
          DEFAULT: '#1A2233',
          50: '#EEF0F4',
          100: '#D4D9E2',
          200: '#A6B0C3',
          300: '#7686A2',
          400: '#4E5F7D',
          500: '#33415A',
          600: '#243049',
          700: '#1A2233',
          800: '#131926',
          900: '#0D111A',
        },
        gold: {
          DEFAULT: '#D98E4A',
          100: '#F8E7D2',
          200: '#EFCCA4',
          300: '#E5AE74',
          400: '#D98E4A',
          500: '#C0752F',
          600: '#985B24',
        },
        sand: {
          50: '#FDFAF6',
          100: '#F8F2E9',
          200: '#EFE4D5',
          300: '#E1D0BA',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 28px -12px rgba(26, 34, 51, 0.25)',
        lift: '0 18px 40px -18px rgba(26, 34, 51, 0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scan-sweep': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'scan-sweep': 'scan-sweep 2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}
