/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    corePlugins: {
        preflight: false,
    },
    theme: {
        extend: {
            colors: {
                'ipm-green': 'rgb(16 87 92)',
                'ipm-orange': 'rgb(255 178 27)',
                'ipm-yellow': 'rgb(255 200 1)',
                'ipm-grey': 'rgb(194 195 195)',
                'ipm-light-grey': 'rgb(225 225 225)',
                'ipm-black': 'rgb(6 6 6)',
            },
        },
    },
    plugins: [],
};
