const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/multitenant';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Correlation: ${req.correlationId}`);
  next();
});

// Rate limiting
const tenantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => `${req.tenantId || 'unknown'}:${req.ip}`,
  message: 'Too many requests from this tenant'
});

// MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Schemas
const TenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  logo: { type: String, default: '🏛️' },
  primaryColor: { type: String, default: '#3b82f6' },
  secondaryColor: { type: String, default: '#8b5cf6' },
  accentColor: { type: String, default: '#10b981' },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#1f2937' },
  fontFamily: { type: String, default: 'system-ui, sans-serif' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

const ResourceSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
ResourceSchema.index({ tenantId: 1, createdAt: -1 });
ResourceSchema.index({ tenantId: 1, type: 1 });

const Tenant = mongoose.model('Tenant', TenantSchema);
const User = mongoose.model('User', UserSchema);
const Resource = mongoose.model('Resource', ResourceSchema);

// Tenant Resolution Middleware
const resolveTenant = async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    const pathMatch = req.path.match(/^\/t\/([^\/]+)/);
    const headerTenant = req.headers['x-tenant-id'];
    
    const tenantId = headerTenant || (pathMatch && pathMatch[1]) || subdomain;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    req.tenantId = tenantId;
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error(`[${req.correlationId}] Tenant resolution error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Auth Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.tenantId !== req.tenantId) {
      console.error(`[${req.correlationId}] Tenant mismatch`);
      return res.status(403).json({ error: 'Tenant mismatch' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error(`[${req.correlationId}] Auth error:`, error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', resolveTenant, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ tenantId: req.tenantId, email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, tenantId: req.tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`[${req.correlationId}] Login successful: ${email}`);
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role
      },
      theme: {
        name: req.tenant.name,
        logo: req.tenant.logo,
        primaryColor: req.tenant.primaryColor,
        secondaryColor: req.tenant.secondaryColor,
        accentColor: req.tenant.accentColor,
        backgroundColor: req.tenant.backgroundColor,
        textColor: req.tenant.textColor,
        fontFamily: req.tenant.fontFamily
      }
    });
  } catch (error) {
    console.error(`[${req.correlationId}] Login error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tenant/config', resolveTenant, authenticate, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.tenantId });
    res.json({
      name: tenant.name,
      logo: tenant.logo,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      accentColor: tenant.accentColor,
      backgroundColor: tenant.backgroundColor,
      textColor: tenant.textColor,
      fontFamily: tenant.fontFamily
    });
  } catch (error) {
    console.error(`[${req.correlationId}] Get config error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tenant/config', resolveTenant, authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const updates = req.body;
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId: req.tenantId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    console.log(`[${req.correlationId}] Tenant config updated`);
    
    res.json({ success: true, config: tenant });
  } catch (error) {
    console.error(`[${req.correlationId}] Update config error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/resources', resolveTenant, authenticate, tenantLimiter, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const query = { tenantId: req.tenantId };
    
    const [resources, total] = await Promise.all([
      Resource.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Resource.countDocuments(query)
    ]);
    
    res.json({
      data: resources,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error(`[${req.correlationId}] Get resources error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/resources', resolveTenant, authenticate, async (req, res) => {
  try {
    const { name, type } = req.body;
    
    const resource = new Resource({
      tenantId: req.tenantId,
      name,
      type
    });
    
    await resource.save();
    res.status(201).json(resource);
  } catch (error) {
    console.error(`[${req.correlationId}] Create resource error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed database
async function seedDatabase() {
  try {
    const existingTenants = await Tenant.countDocuments();
    if (existingTenants > 0) {
      console.log('✅ Database already seeded');
      return;
    }
    
    console.log('🌱 Seeding database...');
    
    const tenants = [
      {
        tenantId: 'acme',
        name: 'ACME Corporation',
        logo: '🏢',
        primaryColor: '#dc2626',
        secondaryColor: '#991b1b',
        accentColor: '#fbbf24'
      },
      {
        tenantId: 'techstart',
        name: 'TechStart Inc',
        logo: '🚀',
        primaryColor: '#3b82f6',
        secondaryColor: '#1d4ed8',
        accentColor: '#10b981'
      }
    ];
    
    await Tenant.insertMany(tenants);
    
    const hashedPassword = await bcrypt.hash('password', 10);
    const users = [
      {
        tenantId: 'acme',
        email: 'admin@acme.com',
        password: hashedPassword,
        name: 'ACME Admin',
        role: 'admin'
      },
      {
        tenantId: 'techstart',
        email: 'admin@techstart.com',
        password: hashedPassword,
        name: 'TechStart Admin',
        role: 'admin'
      }
    ];
    
    await User.insertMany(users);
    
    const resources = [];
    for (const tenant of ['acme', 'techstart']) {
      for (let i = 1; i <= 50; i++) {
        resources.push({
          tenantId: tenant,
          name: `${tenant.toUpperCase()} Resource ${i}`,
          type: ['Document', 'Image', 'Video'][Math.floor(Math.random() * 3)]
        });
      }
    }
    
    await Resource.insertMany(resources);
    
    console.log('✅ Database seeded successfully!');
    console.log('📧 Test credentials:');
    console.log('   ACME: admin@acme.com / password');
    console.log('   TechStart: admin@techstart.com / password');
  } catch (error) {
    console.error('❌ Seed error:', error);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await seedDatabase();
});

module.exports = app;