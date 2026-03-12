"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const itty_router_1 = require("itty-router");
const units_1 = require("./routes/units");
const access_1 = require("./routes/access");
const share_1 = require("./routes/share");
exports.default = {
    fetch(request, env) {
        const router = (0, itty_router_1.Router)();
        router.get('/units', (req) => (0, units_1.handleUnitRoutes)(req));
        router.post('/access', (req) => (0, access_1.handleAccessRoutes)(req));
        router.post('/access/lookup', (req) => (0, access_1.handleAccessLookup)(req));
        router.post('/share/custom', (req) => (0, share_1.handleCreateCustomShare)(req, env));
        router.get('/s/:id', (req) => (0, share_1.handleResolveCustomShare)(req, env));
        router.head('/s/:id', (req) => (0, share_1.handleResolveCustomShare)(req, env));
        router.all('*', () => fetch(request));
        return router.handle(request);
    }
};
