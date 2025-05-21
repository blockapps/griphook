/**
 * Mercata API related services
 */
import { dbApiClient, networkApiClient } from "../helper/mercataApiHelper.js";
import { getUserToken } from "../helper/authHelper.js";
import { ReserveResult, EscrowResult } from "../types/assets.js";

export async function stake(
  reserveAddress: string,
  escrowAddress: string,
  quantity: number,
  username: string,
  assetRootAddress: string
): Promise<any> {
  try {
    let params: Record<string, string> = {
      quantity: "gt.0",
      ownerCommonName: `eq.${username}`,
      root: `eq.${assetRootAddress}`,
      sale: "is.null",
      select: "address",
    };
    console.warn("params", params);
    const assetResult = await dbApiClient.get<ReserveResult>(
      `/BlockApps-Mercata-Asset`,
      { params }
    );

    if (
      !assetResult?.data ||
      !Array.isArray(assetResult.data) ||
      assetResult.data.length === 0
    ) {
      return null;
    }
    console.warn("assetResult", assetResult.data);
    const assetAddresses = assetResult.data.map((asset) => asset.address);

    const payload = {
      txs: [
        {
          payload: {
            contractName: "Reserve",
            contractAddress: reserveAddress,
            method: "stakeAsset",
            args: {
              _escrowAddress: escrowAddress,
              _assets: assetAddresses,
              _collateralQuantity: quantity,
            },
          },
          type: "FUNCTION",
        },
      ],
      txParams: {
        gasLimit: 32100000000,
        gasPrice: 1,
      },
    };

    const response = await networkApiClient.post(
      "/transaction/parallel?resolve=true",
      payload
    );
    return response;
  } catch (error) {
    console.error("Error purchasing asset:", error);
    throw error;
  }
}

export async function borrow(
  reserveAddress: string,
  escrowAddress: string,
  quantity: number
): Promise<any> {
  try {
    const payload = {
      txs: [
        {
          payload: {
            contractName: "Reserve",
            contractAddress: reserveAddress,
            method: "borrow",
            args: {
              _escrowAddress: escrowAddress,
              _borrowAmount: quantity,
            },
          },
          type: "FUNCTION",
        },
      ],
      txParams: {
        gasLimit: 32100000000,
        gasPrice: 1,
      },
    };

    const response = await networkApiClient.post(
      "/transaction/parallel?resolve=true",
      payload
    );
    return response;
  } catch (error) {
    console.error("Error borrowing asset:", error);
    throw error;
  }
}

export async function purchaseAsset(
  saleAddress: string,
  paymentServiceAddress: string,
  username: string,
  quantity: string,
  decimals: number
): Promise<any> {
  try {
    let params: Record<string, string> = {
      quantity: "gt.0",
      ownerCommonName: `eq.${username}`,
      name: "eq.USDST",
      select: "address",
    };
    const assetResult = await dbApiClient.get<ReserveResult>(
      `/BlockApps-Mercata-Asset`,
      { params }
    );
    if (
      !assetResult?.data ||
      !Array.isArray(assetResult.data) ||
      assetResult.data.length === 0
    ) {
      return null;
    }
    const usdstAssetAddresses = assetResult.data.map((asset) => asset.address);

    // Generate a unique 6-digit checkout ID for this purchase
    const checkoutId = Math.floor(100000 + Math.random() * 900000).toString();

    const payload = {
      txs: [
        {
          payload: {
            contractName: "PaymentService",
            contractAddress: paymentServiceAddress,
            method: "checkoutInitialized",
            args: {
              _tokenAssetAddresses: usdstAssetAddresses,
              _checkoutId: checkoutId,
              _saleAddresses: [saleAddress],
              _quantities: [quantity],
              _decimals: [decimals],
              _createdDate: Date.now(),
              _comments: "Hey, I want to buy this asset!",
            },
          },
          type: "FUNCTION",
        },
      ],
      txParams: {
        gasLimit: 32100000000,
        gasPrice: 1,
      },
    };

    const response = await networkApiClient.post(
      "/transaction/parallel?resolve=true",
      payload
    );
    return response;
  } catch (error) {
    console.error("Error purchasing asset:", error);
    throw error;
  }
}

export async function findAsset(assetName: string): Promise<any | null> {
  try {
    const params: Record<string, string> = {
      name: `ilike.*${assetName}*`,
      sale: "neq.null",
      select:
        "name,decimals,address,BlockApps-Mercata-Sale!BlockApps-Mercata-Sale_BlockApps-Mercata-Asset_fk(*,BlockApps-Mercata-Sale-paymentServices(*))",
    };

    // First API call: Get the asset and its sale records from the database.
    const assetResult = await dbApiClient.get<ReserveResult>(
      `/BlockApps-Mercata-Asset`,
      { params }
    );

    if (
      !assetResult?.data ||
      !Array.isArray(assetResult.data) ||
      assetResult.data.length === 0
    ) {
      return null;
    }

    // Find the first asset where BlockApps-Mercata-Sale length is greater than 0
    const asset = assetResult.data.find(
      (a: any) =>
        Array.isArray(a["BlockApps-Mercata-Sale"]) &&
        a["BlockApps-Mercata-Sale"].length > 0
    );
    if (!asset) {
      return null;
    }

    // Determine decimals based on asset name or the stored value.
    const name = asset.name.toLowerCase();
    const decimals =
      name.includes("temp") || name.includes("eth") || name.includes("cata")
        ? 18
        : typeof asset.decimals === "number"
        ? asset.decimals
        : 0;

    // Locate the first open sale.
    let openSale = null;
    if (Array.isArray(asset["BlockApps-Mercata-Sale"])) {
      openSale = asset["BlockApps-Mercata-Sale"].find(
        (sale: any) => sale.isOpen === true
      );
    }

    // Initialize values for saleQuantity and tokenPaymentService.
    let tokenPaymentService: any = undefined;

    if (openSale) {
      // Look for the payment service from the open sale having the token service.
      if (Array.isArray(openSale["BlockApps-Mercata-Sale-paymentServices"])) {
        const tokenService = openSale[
          "BlockApps-Mercata-Sale-paymentServices"
        ].find(
          (payment: any) =>
            payment.value &&
            payment.value.serviceName &&
            payment.value.serviceName.toUpperCase() === "USDST"
        );
        tokenPaymentService = tokenService ? { ...tokenService.value } : null;
      }

      // If we found a token payment service, perform a new API call to fetch the active payment service record.
      if (tokenPaymentService) {
        // Build query parameters to filter the active payment service by serviceName and creator.
        const psParams: Record<string, string> = {
          isActive: "eq.true",
          serviceName: "eq." + tokenPaymentService.serviceName,
          creator: "eq." + tokenPaymentService.creator,
          limit: "1",
          select: "address",
        };

        const psResult = await dbApiClient.get(
          `/BlockApps-Mercata-PaymentService`,
          { params: psParams }
        );
        if (
          psResult?.data &&
          Array.isArray(psResult.data) &&
          psResult.data.length > 0
        ) {
          // Update the token payment service with the correct active address.
          tokenPaymentService.address = psResult.data[0].address;
        }
      }
    }
    return {
      ...asset,
      decimals,
      sale: openSale?.address, // The address of the open sale (if any).
      price:
        openSale?.price !== undefined
          ? Math.floor(openSale.price * Math.pow(10, decimals) * 100) / 100
          : undefined, // The price of the open sale (if any), rounded down to 2 decimal places.
      quantity: openSale?.quantity / Math.pow(10, decimals), // The quantity associated with the open sale (if any).
      tokenPaymentService, // The token's payment service details including the active address.
    };
  } catch (error) {
    console.error("Error fetching asset:", error);
    throw error;
  }
}

/**
 * Get reserves by asset name and attach their TVL (Total Value Locked)
 * @param assetName The name of the asset to search for (optional)
 * @returns An array of reserves with their TVL or null if not found
 */
export async function getReserve(
  assetName?: string | string[]
): Promise<any[] | null> {
  try {
    let params: Record<string, string> = {
      isActive: "eq.true",
      creator: "in.(BlockApps,mercata_usdst)",
    };

    if (Array.isArray(assetName) && assetName.length > 0) {
      const orConditions = assetName
        .map((name) => `name.ilike.*${name}*,assetRootAddress.eq.${name}`)
        .join(",");
      params["or"] = `(${orConditions})`;
    } else if (typeof assetName === "string") {
      params[
        "or"
      ] = `(name.ilike.*${assetName}*,assetRootAddress.eq.${assetName})`;
    }

    const reserveResult = await dbApiClient.get<ReserveResult>(
      `/BlockApps-Mercata-Reserve`,
      { params }
    );

    if (
      !reserveResult?.data ||
      !Array.isArray(reserveResult.data) ||
      reserveResult.data.length === 0
    ) {
      return null;
    }

    const reserves = reserveResult.data;
    const reserveAddresses = reserves.map((reserve) => reserve.address);

    let escrowParams: Record<string, string> = {
      isActive: "eq.true",
      creator: "in.(BlockApps,mercata_usdst)",
      reserve: `in.(${reserveAddresses.join(",")})`,
    };

    const escrowResults = await dbApiClient.get<EscrowResult>(
      `/BlockApps-Mercata-Escrow`,
      { params: escrowParams }
    );

    const escrows = Array.isArray(escrowResults.data) ? escrowResults.data : [];

    // Build a map of reserve address to list of escrows
    const escrowMap = new Map<string, EscrowResult[]>();
    escrows.forEach((escrow) => {
      if (!escrowMap.has(escrow.reserve)) {
        escrowMap.set(escrow.reserve, []);
      }
      escrowMap.get(escrow.reserve)!.push(escrow);
    });

    const assetRootAddresses = reserves.map(
      (reserve) => reserve.assetRootAddress
    );
    let AssetParams: Record<string, string> = {
      address: `in.(${assetRootAddresses.join(",")})`,
      select: "decimals,address,name",
    };

    const assetResults = await dbApiClient.get<any>(
      `/BlockApps-Mercata-Asset`,
      { params: AssetParams }
    );
    const assets = Array.isArray(assetResults.data) ? assetResults.data : [];
    const assetDecimalsMap = new Map<string, number>();
    assets.forEach((asset) => {
      if (!asset.address || !asset.name) return; // skip invalid assets

      const name = asset.name.toLowerCase();
      const decimals =
        name.includes("temp") || name.includes("eth")
          ? 18
          : typeof asset.decimals === "number"
          ? asset.decimals
          : 0;

      assetDecimalsMap.set(asset.address, decimals);
    });

    // Attach the escrows to their respective reserves
    const reservesWithEscrows = reserves.map((reserve) => ({
      ...reserve,
      escrows: escrowMap.get(reserve.address) || [],
      decimals: assetDecimalsMap.get(reserve.assetRootAddress),
    }));

    return reservesWithEscrows;
  } catch (error) {
    console.error("Error fetching reserves with TVL:", error);
    throw error;
  }
}

/**
 * Get user details by username
 * @param username The username of the user to search for
 * @return An object containing user assets and reserves or null if not found
 * */
export async function getUserDetails(username: string): Promise<any | null> {
  try {
    let params: Record<string, string> = {
      quantity: "gt.0",
      ownerCommonName: `eq.${username}`,
      select: "name,quantity:quantity.sum(),decimals,root",
    };

    const assetResult = await dbApiClient.get<ReserveResult>(
      `/BlockApps-Mercata-Asset`,
      { params }
    );

    if (
      !assetResult?.data ||
      !Array.isArray(assetResult.data) ||
      assetResult.data.length === 0
    ) {
      return null;
    }

    const userAssets = assetResult.data.map((asset) => {
      const name = asset.name?.toLowerCase() || "";
      const decimals =
        name.includes("temp") || name.includes("eth") || name.includes("cata")
          ? 18
          : typeof asset.decimals === "number"
          ? asset.decimals
          : 0;
      return { ...asset, decimals };
    });

    const assetRootAddresses = userAssets.map((asset) => asset.root);

    const reserveResult = await getReserve(assetRootAddresses);
    // remove all the escrows that the user does not own
    const reserves = reserveResult?.map((reserve) => {
      const filteredEscrows = (reserve.escrows as any[]).filter(
        (escrow: any) => escrow.borrowerCommonName === username
      );
      return {
        ...reserve,
        escrows: filteredEscrows,
      };
    });

    return { assets: userAssets, reserves };
  } catch (error) {
    console.error("Error fetching reserves with TVL:", error);
    throw error;
  }
}

export async function getUserCommonName(
  userAddress: string | undefined
): Promise<string> {
  try {
    if (userAddress) {
      let params: Record<string, string> = {
        userAddress: `eq.${userAddress}`,
        select: "commonName",
        limit: "1",
      };
      const userResult = await dbApiClient.get<any>(`/Certificate`, { params });
      if (
        !userResult?.data ||
        !Array.isArray(userResult.data) ||
        userResult.data.length === 0
      ) {
        return "";
      }
      const user = userResult.data[0];
      if (user && user.commonName) {
        return user.commonName;
      }
    } else {
      const token = await getUserToken();
      // decode token and get "name" field
      const payload = token.split(".")[1];
      const decodedPayload = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8")
      );
      const username = decodedPayload.name;
      if (username) {
        return username;
      }
    }
    return "";
  } catch (error) {
    console.error("Error fetching user common name:", error);
    throw error;
  }
}
