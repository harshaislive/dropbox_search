/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {      colors: {
        brand: {
          // Primary Colors
          earth: '#342e29',      // Dark Earth
          red: '#86312b',        // Rich Red
          forest: '#344736',     // Forest Green
          deepblue: '#002140',   // Deep Blue
          
          // Secondary & Accent Colors
          brown: '#4b3c35',      // Dark Brown
          burntred: '#9e3430',   // Burnt Red
          olive: '#415c43',      // Olive Green
          darkblue: '#00385e',   // Dark Blue
          yellow: '#ffc083',     // Warm Yellow
          coral: '#ff774a',      // Coral Orange
          softgreen: '#b8dc99',  // Soft Green
          lightblue: '#b0ddf1',  // Light Blue
          
          // Neutral Colors
          black: '#000000',      // Black
          charcoal: '#51514d',   // Charcoal Gray
          softgray: '#e7e4df',   // Soft Gray
          offwhite: '#fdfbf7',   // Off White
          
          // Aliases for backward compatibility
          DEFAULT: '#344736',
        },
      },
      fontFamily: {
        heading: [
          'ABCArizonaFlare',
          'ABCArizonaSans',
          'ui-serif',
          'Georgia',
          'serif',
        ],
        body: [
          'ABCArizonaSans',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
