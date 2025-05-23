import { baUsername, baPassword, clientId, clientSecret } from "../config/index.js";
import { oauthUtil } from "blockapps-rest";


const CACHED_DATA: {
  serviceToken: string | null;
  serviceTokenExpiresAt: number | null;
  [key: string]:
    | { token: string; expiresAt: number }
    | string
    | null
    | number
    | null;
} = {
  serviceToken: null,
  serviceTokenExpiresAt: null,
};

const TOKEN_LIFETIME_RESERVE_SECONDS = 120; // Reserve 2 minutes for token expiration check

/**
 * Retrieves the user token, either from cache or by requesting a new one.
 * @returns {Promise<string>} - The OAuth token
 * @throws Will throw an error if the token retrieval process fails.
 */
const getUserToken = async () => {
  const cacheKey = baUsername || "";
  const userTokenData = CACHED_DATA[cacheKey];
  const currentTime = Math.floor(Date.now() / 1000);

  // Check if a valid cached token exists
  if (
    userTokenData &&
    typeof userTokenData === "object" &&
    userTokenData.token &&
    userTokenData.expiresAt &&
    userTokenData.expiresAt > currentTime + TOKEN_LIFETIME_RESERVE_SECONDS
  ) {
    // console.log("Returning cached token");
    return userTokenData.token;
  }

  // OAuth configuration
  const oauthInit = {
    appTokenCookieName: "asset_framework_session",
    appTokenCookieMaxAge: 7776000000,
    openIdDiscoveryUrl:
      "https://keycloak.blockapps.net/auth/realms/mercata/.well-known/openid-configuration",
    clientId: clientId,
    clientSecret: clientSecret,
    scope: "email openid",
    serviceOAuthFlow: null,
    redirectUri: "http://localhost/api/v1/authentication/callback",
    logoutRedirectUri: "http://localhost",
    tokenField: "access_token",
    tokenUsernameProperty: null,
    tokenUsernamePropertyServiceFlow: null,
  };

  try {
    // Initialize OAuth only if no valid cached token is available
    const oauth = await oauthUtil.init(oauthInit);

    // Fetch a new token using Resource Owner Password Credentials
    const tokenObj = await oauth.getAccessTokenByResourceOwnerCredential(
      baUsername,
      baPassword
    );
    const token = tokenObj.token[oauthInit.tokenField];
    const expiresAt = Math.floor(tokenObj.token.expires_at / 1000);
    // console.log("New OAuth token expires at:", new Date(expiresAt * 1000));
    // Cache the new token
    CACHED_DATA[cacheKey] = { token, expiresAt };

    // console.log("Returning new OAuth token");
    return token;
  } catch (error) {
    console.error("Error fetching user OAuth token:", error);
    throw new Error("Failed to fetch user OAuth token");
  }
};

export { getUserToken };
