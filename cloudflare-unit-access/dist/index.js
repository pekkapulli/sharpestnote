"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const itty_router_1 = require("itty-router");
const units_1 = require("./routes/units");
const access_1 = require("./routes/access");
const router = (0, itty_router_1.Router)();
router.get('/units', units_1.handleUnitRoutes);
router.get('/access/:unitCode', access_1.handleAccessRoutes);
exports.default = {
    fetch: router.handle
};
