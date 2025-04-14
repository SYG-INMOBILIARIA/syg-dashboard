/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js" // add this line
  ],
  theme: {
    extend: {
      colors: {
        esmerald: {
          50: '#bcecdd',
          100: '#b0e1d2',
          200: '#07cf90',
          300: '#05bf85',
          400: '#04ab77',
          600: '#059669',
          700: '#047857'
        },
        payment: {
          paid: {
            bg: '#F2FCE2',
            text: '#16a34a'
          },
          unpaid: {
            bg: '#FFDEE2',
            text: '#ea384c'
          }
        }
      }
    },
  },
  plugins: [
    require('flowbite/plugin') // add this line
  ],
}

