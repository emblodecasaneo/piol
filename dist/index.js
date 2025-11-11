"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const agents_1 = __importDefault(require("./routes/agents"));
const appointments_1 = __importDefault(require("./routes/appointments"));
const auth_1 = __importDefault(require("./routes/auth"));
const locations_1 = __importDefault(require("./routes/locations"));
const messages_1 = __importDefault(require("./routes/messages"));
const neighborhood_scores_1 = __importDefault(require("./routes/neighborhood-scores"));
const payments_1 = __importDefault(require("./routes/payments"));
const properties_1 = __importDefault(require("./routes/properties"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const saved_searches_1 = __importDefault(require("./routes/saved-searches"));
const users_1 = __importDefault(require("./routes/users"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const admins_1 = __importDefault(require("./routes/admins"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const analytics_1 = __importDefault(require("./routes/analytics"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
exports.prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
}));
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            ...helmet_1.default.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https:", "*"],
            "cross-origin-resource-policy": ["cross-origin"]
        }
    }
}));
app.use((0, morgan_1.default)('combined'));
app.use((req, res, next) => {
    if (req.path.startsWith('/api/uploads')) {
        return next();
    }
    express_1.default.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
    if (req.path.startsWith('/api/uploads')) {
        return next();
    }
    express_1.default.urlencoded({ extended: true })(req, res, next);
});
const uploadsPath = path_1.default.join(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(uploadsPath)) {
    fs_1.default.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cache-Control', 'public, max-age=31536000');
    next();
}, express_1.default.static(uploadsPath));
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/properties', properties_1.default);
app.use('/api/agents', agents_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/saved-searches', saved_searches_1.default);
app.use('/api/locations', locations_1.default);
app.use('/api/appointments', appointments_1.default);
app.use('/api/neighborhood-scores', neighborhood_scores_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/uploads', uploads_1.default);
app.use('/api/admins', admins_1.default);
app.use('/api/subscriptions', subscriptions_1.default);
app.use('/api/analytics', analytics_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'PIOL Backend API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
async function startServer() {
    try {
        await exports.prisma.$connect();
        console.log('✅ Database connected successfully');
        app.listen(PORT, () => {
            console.log(`🚀 PIOL Backend API running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await exports.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await exports.prisma.$disconnect();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map