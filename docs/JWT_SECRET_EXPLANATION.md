# JWT_SECRET Explained

## What is JWT_SECRET?

**JWT_SECRET** is a secret key used to sign and verify JSON Web Tokens (JWTs) in your application.

### Purpose:
- **Signing Tokens**: When a user logs in, the server creates a JWT token and signs it with this secret
- **Verifying Tokens**: When the user makes authenticated requests, the server verifies the token using the same secret
- **Security**: Only someone with the secret can create valid tokens or verify existing ones

### How It Works:

1. **User Login**:
   ```javascript
   // User logs in with email/password
   // Server creates a JWT token signed with JWT_SECRET
   const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
   // Returns token to frontend
   ```

2. **Authenticated Requests**:
   ```javascript
   // Frontend sends token in Authorization header
   // Server verifies token using JWT_SECRET
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   // If valid, user is authenticated
   ```

### Why It's Important:

- **Security**: Without a secret, anyone could create fake tokens
- **Authentication**: Ensures tokens haven't been tampered with
- **User Sessions**: Tokens contain user ID and are used to identify logged-in users

### Your JWT_SECRET:

I've generated a secure random string for you:
```
2ez2qBgf6kUntBA/Vt3JFenFQrYWc/RAOeuVhFL9Nxo=
```

This is a 32-byte random string encoded in base64, which is cryptographically secure.

### Important Notes:

⚠️ **Keep It Secret!**
- Never commit JWT_SECRET to Git
- Don't share it publicly
- Use different secrets for development and production
- If compromised, generate a new one (users will need to log in again)

✅ **Best Practices:**
- Use a long, random string (at least 32 characters)
- Store it in environment variables (`.env` file)
- Use different secrets for different environments
- Rotate it periodically in production

### Where It's Used:

1. **Login Route** (`api/auth/login.js`):
   - Signs JWT tokens when users log in

2. **Protected Routes**:
   - Verifies tokens to authenticate users
   - Ensures only logged-in users can access protected resources

### Current Configuration:

Your `server/.env` file now contains:
```env
MONGO_URI=mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=2ez2qBgf6kUntBA/Vt3JFenFQrYWc/RAOeuVhFL9Nxo=
NODE_ENV=development
```

This is all set up and ready to use! 🎉

