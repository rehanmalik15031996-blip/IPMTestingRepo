/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "celtic-85": "var(--celtic-85)",
        "ecru-white-70": "var(--ecru-white-70)",
        heliotrope: "var(--heliotrope)",
        "ipm-black": "var(--ipm-black)",
        "ipm-green": "var(--ipm-green)",
        "ipm-grey": "var(--ipm-grey)",
        "ipm-light-grey": "var(--ipm-light-grey)",
        "ipm-orange": "var(--ipm-orange)",
        "ipm-red": "var(--ipm-red)",
        "ipm-yellow": "var(--ipm-yellow)",
        paradiso: "var(--paradiso)",
        "white-rock-80": "var(--white-rock-80)",
      },
      fontFamily: {
        "DM-mono-medium": "var(--DM-mono-medium-font-family)",
        "DM-mono-regular": "var(--DM-mono-regular-font-family)",
        "DM-mono-regular-strikethrough":
          "var(--DM-mono-regular-strikethrough-font-family)",
        "DM-mono-regular-upper": "var(--DM-mono-regular-upper-font-family)",
        "DM-sans-medium": "var(--DM-sans-medium-font-family)",
        "DM-sans-regular": "var(--DM-sans-regular-font-family)",
        "DM-sans-regular-upper": "var(--DM-sans-regular-upper-font-family)",
        "inter-regular": "var(--inter-regular-font-family)",
        "IPM-poppins-light-copy": "var(--IPM-poppins-light-copy-font-family)",
        "IPM-poppins-light-heading":
          "var(--IPM-poppins-light-heading-font-family)",
        "IPM-poppins-light-subheading":
          "var(--IPM-poppins-light-subheading-font-family)",
        "IPM-poppins-semibold-copy":
          "var(--IPM-poppins-semibold-copy-font-family)",
        "IPM-poppins-semibold-heading":
          "var(--IPM-poppins-semibold-heading-font-family)",
        "IPM-poppins-semibold-subheading":
          "var(--IPM-poppins-semibold-subheading-font-family)",
        "jost-bold": "var(--jost-bold-font-family)",
        "jost-bold-upper": "var(--jost-bold-upper-font-family)",
        "jost-italic": "var(--jost-italic-font-family)",
        "jost-light": "var(--jost-light-font-family)",
        "jost-medium": "var(--jost-medium-font-family)",
        "jost-medium-italic": "var(--jost-medium-italic-font-family)",
        "jost-regular": "var(--jost-regular-font-family)",
        "jost-regular-upper": "var(--jost-regular-upper-font-family)",
        "jost-semibold": "var(--jost-semibold-font-family)",
        "jost-semibold-upper": "var(--jost-semibold-upper-font-family)",
        "playfair-display-bold": "var(--playfair-display-bold-font-family)",
        "playfair-display-italic": "var(--playfair-display-italic-font-family)",
        "playfair-display-regular":
          "var(--playfair-display-regular-font-family)",
        "playfair-display-semibold":
          "var(--playfair-display-semibold-font-family)",
        "semantic-blockquote": "var(--semantic-blockquote-font-family)",
        "semantic-button": "var(--semantic-button-font-family)",
        "semantic-cell-upper": "var(--semantic-cell-upper-font-family)",
        "semantic-data": "var(--semantic-data-font-family)",
        "semantic-emphasis": "var(--semantic-emphasis-font-family)",
        "semantic-heading-1": "var(--semantic-heading-1-font-family)",
        "semantic-heading-2": "var(--semantic-heading-2-font-family)",
        "semantic-heading-3": "var(--semantic-heading-3-font-family)",
        "semantic-input": "var(--semantic-input-font-family)",
        "semantic-item": "var(--semantic-item-font-family)",
        "semantic-link": "var(--semantic-link-font-family)",
        "semantic-poppin": "var(--semantic-poppin-font-family)",
        "semantic-strong-upper": "var(--semantic-strong-upper-font-family)",
      },
    },
  },
  plugins: [],
};
