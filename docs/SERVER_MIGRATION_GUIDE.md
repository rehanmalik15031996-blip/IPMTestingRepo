# MongoDB Migration Guide

## Option 1: Using the Migration Script (Recommended)

### Prerequisites:
1. **Local MongoDB must be running**
   - On Windows: Make sure MongoDB service is running
   - Check: Open Services (services.msc) and look for "MongoDB"
   - Or start manually: `mongod --dbpath "C:\data\db"`

2. **MongoDB Atlas Network Access**
   - Go to MongoDB Atlas → Network Access
   - Add IP Address: `0.0.0.0/0` (Allow from anywhere) OR add your current IP

### Steps:

1. **Start Local MongoDB** (if not running):
   ```bash
   # Check if MongoDB is running
   # On Windows, check Services or run:
   net start MongoDB
   ```

2. **Run the migration script**:
   ```bash
   cd server
   node migrate-simple.js
   ```

3. **Verify in MongoDB Atlas**:
   - Go to MongoDB Atlas Dashboard
   - Click "Browse Collections"
   - Verify all your collections and data are there

---

## Option 2: Using MongoDB Tools (mongodump/mongorestore)

If you have MongoDB tools installed:

### Export from Local:
```bash
mongodump --uri="mongodb://127.0.0.1:27017/ipm_db" --out=./backup
```

### Import to Atlas:
```bash
mongorestore --uri="mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority" ./backup/ipm_db
```

---

## Option 3: Manual Export/Import via MongoDB Compass

1. **Install MongoDB Compass** (if not installed)
   - Download from: https://www.mongodb.com/try/download/compass

2. **Connect to Local MongoDB**:
   - Connection string: `mongodb://127.0.0.1:27017`
   - Select database: `ipm_db`
   - Export each collection as JSON

3. **Connect to MongoDB Atlas**:
   - Connection string: `mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db`
   - Import each JSON file

---

## Troubleshooting

### "Connection Refused" Error
- **Solution**: Start your local MongoDB server
- Windows: Check Services or run `net start MongoDB`
- Or start manually with: `mongod --dbpath "C:\data\db"`

### "Authentication Failed" for Atlas
- **Solution**: Check your MongoDB Atlas username/password
- Verify network access allows your IP

### "Database not found"
- **Solution**: The script will create the database automatically
- Or create it manually in MongoDB Atlas dashboard

---

## After Migration

1. ✅ Verify all collections in MongoDB Atlas
2. ✅ Test your application with Atlas connection
3. ✅ Update environment variables in Vercel
4. ✅ Deploy to Vercel

