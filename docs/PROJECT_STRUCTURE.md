# IPM Real Estate - Project Structure Documentation

## 📐 Overview

This is a **MERN Stack** (MongoDB, Express, React, Node.js) application deployed on **Vercel** using serverless functions. The project combines a React frontend with Vercel serverless API functions for the backend.

**See also:** [CONSISTENCY.md](./CONSISTENCY.md) — keeping agency agent and sole agent (and agency) behavior in sync for leads/CRM and similar flows.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                      │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────────┐   │
│  │  React Frontend  │      │  Serverless Functions │   │
│  │  (Static Build)  │◄────►│  (API Routes)         │   │
│  └──────────────────┘      └──────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   MongoDB Atlas       │
              │   (Cloud Database)    │
              └───────────────────────┘
```

---

## 📂 Directory Structure

### Root Level
```
my-first-mern/
├── client/              # React frontend application
├── server/              # Express backend (legacy, for local dev)
├── api/                 # Vercel serverless functions
├── vercel.json          # Vercel deployment config
├── .gitignore           # Git ignore rules
├── package.json         # Root package.json with scripts
└── README.md            # Project documentation
```

---

## 🎨 Frontend Structure (`client/`)

### Purpose
React-based single-page application (SPA) built with Create React App.

### Key Directories:

```
client/
├── public/                    # Static assets
│   ├── index.html            # HTML template
│   ├── favicon.ico           # Site icon
│   └── manifest.json         # PWA manifest
│
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Footer.js         # Site footer
│   │   ├── Navbar.js         # Navigation bar
│   │   ├── Sidebar.js        # Dashboard sidebar
│   │   ├── ScrollToTop.js    # Scroll behavior
│   │   └── ErrorBoundary.js  # Error handling
│   │
│   ├── pages/                # Page components (routes)
│   │   ├── Home.js           # Homepage
│   │   ├── Login.js          # Login page
│   │   ├── Signup.js         # Registration page
│   │   ├── Dashboard.js      # Main dashboard (role-based)
│   │   ├── Portfolio.js      # Investor portfolio view
│   │   ├── Collection.js     # Property listings
│   │   ├── Property.js       # Property detail page
│   │   ├── News.js           # News listings
│   │   ├── NewsDetail.js     # News article detail
│   │   ├── NewDevelopments.js # Developments page
│   │   ├── Pricing.js        # Pricing page
│   │   ├── About.js          # About page
│   │   ├── Contact.js        # Contact page
│   │   ├── Vault.js          # File vault
│   │   ├── Settings.js       # User settings
│   │   ├── ListingManagement.js # Admin property management
│   │   ├── AddListing.js     # Add new property
│   │   ├── Agents.js         # Agency agents page
│   │   ├── CRM.js            # CRM dashboard
│   │   ├── Admin.js          # Admin panel
│   │   └── SeedDatabase.js   # Database seeding UI
│   │
│   ├── config/
│   │   └── api.js            # API configuration & axios setup
│   │
│   ├── App.js                # Main app component (routing)
│   ├── App.css               # Global styles
│   └── index.js              # Entry point
│
├── package.json              # Frontend dependencies
└── build/                    # Production build output
```

### Frontend Technologies:
- **React 18+**: UI library
- **React Router DOM**: Client-side routing
- **Axios**: HTTP client for API calls
- **Chart.js**: Data visualization (for dashboards)

---

## ⚙️ Backend Structure

### A. Vercel Serverless Functions (`api/`)

**Purpose**: Serverless API endpoints deployed on Vercel.

```
api/
├── _lib/                     # Shared utilities
│   ├── mongodb.js           # MongoDB connection helper
│   ├── cors.js              # CORS handler
│   └── autoSeed.js          # Auto-seeding logic
│
├── auth/                     # Authentication
│   ├── login.js             # POST /api/auth/login
│   └── register.js          # POST /api/auth/register
│
├── properties/               # Property management
│   └── index.js             # GET/POST /api/properties
│
├── news/                     # News articles
│   └── index.js             # GET /api/news
│
├── developments/              # New developments
│   └── index.js             # GET /api/developments
│
├── users/                    # User management
│   ├── index.js             # GET/POST /api/users
│   └── [id].js              # GET/PUT /api/users/:id
│
├── contact/                  # Contact/inquiry endpoints
│   └── index.js             # GET/POST /api/contact
│
└── vault/                    # File vault
    └── index.js             # GET/POST /api/vault
```

**Key Features**:
- Each file exports a default async function `(req, res) => {}`
- Automatic routing by file structure
- Shared MongoDB connection via `_lib/mongodb.js`
- CORS handled automatically

### B. Express Server (`server/`)

**Purpose**: Legacy Express server for local development (optional).

```
server/
├── models/                   # Mongoose schemas
│   ├── User.js              # User model
│   ├── Property.js          # Property model
│   ├── News.js              # News model
│   ├── Development.js       # Development model
│   ├── MarketTrend.js       # Market trend model
│   ├── Meeting.js           # Meeting model
│   ├── Inquiry.js           # Inquiry model
│   └── File.js              # File model
│
├── routes/                   # Express routes (legacy)
│   └── ...
│
├── seed-atlas.js            # Database seeding script
└── server.js                # Express server entry point
```

---

## 🗄️ Database Structure

### MongoDB Collections:

1. **users**
   - User accounts with role-based data
   - Fields: `name`, `email`, `password`, `role`
   - Role-specific data: `portfolio`, `agencyStats`, `agentStats`

2. **properties**
   - Property listings
   - Fields: `title`, `location`, `price`, `listingType`, `status`, `imageUrl`, `specs`

3. **news**
   - News articles
   - Fields: `title`, `category`, `author`, `date`, `image`, `content`, `tags`

4. **developments**
   - New development projects
   - Fields: `title`, `subtitle`, `location`, `completion`, `priceStart`, `yieldRange`

5. **markettrends**
   - Market trend data
   - Fields: `country`, `status`, `color`, `priceChange`

6. **meetings**
   - Scheduled meetings
   - Fields: `date`, `time`, `agentName`, `propertyTitle`

7. **inquiries**
   - Contact inquiries
   - Fields: `name`, `email`, `phone`, `message`, `selectedDate`

8. **files**
   - User uploaded files
   - Fields: `userId`, `name`, `path`, `size`, `type`, `folder`

---

## 🔐 Authentication Flow

```
1. User submits login form
   ↓
2. POST /api/auth/login
   ↓
3. Verify credentials (bcrypt.compare)
   ↓
4. Generate JWT token
   ↓
5. Return user data + token
   ↓
6. Store token in localStorage
   ↓
7. Include token in subsequent API requests
```

---

## 🎯 User Roles & Dashboards

### 1. Investor (`role: 'investor'`)
- **Dashboard**: Portfolio overview, ROI charts, property map
- **Pages**: Portfolio, Saved Properties, Vault
- **Data**: `user.portfolio[]` array

### 2. Agency (`role: 'agency'`)
- **Dashboard**: Revenue, agents, listings, pipeline
- **Pages**: Agents, CRM, Listing Management
- **Data**: `user.agencyStats{}` object

### 3. Agent (`role: 'agent'`)
- **Dashboard**: Commission, listings, leads, meetings
- **Pages**: CRM, Pipeline, Leads
- **Data**: `user.agentStats{}` object

### 4. Buyer (`role: 'buyer'`)
- **Dashboard**: Similar to investor
- **Pages**: Portfolio, Saved Properties
- **Data**: `user.portfolio[]` array

---

## 🔄 Data Flow

### Example: Loading Properties

```
1. User visits Homepage
   ↓
2. Home.js component mounts
   ↓
3. useEffect calls: api.get('/api/properties')
   ↓
4. Request goes to: api/properties/index.js
   ↓
5. Serverless function connects to MongoDB
   ↓
6. Query: Property.find({ status: 'Published' })
   ↓
7. Return JSON array
   ↓
8. React component updates state
   ↓
9. Properties render in UI
```

---

## 🚀 Deployment Architecture

### Vercel Deployment:

```
GitHub Repository
      ↓
   (Push)
      ↓
Vercel Auto-Deploy
      ↓
┌─────────────────────────────────┐
│  Build Process:                 │
│  1. Install dependencies         │
│  2. Build React app (npm build) │
│  3. Deploy static files          │
│  4. Deploy serverless functions  │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  Runtime:                        │
│  - Static files: CDN             │
│  - API routes: Serverless        │
│  - Database: MongoDB Atlas        │
└─────────────────────────────────┘
```

---

## 📦 Key Dependencies

### Frontend (`client/package.json`):
- `react`: ^18.x
- `react-router-dom`: ^6.x
- `axios`: ^1.x
- `chart.js`: ^4.x
- `react-chartjs-2`: ^5.x

### Backend (`server/package.json`):
- `express`: ^5.x
- `mongoose`: ^9.x
- `bcryptjs`: ^3.x
- `jsonwebtoken`: ^9.x
- `cors`: ^2.x

### API Functions (shared):
- Same as backend dependencies

---

## 🔧 Configuration Files

### `vercel.json`
- Build configuration
- Routing rules
- Static file handling
- API route rewrites

### `.env` (local development)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT tokens
- `REACT_APP_API_URL`: Frontend API base URL

### `package.json` (root)
- Convenience scripts
- Project metadata

---

## 📊 API Endpoint Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/auth/login` | POST | User login | No |
| `/api/auth/register` | POST | User registration | No |
| `/api/properties` | GET | List properties | No |
| `/api/properties?id=:id` | GET | Get property | No |
| `/api/news` | GET | List news | No |
| `/api/developments` | GET | List developments | No |
| `/api/users/:id?type=dashboard` | GET | Get dashboard data | Yes |
| `/api/users?action=seed` | POST | Seed database | No |
| `/api/contact?type=meetings` | POST | Create meeting | No |
| `/api/contact?type=inquiry` | POST | Create inquiry | No |

---

## 🎨 Styling Approach

- **Global Styles**: `App.css` with CSS variables
- **Component Styles**: Inline styles (style objects)
- **Responsive**: Media queries in CSS
- **Icons**: Font Awesome (CDN)

---

## 🔍 Key Features

1. **Role-Based Access Control**: Different dashboards per user role
2. **Auto-Seeding**: Database auto-populates on first API call
3. **JWT Authentication**: Secure token-based auth
4. **Responsive Design**: Works on mobile and desktop
5. **Serverless Architecture**: Scalable Vercel deployment
6. **MongoDB Atlas**: Cloud-hosted database

---

## 📝 Notes

- **Function Limit**: Vercel Hobby plan allows 12 serverless functions
- **Cold Starts**: First request may be slower (serverless)
- **Connection Pooling**: MongoDB connection is cached per function instance
- **CORS**: Handled automatically in serverless functions
- **Environment Variables**: Must be set in Vercel dashboard for production

---

**Last Updated**: January 2025

