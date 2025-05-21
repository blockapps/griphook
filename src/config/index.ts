import dotenv from 'dotenv';
dotenv.config();

export const baUsername = process.env.BA_USERNAME;
export const baPassword = process.env.BA_PASSWORD;
export const clientSecret = process.env.CLIENT_SECRET;
export const clientId = process.env.CLIENT_ID;
export const openIdDiscoveryUrl = process.env.OPENID_DISCOVERY_URL;
export const marketplaceUrl = process.env.MARKETPLACE_URL;
