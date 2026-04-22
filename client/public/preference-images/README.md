# Preference step images (investor/buyer signup)

Place **9 images** here (e.g. `1.jpg`, `2.jpg`, … `9.jpg`) to use them in the “Select your preferences” step.

Then in **client/src/pages/ClientRegistration.js**, set the `PREFERENCE_IMAGES` array to use these paths, for example:

```js
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const PREFERENCE_IMAGES = [
  `${PUBLIC_URL}/preference-images/1.jpg`,
  `${PUBLIC_URL}/preference-images/2.jpg`,
  // … through 9.jpg
];
```

Users will see these 9 images and choose 5.
