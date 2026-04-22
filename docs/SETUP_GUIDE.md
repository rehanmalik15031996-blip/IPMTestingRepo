# IPM Real Estate - Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Installation Steps](#installation-steps)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [Deployment to Vercel](#deployment-to-vercel)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Before you start, make sure you have the following installed:

### Required Software:
1. **Node.js** (v18.x or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` (should show v18.x or higher)
   - Verify npm: `npm --version`

2. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

3. **MongoDB Atlas Account** (for database)
   - Sign up at: https://www.mongodb.com/cloud/atlas
   - Or use the existing connection string (already configured)

### Optional:
- **VS Code** or any code editor
- **Postman** or **Insomnia** (for API testing)

---

## 📁 Project Structure

```
my-first-mern/
│
├── client/                    # React Frontend (Create React App)
│   ├── public/               # Static files (index.html, images, etc.)
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── Footer.js
│   │   │   ├── Navbar.js
│   │   │   ├── Sidebar.js
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Portfolio.js
│   │   │   └── ...
│   │   ├── config/
│   │   │   └── api.js       # API configuration
│   │   ├── App.js           # Main app component with routes
│   │   └── index.js         # Entry point
│   ├── package.json         # Frontend dependencies
│   └── build/               # Production build (generated)
│
├── server/                   # Express Backend (for local dev)
│   ├── models/              # Mongoose models
│   │   ├── User.js
│   │   ├── Property.js
│   │   ├── News.js
│   │   └── ...
│   ├── routes/              # Express routes (legacy)
│   ├── seed-atlas.js        # Database seeding script
│   ├── server.js            # Express server entry point
│   └── package.json         # Backend dependencies
│
├── api/                     # Vercel Serverless Functions
│   ├── _lib/                # Shared utilities
│   │   ├── mongodb.js       # MongoDB connection helper
│   │   ├── cors.js          # CORS handler
│   │   └── autoSeed.js      # Auto-seeding logic
│   ├── auth/                # Authentication endpoints
│   │   ├── login.js         # POST /api/auth/login
│   │   └── register.js      # POST /api/auth/register
│   ├── properties/          # Property endpoints
│   │   └── index.js         # GET/POST /api/properties
│   ├── news/                 # News endpoints
│   │   └── index.js         # GET /api/news
│   ├── users/                # User endpoints
│   │   ├── index.js         # GET/POST /api/users
│   │   └── [id].js          # GET/PUT /api/users/:id
│   └── ...                   # Other endpoints
│
├── vercel.json              # Vercel deployment configuration
├── .gitignore               # Git ignore rules
├── package.json             # Root package.json (scripts)
└── README.md                # Project documentation
```

### Key Technologies:
- **Frontend**: React (Create React App), React Router, Axios
- **Backend**: Node.js, Express (legacy), Vercel Serverless Functions
- **Database**: MongoDB Atlas (cloud-hosted)
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Vercel

---

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/rehan243/IPM-Website.git

# Navigate to project directory
cd IPM-Website
```

### Step 2: Install Dependencies

```bash
# Install root dependencies (if any)
npm install

# Install frontend dependencies
cd client
npm install

# Install backend dependencies (for local development)
cd ../server
npm install

# Go back to root
cd ..
```

**Or use the convenience script:**
```bash
npm run install-client
npm run install-server
```

### Step 3: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# MongoDB Atlas Connection String
MONGO_URI=mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret (for token generation)
JWT_SECRET=your-secret-key-here-change-in-production

# Frontend API URL (for local development)
REACT_APP_API_URL=http://localhost:5000
```

**Note**: For Vercel deployment, set these in Vercel Dashboard → Settings → Environment Variables

### Step 4: Seed the Database (Optional)

If you want to populate the database with sample data:

```bash
# Option 1: Run the seed script
cd server
node seed-atlas.js

# Option 2: Use the API endpoint (after starting server)
# POST http://localhost:5000/api/users?action=seed
```

---

## 💻 Running Locally

### Option A: Run Frontend Only (Recommended for Development)

The frontend can run independently and connect to the deployed Vercel API:

```bash
# Navigate to client directory
cd client

# Start development server
npm start

# The app will open at http://localhost:3000
```

### Option B: Run Full Stack Locally

If you want to run both frontend and backend locally:

**Terminal 1 - Backend:**
```bash
cd server
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
# Frontend runs on http://localhost:3000
```

**Note**: Make sure `REACT_APP_API_URL=http://localhost:5000` is set in your `.env` file.

---

## 🌐 Deployment to Vercel

### Prerequisites:
1. Vercel account (sign up at https://vercel.com)
2. GitHub repository connected to Vercel

### Steps:

1. **Push to GitHub** (if not already):
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

2. **Connect to Vercel**:
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the settings

3. **Configure Environment Variables**:
   - In Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `MONGO_URI`: Your MongoDB connection string
     - `JWT_SECRET`: Your JWT secret key
     - `REACT_APP_API_URL`: Leave empty (uses relative paths)

4. **Deploy**:
   - Vercel will automatically deploy on every push to `main`
   - Or click "Redeploy" in the dashboard

### Vercel Configuration:

The `vercel.json` file is already configured:
- Build command: `cd client && npm install && npm run build`
- Output directory: `client/build`
- API routes: Automatically detected from `/api` folder

---

## 🔑 Default Login Credentials

After seeding the database, you can use these credentials:

### Investor:
- Email: `investor1@ipm.com`
- Password: (check database or create new user)

### Agency:
- Email: `agency12@gmail.com`
- Password: (check database or create new user)

### Agent:
- Email: `agent1@gmail.com`
- Password: (check database or create new user)

**Note**: Passwords are hashed in the database. If you need to reset, use the registration endpoint or update directly in MongoDB.

---

## 🛠️ Available Scripts

### Root Level:
```bash
npm run install-client    # Install frontend dependencies
npm run install-server    # Install backend dependencies
npm run build             # Build frontend for production
npm start                 # Start backend server (legacy)
```

### Frontend (client/):
```bash
npm start                 # Start development server (port 3000)
npm run build             # Build for production
npm test                  # Run tests
npm run eject             # Eject from Create React App (not recommended)
```

### Backend (server/):
```bash
npm start                 # Start Express server (port 5000)
npm run dev               # Start with nodemon (auto-reload)
```

---

## 📝 API Endpoints

### Authentication:
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Properties:
- `GET /api/properties` - Get all properties
- `GET /api/properties?id=:id` - Get single property
- `POST /api/properties` - Create property (admin only)

### Users:
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id?type=dashboard` - Get user dashboard data
- `PUT /api/users/:id` - Update user
- `POST /api/users?action=seed` - Seed database

### News:
- `GET /api/news` - Get all news articles
- `GET /api/news?id=:id` - Get single article

### Developments:
- `GET /api/developments` - Get all developments

### Contact:
- `GET /api/contact?type=appointments` - Get booked dates
- `GET /api/contact?type=meetings&date=...` - Get booked times
- `POST /api/contact?type=meetings` - Create meeting
- `POST /api/contact?type=inquiry` - Create inquiry

---

## 🐛 Troubleshooting

### Issue: "Cannot find module" errors
**Solution**: Make sure you've installed all dependencies:
```bash
cd client && npm install
cd ../server && npm install
```

### Issue: MongoDB connection timeout
**Solution**: 
1. Check MongoDB Atlas Network Access (allow `0.0.0.0/0`)
2. Verify `MONGO_URI` environment variable is correct
3. Check Vercel function logs for detailed errors

### Issue: Port already in use
**Solution**: 
- Frontend (3000): Kill process or use different port: `PORT=3001 npm start`
- Backend (5000): Kill process or change port in `server.js`

### Issue: CORS errors
**Solution**: 
- For local development, ensure `REACT_APP_API_URL` is set correctly
- For Vercel, CORS is handled automatically in serverless functions

### Issue: Build fails on Vercel
**Solution**:
1. Check Vercel build logs
2. Ensure all dependencies are in `package.json`
3. Check Node.js version (should be >= 18.x)
4. Verify `vercel.json` configuration

### Issue: Database appears empty
**Solution**:
1. Seed the database: `POST /api/users?action=seed`
2. Or visit homepage to trigger auto-seed
3. Check MongoDB Atlas to verify data exists

---

## 📚 Additional Resources

- **React Documentation**: https://react.dev/
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Vercel Documentation**: https://vercel.com/docs
- **Mongoose Documentation**: https://mongoosejs.com/

---

## ✅ Quick Start Checklist

- [ ] Install Node.js (v18+)
- [ ] Install Git
- [ ] Clone repository
- [ ] Install dependencies (`npm install` in client and server)
- [ ] Set up environment variables (`.env` file)
- [ ] Seed database (optional)
- [ ] Run `npm start` in client directory
- [ ] Open http://localhost:3000
- [ ] Test login/registration

---

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel function logs
3. Check browser console for frontend errors
4. Verify MongoDB connection in Atlas dashboard
5. Ensure all environment variables are set correctly

---

**Last Updated**: January 2025
**Project Version**: 1.0.0

