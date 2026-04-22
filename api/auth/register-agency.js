// Vercel serverless function for agency/agent registration with file upload
const connectDB = require('../_lib/mongodb');
const User = require('../../server/models/User');
const { sanitizeAgencyBranch } = require('../../server/utils/display');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Readable } = require('stream');

// Helper to parse multipart form data (simplified for Vercel)
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    // Check if body is already a buffer or needs to be read
    let bodyBuffer;
    
    if (Buffer.isBuffer(req.body)) {
      bodyBuffer = req.body;
      processBody();
    } else if (req.body && typeof req.body === 'object') {
      // Vercel might have pre-parsed it
      console.log('📦 Using pre-parsed request body');
      const fields = { ...req.body };
      const files = {};
      if (req.files) {
        Object.assign(files, req.files);
      }
      return resolve({ fields, files });
    } else {
      // Need to read from stream
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        bodyBuffer = Buffer.concat(chunks);
        processBody();
      });
      req.on('error', reject);
      return;
    }
    
    function processBody() {
      try {
        const contentType = req.headers['content-type'] || '';
        console.log('📋 Content-Type:', contentType);
        console.log('📋 Body buffer size:', bodyBuffer ? bodyBuffer.length : 0);
        
        if (!bodyBuffer || bodyBuffer.length === 0) {
          console.warn('⚠️ Empty body buffer');
          return resolve({ fields: {}, files: {} });
        }
        
        // If it's JSON (fallback), parse directly
        if (contentType.includes('application/json')) {
          const data = JSON.parse(bodyBuffer.toString());
          return resolve({ fields: data, files: {} });
        }
        
        // Parse multipart/form-data
        const boundaryMatch = contentType.match(/boundary=([^;\s]+)/);
        if (!boundaryMatch) {
          console.warn('⚠️ No boundary found, treating as JSON');
          try {
            const data = JSON.parse(bodyBuffer.toString());
            return resolve({ fields: data, files: {} });
          } catch (e) {
            console.error('❌ Failed to parse as JSON:', e.message);
            return resolve({ fields: {}, files: {} });
          }
        }
        
        const boundary = boundaryMatch[1];
        console.log('🔍 Boundary found:', boundary);
        const parts = bodyBuffer.toString('binary').split(`--${boundary}`);
        console.log(`🔍 Split into ${parts.length} parts`);
        const fields = {};
        const files = {};
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part || !part.includes('Content-Disposition') || part.trim().length < 10) {
            console.log(`⏭️ Skipping part ${i}: no Content-Disposition or too short`);
            continue;
          }
          
          const nameMatch = part.match(/name="([^"]+)"/);
          if (!nameMatch) {
            console.log(`⏭️ Skipping part ${i}: no name match`);
            continue;
          }
          
          const fieldName = nameMatch[1];
          const isFile = part.includes('filename=');
          
          if (isFile) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const filename = filenameMatch ? filenameMatch[1] : 'file';
            const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
            const mimetype = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
            
            const contentStart = part.indexOf('\r\n\r\n') + 4;
            const contentEnd = part.lastIndexOf('\r\n--');
            if (contentStart < 4 || contentEnd < contentStart) {
              console.log(`⏭️ Skipping file ${fieldName}: invalid content boundaries`);
              continue;
            }
            
            const fileContent = part.substring(contentStart, contentEnd);
            
            files[fieldName] = {
              buffer: Buffer.from(fileContent, 'binary'),
              filename,
              mimetype
            };
            console.log(`📁 Parsed file: ${fieldName} = ${filename} (${fileContent.length} bytes)`);
          } else {
            // Try multiple patterns for finding content
            let contentStart = part.indexOf('\r\n\r\n');
            if (contentStart === -1) contentStart = part.indexOf('\n\n');
            if (contentStart === -1) {
              console.log(`⏭️ Skipping field ${fieldName}: no content separator found`);
              continue;
            }
            contentStart += 4;
            
            let contentEnd = part.lastIndexOf('\r\n--');
            if (contentEnd === -1) contentEnd = part.lastIndexOf('\n--');
            if (contentEnd === -1) contentEnd = part.length;
            if (contentEnd < contentStart) {
              console.log(`⏭️ Skipping field ${fieldName}: invalid content boundaries`);
              continue;
            }
            
            const value = part.substring(contentStart, contentEnd).trim();
            // Remove trailing boundary markers if present
            const cleanValue = value.replace(/\r?\n--$/, '').trim();
            if (cleanValue) {
              fields[fieldName] = cleanValue;
              console.log(`📝 Parsed field: ${fieldName} = ${cleanValue.substring(0, 50)}${cleanValue.length > 50 ? '...' : ''}`);
            } else {
              console.log(`⏭️ Skipping field ${fieldName}: empty value`);
            }
          }
        }
        
        console.log('📋 Parsed fields:', Object.keys(fields));
        console.log('📁 Parsed files:', Object.keys(files));
        resolve({ fields, files });
      } catch (err) {
        console.error('❌ Error parsing form data:', err);
        reject(err);
      }
    }
  });
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🔌 Connecting to MongoDB for agency registration...');
    await connectDB();
    console.log('✅ MongoDB connected');

    // Debug: Log request details
    console.log('📋 Request method:', req.method);
    console.log('📋 Content-Type:', req.headers['content-type']);
    console.log('📋 Content-Length:', req.headers['content-length']);
    console.log('📋 req.body type:', typeof req.body);
    console.log('📋 req.body is Buffer:', Buffer.isBuffer(req.body));
    console.log('📋 req.body value:', req.body);
    console.log('📋 req has on method:', typeof req.on === 'function');
    console.log('📋 req is readable:', req.readable !== false);

    // Parse multipart form data or use req.body directly
    let fields = {};
    let files = {};
    
    // Vercel serverless functions don't automatically parse multipart/form-data
    // We need to parse it manually
    try {
      const parsed = await parseFormData(req);
      fields = parsed.fields || {};
      files = parsed.files || {};
      console.log('✅ Successfully parsed multipart form data');
    } catch (parseErr) {
      console.error('❌ Form data parse error:', parseErr.message);
      console.error('Parse error stack:', parseErr.stack);
      // Fallback: Check if Vercel somehow parsed it
      if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log('📦 Fallback: Using req.body as fields');
        fields = req.body || {};
        files = {};
      } else {
        fields = {};
        files = {};
      }
    }
    
    console.log('📋 Parsed fields:', Object.keys(fields));
    console.log('📁 Parsed files:', Object.keys(files));
    console.log('📋 Raw fields object:', JSON.stringify(fields, null, 2));
    console.log('📋 Raw req.body:', JSON.stringify(req.body, null, 2));
    
    // Extract form fields (handle both multipart and JSON)
    // Normalize email: lowercase and trim to ensure consistent storage and lookup
    const email = (fields.email || req.body?.email || '').toLowerCase().trim();
    const name = fields.name || fields.agencyName || req.body?.name || req.body?.agencyName || '';
    const password = fields.password || req.body?.password || 'Default123!';
    let role = fields.role || req.body?.role || 'agency';
    const location = fields.location || req.body?.location || '';
    const plan = fields.plan || req.body?.plan || '';
    const planOption = fields.planOption || req.body?.planOption || '';
    const contact = fields.contact || req.body?.contact || '';
    let agencyName = fields.agencyName || req.body?.agencyName || '';
    const inviteToken = fields.inviteToken || fields.token || req.body?.inviteToken || req.body?.token || '';
    
    console.log('📝 Registration data extracted:', { 
      email: email || '(empty)', 
      name: name || '(empty)', 
      role, 
      hasPassword: !!password, 
      hasLocation: !!location, 
      hasPlan: !!plan,
      emailSource: fields.email ? 'fields.email' : req.body?.email ? 'req.body.email' : 'none'
    });
    
    // Parse JSON strings for arrays
    let cities = [];
    let propertyTypes = [];
    let selectedProperties = [];
    try {
      if (fields.cities) {
        cities = typeof fields.cities === 'string' ? JSON.parse(fields.cities) : fields.cities;
      } else if (req.body?.cities) {
        cities = typeof req.body.cities === 'string' ? JSON.parse(req.body.cities) : req.body.cities;
      }
    } catch (e) {
      console.warn('Error parsing cities:', e);
    }
    
    try {
      if (fields.propertyTypes) {
        propertyTypes = typeof fields.propertyTypes === 'string' ? JSON.parse(fields.propertyTypes) : fields.propertyTypes;
      } else if (req.body?.propertyTypes) {
        propertyTypes = typeof req.body.propertyTypes === 'string' ? JSON.parse(req.body.propertyTypes) : req.body.propertyTypes;
      }
    } catch (e) {
      console.warn('Error parsing propertyTypes:', e);
    }
    
    try {
      if (fields.selectedProperties) {
        selectedProperties = typeof fields.selectedProperties === 'string' ? JSON.parse(fields.selectedProperties) : fields.selectedProperties;
      } else if (req.body?.selectedProperties) {
        selectedProperties = typeof req.body.selectedProperties === 'string' ? JSON.parse(req.body.selectedProperties) : req.body.selectedProperties;
      }
    } catch (e) {
      console.warn('Error parsing selectedProperties:', e);
    }

    // Buyer-only: interior / exterior / video preferences (filenames from registration preference step)
    let preferredInterior = [];
    let preferredExterior = [];
    let preferredVideos = [];
    try {
      if (fields.preferredInterior) {
        preferredInterior = typeof fields.preferredInterior === 'string' ? JSON.parse(fields.preferredInterior) : fields.preferredInterior;
      } else if (req.body?.preferredInterior) {
        preferredInterior = typeof req.body.preferredInterior === 'string' ? JSON.parse(req.body.preferredInterior) : req.body.preferredInterior;
      }
      if (fields.preferredExterior) {
        preferredExterior = typeof fields.preferredExterior === 'string' ? JSON.parse(fields.preferredExterior) : fields.preferredExterior;
      } else if (req.body?.preferredExterior) {
        preferredExterior = typeof req.body.preferredExterior === 'string' ? JSON.parse(req.body.preferredExterior) : req.body.preferredExterior;
      }
      if (fields.preferredVideos) {
        preferredVideos = typeof fields.preferredVideos === 'string' ? JSON.parse(fields.preferredVideos) : fields.preferredVideos;
      } else if (req.body?.preferredVideos) {
        preferredVideos = typeof req.body.preferredVideos === 'string' ? JSON.parse(req.body.preferredVideos) : req.body.preferredVideos;
      }
    } catch (e) {
      console.warn('Error parsing preferredInterior/Exterior/Videos:', e);
    }
    
    // Validation
    if (!email || !email.trim()) {
      console.error('❌ Validation failed: Email is missing or empty');
      return res.status(400).json({ 
        success: false,
        message: 'Email is required',
        error: 'MISSING_EMAIL'
      });
    }

    // Resolve invite first so we can set name from agency's topAgents when doing password-only claim
    let agencyIdForAgent = null;
    let branchIdForAgent = null;
    let inviteDoc = null;
    let resolvedName = name ? String(name).trim() : '';
    if (inviteToken && inviteToken.trim()) {
      const AgencyInviteModel = require('../../server/models/AgencyInvite');
      inviteDoc = await AgencyInviteModel.findOne({ token: inviteToken.trim(), used: false });
      if (!inviteDoc) {
        return res.status(400).json({ success: false, message: 'Invalid or expired invite link. Please ask your agency for a new invite.' });
      }
      if (new Date() > inviteDoc.expiresAt) {
        return res.status(400).json({ success: false, message: 'Invite has expired. Please ask your agency for a new invite.' });
      }
      if (inviteDoc.email && inviteDoc.email.toLowerCase() !== email) {
        return res.status(400).json({ success: false, message: 'This invite was sent to a different email address.' });
      }
      agencyIdForAgent = inviteDoc.agencyId;
      branchIdForAgent = inviteDoc.branchId;
      if (inviteDoc.agencyName) agencyName = String(inviteDoc.agencyName).trim();
      if (!resolvedName && inviteDoc) {
        const first = (inviteDoc.firstName || '').trim();
        const last = (inviteDoc.lastName || '').trim();
        if (first || last) resolvedName = [first, last].filter(Boolean).join(' ');
      }
      if (!resolvedName && agencyIdForAgent) {
        const agencyUser = await User.findById(agencyIdForAgent);
        const topAgent = agencyUser?.agencyStats?.topAgents?.find(
          a => (a.email || '').toLowerCase().trim() === email.toLowerCase().trim()
        );
        if (topAgent?.name) resolvedName = String(topAgent.name).trim();
      }
    }
    // For partner role, name is optional (default to email prefix or "Partner")
    if (role === 'partner') {
      resolvedName = resolvedName || (email.split('@')[0] || 'Partner').trim() || 'Partner';
    } else if (!resolvedName) {
      console.error('❌ Validation failed: Name is missing or empty');
      return res.status(400).json({
        success: false,
        message: 'Name is required',
        error: 'MISSING_NAME'
      });
    }
    const finalName = resolvedName;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Validation failed: Invalid email format');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format',
        error: 'INVALID_EMAIL'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Allow resuming registration if they never completed payment (e.g. Stripe checkout failed)
      const canResume = !existingUser.stripeSubscriptionId && !inviteDoc;
      if (canResume && plan) {
        const update = { subscriptionPlan: plan };
        if (planOption) update.subscriptionPlanOption = planOption;
        const isPaidPlanRole = (role === 'buyer' || role === 'seller' || role === 'investor') && (plan === 'Basic' || plan === 'Premium');
        const isAgencyPaid = role === 'agency' && plan === 'Premium';
        const isAgentPaid = (role === 'independent_agent' || role === 'agent') && plan === 'Basic';
        if (isPaidPlanRole || isAgencyPaid || isAgentPaid) {
          update.subscriptionStatus = 'pending_payment';
        }
        await User.findByIdAndUpdate(existingUser._id, update);
        const updated = await User.findById(existingUser._id).select('-password').lean();
        const { password: __, ...userWithoutPassword } = updated;
        const stripeRedirect = isPaidPlanRole || isAgencyPaid || isAgentPaid;
        const secretResume = process.env.JWT_SECRET || 'SECRET_KEY_123';
        const tokenResume = jwt.sign({ id: existingUser._id }, secretResume);
        const userWithTokenResume = { ...userWithoutPassword, token: tokenResume };
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Vary', 'Authorization');
        return res.status(200).json({
          success: true,
          message: 'Continue your registration',
          user: userWithTokenResume,
          ...(stripeRedirect && { stripeRedirect: true, ...(isAgencyPaid && planOption && { planOption }) })
        });
      }
      console.error('❌ User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        error: 'DUPLICATE_EMAIL'
      });
    }

    // Generate hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Handle file upload (logo/photo)
    let logoUrl = null;
    if (files.logo) {
      // In production, you'd upload to S3/Cloudinary/etc.
      // For now, we'll store a reference or base64 (not recommended for production)
      // For Vercel, you might want to use Vercel Blob or similar
      logoUrl = `data:${files.logo.mimetype};base64,${files.logo.buffer.toString('base64')}`;
      // Note: In production, upload to cloud storage and store URL
    }

    if (inviteDoc) role = 'agency_agent';

    // Create user object based on role
    const userData = {
      name: finalName,
      email,
      password: hashedPassword,
      role,
      location: location || ''
    };

    // Add additional fields (never persist "Seeff" as agency/branch)
    if (contact) userData.contact = contact;
    const sanitizedAgency = sanitizeAgencyBranch(agencyName || '');
    if (sanitizedAgency) userData.agencyName = sanitizedAgency;
    if (agencyIdForAgent) userData.agencyId = agencyIdForAgent;
    if (branchIdForAgent) userData.branchId = branchIdForAgent;
    const sanitizedBranch = sanitizeAgencyBranch(inviteDoc?.branchName || '');
    if (sanitizedBranch) userData.branchName = sanitizedBranch;
    if (inviteDoc && typeof inviteDoc.allowMarketingCampaigns === 'boolean') userData.allowMarketingCampaigns = inviteDoc.allowMarketingCampaigns;
    if (plan) userData.subscriptionPlan = plan;
    if (planOption) userData.subscriptionPlanOption = planOption;
    const isPaidPlanRole = (role === 'buyer' || role === 'seller' || role === 'investor') && (plan === 'Basic' || plan === 'Premium');
    const isAgencyPaid = role === 'agency' && plan === 'Premium';
    const isAgentPaid = (role === 'independent_agent' || role === 'agent') && plan === 'Basic';
    if (isPaidPlanRole || isAgencyPaid || isAgentPaid) {
      userData.subscriptionStatus = 'pending_payment';
    }
    if (logoUrl) {
      // Store logo for agency, photo for others
      if (role === 'agency') {
        userData.logo = logoUrl;
      } else {
        userData.photo = logoUrl;
      }
    }

    // Add role-specific data structures
    if (role === 'agency') {
      userData.agencyStats = {
        totalRevenue: 0,
        propertiesSold: 0,
        activeAgents: 0,
        totalListings: 0,
        activeLeads: 0,
        topAgents: [],
        pipelineColumns: [],
        pipelineDeals: [],
        crmLeads: []
      };
    } else if (role === 'independent_agent' || role === 'agent' || role === 'agency_agent') {
      userData.agentStats = {
        myCommission: 0,
        activeListings: 0,
        pendingDeals: 0,
        meetingsScheduled: 0,
        recentLeads: [],
        pipelineColumns: [],
        pipelineDeals: [],
        crmLeads: []
      };
    } else if (role === 'buyer' || role === 'investor' || role === 'tenant') {
      userData.portfolio = [];
      userData.savedProperties = [];
      if (cities && cities.length > 0) userData.preferredCities = cities;
      if (propertyTypes && propertyTypes.length > 0) userData.preferredPropertyTypes = propertyTypes;
      if (selectedProperties && selectedProperties.length > 0) userData.selectedProperties = selectedProperties;
      // Buyer / Tenant: store interior / exterior / video preferences
      if (role === 'buyer' || role === 'tenant') {
        if (preferredInterior && preferredInterior.length > 0) userData.preferredInterior = preferredInterior;
        if (preferredExterior && preferredExterior.length > 0) userData.preferredExterior = preferredExterior;
        if (preferredVideos && preferredVideos.length > 0) userData.preferredVideos = preferredVideos;
      }
    } else if (role === 'seller') {
      userData.portfolio = [];
      userData.savedProperties = [];
    } else if (role === 'partner') {
      // Partners only need minimal profile; ads can be stored later
    }

    console.log('💾 Creating user with data:', { 
      name: finalName, 
      email, 
      role, 
      hasLocation: !!location,
      hasPlan: !!plan,
      hasLogo: !!logoUrl,
      hasCities: cities.length > 0,
      hasPropertyTypes: propertyTypes.length > 0
    });
    
    try {
      const newUser = new User(userData);
      const user = await newUser.save();
      
      if (inviteDoc) {
        inviteDoc.used = true;
        await inviteDoc.save();
        const agencyUser = await User.findById(agencyIdForAgent);
        if (agencyUser && agencyUser.agencyStats && agencyUser.agencyStats.topAgents) {
          const idx = agencyUser.agencyStats.topAgents.findIndex(a => (a.email || '').toLowerCase() === email);
          if (idx !== -1) {
            agencyUser.agencyStats.topAgents[idx]._id = user._id;
            agencyUser.agencyStats.topAgents[idx].id = user._id.toString();
            agencyUser.agencyStats.topAgents[idx].status = 'active';
            await agencyUser.save();
          }
        }
      }

      const { password: _, ...userWithoutPassword } = user._doc;
      
      console.log('✅ User registered successfully:', email, 'Role:', role, 'ID:', user._id);

      const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';
      const token = jwt.sign({ id: user._id }, secret);
      const userWithToken = { ...userWithoutPassword, token };

      const isPaidPlan = isPaidPlanRole || isAgencyPaid || isAgentPaid;

      // Prevent any cache from storing this response (would show wrong user to next registrant)
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Vary', 'Authorization');

      return res.status(200).json({
        success: true,
        message: 'Registration successful',
        user: userWithToken,
        ...(isPaidPlan && { stripeRedirect: true, ...(isAgencyPaid && planOption && { planOption }) })
      });
    } catch (saveError) {
      console.error('❌ Error saving user to database:', saveError);
      throw saveError; // Re-throw to be caught by outer catch
    }
  } catch (err) {
    console.error('Register agency error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    
    // Handle duplicate key error (email already exists)
    if (err.code === 11000 || err.message.includes('duplicate')) {
      return res.status(400).json({ 
        message: 'User with this email already exists',
        error: 'DUPLICATE_EMAIL'
      });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error: ' + Object.values(err.errors).map(e => e.message).join(', '),
        error: 'VALIDATION_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: err.message || 'Registration failed',
      error: 'INTERNAL_ERROR'
    });
  }
};

