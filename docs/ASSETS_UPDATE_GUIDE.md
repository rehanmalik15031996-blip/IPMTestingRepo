# How to Update Site Pictures & Videos

This guide lists **every place** where landing-page videos, signup left-side images, and the 9-pic preference grid are defined so you can replace them in one go.

---

## 1. Landing page videos (Home page)

Used in:
- **Hero background** (full-width video behind the main headline)
- **Carousel** (Buyers / Sellers / Investors section with selectable tiles and videos)

### Where to change

**File:** `client/src/pages/Home.js`

| What | Line(s) | Current value |
|------|--------|----------------|
| Hero background video | ~371 | `src="/video/hero section video.mp4"` |
| Slide 1 (Buyers) video | ~231 | `video: "/video/cinematic-residential-spaces.mp4"` |
| Slide 2 (Sellers) video | ~232 | `video: "/Videos/Cinematic%20Global%20Journey.mp4"` |
| Slide 3 (Investors) video | ~233 | `video: "/Videos/City%20Drone%20footage.mp4"` |

### Where files live

- **Hero:** Put your file in `client/public/video/` and keep the filename (e.g. `hero section video.mp4`) or change the `src` in Home.js to match your new filename.
- **Carousel:** The code uses two folders:
  - `client/public/video/` (e.g. `cinematic-residential-spaces.mp4`)
  - `client/public/Videos/` (e.g. `Cinematic Global Journey.mp4`, `City Drone footage.mp4`)

**To update:** Either put your new MP4s in `client/public/video/` (or `Videos/`) and adjust the `slideContent` entries in Home.js to use the new filenames, or use new paths (e.g. `/video/your-new-name.mp4`).

---

## 2. Signup / login left-side pictures (all user types)

The left panel image is set by a `visualSide` style with a `background: url(...)` in each page.

### Where to change

| Page | File | Line (approx) | Current image |
|------|------|----------------|---------------|
| Main signup (role selection) | `client/src/pages/Signup.js` | ~411 | `photo-1486406146926-c627a92ad1ab` (Unsplash) |
| Client registration (buyer/tenant/investor/seller) | `client/src/pages/ClientRegistration.js` | ~1096 | `photo-1512917774080-9991f1c4c750` (Unsplash) |
| Agency registration | `client/src/pages/AgencyRegistration.js` | ~553 | `photo-1486406146926-c627a92ad1ab` (Unsplash) |
| Independent agent registration | `client/src/pages/IndependentAgentRegistration.js` | ~647 | `photo-1560518883-ce09059eeffa` (Unsplash) |
| Agency invite registration | `client/src/pages/AgencyAgentInviteRegistration.js` | ~303 | `photo-1486406146926-c627a92ad1ab` (Unsplash) |
| Login | `client/src/pages/Login.js` | ~117 | `photo-1497366216548-37526070297c` (Unsplash) |
| Forgot password | `client/src/pages/ForgotPassword.js` | ~257 | No image (gradient only) |

Search in each file for `visualSide` to find the exact line. The URL is inside `background: "url('...')"`.

**To use your own image:**

1. Put the image in the app’s public folder, e.g. `client/public/signup-left.jpg`.
2. In the page file, set:
   - `background: "url('/signup-left.jpg') center/cover no-repeat"`  
   or, if you use a subfolder:
   - `background: "url('/images/signup-left.jpg') center/cover no-repeat"`

You can use one shared image for all signups or different images per page by changing the URL in each file above.

---

## 3. 9-pic preference grid (client registration)

Shown when a **buyer/tenant/investor** selects “Select your preferences” (choose 5 of 9 images).

### Where to change

**File:** `client/src/pages/ClientRegistration.js`  
**Constant:** `PREFERENCE_IMAGES` (around lines 28–38)

It’s an array of **9 image URLs**. Right now they are Unsplash URLs.

**Option A – Use your own files in the repo**

1. Add 9 images under `client/public/preference-images/`, e.g. `1.jpg`, `2.jpg`, … `9.jpg`.
2. In `ClientRegistration.js`, set:

```js
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const PREFERENCE_IMAGES = [
    `${PUBLIC_URL}/preference-images/1.jpg`,
    `${PUBLIC_URL}/preference-images/2.jpg`,
    `${PUBLIC_URL}/preference-images/3.jpg`,
    `${PUBLIC_URL}/preference-images/4.jpg`,
    `${PUBLIC_URL}/preference-images/5.jpg`,
    `${PUBLIC_URL}/preference-images/6.jpg`,
    `${PUBLIC_URL}/preference-images/7.jpg`,
    `${PUBLIC_URL}/preference-images/8.jpg`,
    `${PUBLIC_URL}/preference-images/9.jpg`
];
```

**Option B – Use external URLs**

Replace the 9 entries in `PREFERENCE_IMAGES` with your full image URLs (e.g. from a CDN or your own domain).

---

## Summary checklist

- [ ] **Landing videos:** Update `client/src/pages/Home.js` (hero + `slideContent` videos) and add/replace MP4s in `client/public/video/` and/or `client/public/Videos/`.
- [ ] **Signup left images:** Update `visualSide` in Signup.js, ClientRegistration.js, AgencyRegistration.js, IndependentAgentRegistration.js, AgencyAgentInviteRegistration.js, Login.js (and optionally add images under `client/public/`).
- [ ] **9-pic grid:** Add 9 images to `client/public/preference-images/` and set `PREFERENCE_IMAGES` in `client/src/pages/ClientRegistration.js`, or point `PREFERENCE_IMAGES` to 9 external URLs.

If you want a single place to manage all these (e.g. one config file), we can add a small `assetConfig.js` and wire these pages to it next.
