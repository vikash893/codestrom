import { MedicineCatalogue } from '../models/MedicineCatalogue.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';
import { Pharmacy } from '../models/Pharmacy.js';

export const searchMedicines = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter (q) is required.',
      });
    }

    const regex = new RegExp(q.trim(), 'i');
    const filter = {
      isActive: true,
      $or: [{ canonicalName: regex }, { brandName: regex }, { genericName: regex }],
    };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const medicines = await MedicineCatalogue.find(filter)
      .sort({ brandName: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await MedicineCatalogue.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      medicines,
    });
  } catch (error) {
    next(error);
  }
};

export const addCanonicalMedicine = async (req, res, next) => {
  try {
    const {
      canonicalName,
      brandName,
      genericName,
      dosageForm,
      strength,
      packSize,
      scheduleCategory = 'OTC',
      manufacturer,
      requiresPrescription = false,
    } = req.body;

    if (!canonicalName || !brandName || !genericName || !dosageForm || !strength) {
      return res.status(400).json({
        success: false,
        message: 'Canonical name, brand name, generic name, dosage form, and strength are required.',
      });
    }

    const item = await MedicineCatalogue.create({
      canonicalName: canonicalName.toUpperCase().trim(),
      brandName,
      genericName,
      dosageForm,
      strength,
      packSize,
      scheduleCategory,
      manufacturer,
      requiresPrescription,
    });

    res.status(201).json({
      success: true,
      message: 'Canonical medicine added to catalogue.',
      medicine: item,
    });
  } catch (error) {
    next(error);
  }
};

export const matchInventory = async (req, res, next) => {
  try {
    const { query, lng, lat, radiusKm = 15 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Medicine query parameter is required.',
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    // 1. Find matching inventory records
    const inventoryMatches = await PharmacyInventory.find({
      isAvailable: true,
      $or: [
        { medicineName: searchRegex },
        { genericName: searchRegex },
        { brandName: searchRegex },
      ],
    }).populate('pharmacyId');

    if (!inventoryMatches.length) {
      return res.status(200).json({
        success: true,
        query,
        count: 0,
        matches: [],
        message: 'No pharmacy currently reports stock for this medicine.',
      });
    }

    let results = [];

    for (const item of inventoryMatches) {
      const pharmacy = item.pharmacyId;
      if (!pharmacy || !pharmacy.isActive) continue;

      let distanceMeters = null;

      // If user coordinates provided, compute approximate distance in meters
      if (lng !== undefined && lat !== undefined && pharmacy.location?.coordinates) {
        const [pLng, pLat] = pharmacy.location.coordinates;
        const uLng = parseFloat(lng);
        const uLat = parseFloat(lat);

        // Haversine formula
        const R = 6371e3; // Earth radius in meters
        const phi1 = (uLat * Math.PI) / 180;
        const phi2 = (pLat * Math.PI) / 180;
        const deltaPhi = ((pLat - uLat) * Math.PI) / 180;
        const deltaLambda = ((pLng - uLng) * Math.PI) / 180;

        const a =
          Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
          Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceMeters = Math.round(R * c);

        // Filter by radius if provided
        if (distanceMeters > parseFloat(radiusKm) * 1000) {
          continue;
        }
      }

      // Calculate inventory freshness decay penalty (items updated > 7 days ago lose freshness score)
      const daysSinceUpdate = item.updatedAt
        ? (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      const freshnessDecay = daysSinceUpdate > 7 ? Math.min(daysSinceUpdate * 2, 50) : 0;

      // Ranking score: lower is better (distance in meters + freshness penalty - stock bonus)
      const stockBonus = Math.min(item.availableQuantity, 100);
      const computedRankingScore = (distanceMeters ?? 5000) + freshnessDecay * 100 - stockBonus * 10;

      results.push({
        inventoryId: item._id,
        medicineName: item.medicineName,
        genericName: item.genericName,
        brandName: item.brandName,
        strength: item.strength,
        dosageForm: item.dosageForm,
        availableQuantity: item.availableQuantity,
        unitPrice: item.unitPrice,
        stockStatus: item.stockStatus,
        lastRestockedAt: item.lastRestockedAt,
        daysSinceLastVerification: Math.round(daysSinceUpdate),
        rankingScore: Math.round(computedRankingScore),
        pharmacy: {
          id: pharmacy._id,
          storeName: pharmacy.storeName,
          verifiedContactNumber: pharmacy.verifiedContactNumber,
          callUrl: `tel:${pharmacy.verifiedContactNumber}`,
          address: pharmacy.address,
          operatingHours: pharmacy.operatingHours,
          isVerified: pharmacy.isVerified,
        },
        distanceMeters,
      });
    }

    // Sort by computedRankingScore ascending (verified, close, recently updated inventory first)
    results.sort((a, b) => a.rankingScore - b.rankingScore);

    // Look up canonical medicine safety profile if present in catalogue
    const catalogueItem = await MedicineCatalogue.findOne({
      $or: [{ brandName: searchRegex }, { genericName: searchRegex }, { canonicalName: searchRegex }],
    }).lean();

    res.status(200).json({
      success: true,
      query,
      count: results.length,
      safetyProfile: catalogueItem
        ? {
            canonicalName: catalogueItem.canonicalName,
            scheduleCategory: catalogueItem.scheduleCategory,
            requiresPrescription: catalogueItem.requiresPrescription,
            contraindications: catalogueItem.contraindications || [],
            pregnancyCategory: catalogueItem.pregnancyCategory || 'N',
            ageRestrictions: catalogueItem.ageRestrictions || null,
            antibioticStewardship: catalogueItem.antibioticStewardship || null,
          }
        : null,
      matches: results,
    });
  } catch (error) {
    next(error);
  }
};

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Check real-time cart availability across verified pharmacies and group by store
export const checkCartAvailability = async (req, res, next) => {
  try {
    const { items = [], coordinates, lng, lat, radiusKm = 20 } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items array is required.',
      });
    }

    const uLng = Array.isArray(coordinates) && coordinates[0] !== undefined
      ? Number(coordinates[0])
      : (Number(lng) || 77.209);
    const uLat = Array.isArray(coordinates) && coordinates[1] !== undefined
      ? Number(coordinates[1])
      : (Number(lat) || 28.6139);

    // 1. Fetch all active pharmacies
    const pharmacies = await Pharmacy.find({ isActive: true }).lean();
    if (!pharmacies || pharmacies.length === 0) {
      return res.status(200).json({
        success: true,
        storeGroups: [],
        unavailableItems: items.map((it) => ({
          name: it.name || it.medicineName,
          genericName: it.genericName,
          quantity: it.quantity || 1,
          reason: 'No active pharmacies currently operating nearby',
        })),
        summary: {
          totalRequested: items.length,
          totalAvailable: 0,
          totalUnavailable: items.length,
          canPlaceOrder: false,
        },
      });
    }

    // Annotate pharmacies with distance
    const pharmacyMap = new Map();
    for (const ph of pharmacies) {
      const pCoords = ph.location?.coordinates;
      const dist = pCoords && pCoords.length === 2
        ? calculateDistanceKm(uLat, uLng, pCoords[1], pCoords[0])
        : 3.0;
      pharmacyMap.set(ph._id.toString(), {
        ...ph,
        distanceKm: dist,
      });
    }

    // 2. Fetch all available inventory records across active pharmacies
    const pharmacyIds = Array.from(pharmacyMap.keys());
    const inventoryDocs = await PharmacyInventory.find({
      pharmacyId: { $in: pharmacyIds },
      isAvailable: true,
      availableQuantity: { $gt: 0 },
    }).lean();

    // 3. For each requested item, match against active inventories
    const itemCandidates = [];
    for (const rawItem of items) {
      const medName = (rawItem.name || rawItem.medicineName || '').trim();
      const generic = (rawItem.genericName || rawItem.generic_name || '').trim();
      const requestedQty = Math.max(1, parseInt(rawItem.quantity, 10) || 1);

      if (!medName && !generic) continue;

      const cleanTokens = [medName, generic]
        .filter(Boolean)
        .flatMap((s) => s.split(/[\s,+/()\-]+/))
        .map((t) => t.replace(/[^a-zA-Z0-9]/g, '').trim())
        .filter((t) => t.length >= 3 && !['tablet', 'tablets', 'capsule', 'syrup', 'mg', 'ml', 'oral'].includes(t.toLowerCase()));

      const matchingInventories = inventoryDocs.filter((inv) => {
        const phId = inv.pharmacyId?.toString();
        if (!pharmacyMap.has(phId)) return false;

        const invName = (inv.medicineName || '').toLowerCase();
        const invGen = (inv.genericName || '').toLowerCase();
        const invBrand = (inv.brandName || '').toLowerCase();

        if (medName && (invName.includes(medName.toLowerCase()) || invBrand.includes(medName.toLowerCase()))) return true;
        if (generic && invGen.includes(generic.toLowerCase())) return true;

        return cleanTokens.some((tok) => {
          const ltok = tok.toLowerCase();
          return invName.includes(ltok) || invGen.includes(ltok) || invBrand.includes(ltok);
        });
      });

      itemCandidates.push({
        rawItem,
        medName,
        generic,
        requestedQty,
        matchingInventories,
      });
    }

    // 4. Grouping by store:
    // If available at same store -> group into one store card
    // If available on different stores -> show on each store separately
    // If unavailable -> show in unavailable items section
    const assignedStores = new Map();
    const unavailableItems = [];

    const pharmacyItemCoverage = new Map();
    for (const cand of itemCandidates) {
      if (cand.matchingInventories.length === 0) {
        unavailableItems.push({
          name: cand.medName,
          genericName: cand.generic,
          quantity: cand.requestedQty,
          reason: 'Not available at your nearby medical stores',
        });
        continue;
      }

      for (const inv of cand.matchingInventories) {
        const pId = inv.pharmacyId.toString();
        pharmacyItemCoverage.set(pId, (pharmacyItemCoverage.get(pId) || 0) + 1);
      }
    }

    for (const cand of itemCandidates) {
      if (cand.matchingInventories.length === 0) continue;

      const sortedMatches = [...cand.matchingInventories].sort((a, b) => {
        const pIdA = a.pharmacyId.toString();
        const pIdB = b.pharmacyId.toString();

        const covA = pharmacyItemCoverage.get(pIdA) || 0;
        const covB = pharmacyItemCoverage.get(pIdB) || 0;

        if (covB !== covA) return covB - covA;

        const phA = pharmacyMap.get(pIdA);
        const phB = pharmacyMap.get(pIdB);
        return (phA?.distanceKm || 99) - (phB?.distanceKm || 99);
      });

      const best = sortedMatches[0];
      const ph = pharmacyMap.get(best.pharmacyId.toString());

      if (!assignedStores.has(ph._id.toString())) {
        assignedStores.set(ph._id.toString(), {
          store: {
            pharmacyId: ph._id,
            storeName: ph.storeName,
            verifiedContactNumber: ph.verifiedContactNumber,
            address: ph.address,
            distanceKm: ph.distanceKm,
            homeDeliveryAvailable: ph.homeDeliveryAvailable ?? true,
            deliveryRadiusKm: ph.deliveryRadiusKm || 15,
          },
          items: [],
          storeSubtotal: 0,
        });
      }

      const storeGroup = assignedStores.get(ph._id.toString());
      const unitPrice = best.unitPrice || cand.rawItem.unitPrice || 50;
      const subtotal = Math.round(unitPrice * cand.requestedQty * 100) / 100;

      storeGroup.items.push({
        inventoryId: best._id,
        name: best.medicineName || cand.medName,
        genericName: best.genericName || cand.generic,
        quantity: cand.requestedQty,
        availableQuantity: best.availableQuantity,
        unitPrice,
        subtotal,
        isSufficientStock: best.availableQuantity >= cand.requestedQty,
      });

      storeGroup.storeSubtotal = Math.round((storeGroup.storeSubtotal + subtotal) * 100) / 100;
    }

    const storeGroups = Array.from(assignedStores.values());
    const totalAvailable = storeGroups.reduce((acc, g) => acc + g.items.length, 0);

    res.status(200).json({
      success: true,
      storeGroups,
      unavailableItems,
      summary: {
        totalRequested: items.length,
        totalAvailable,
        totalUnavailable: unavailableItems.length,
        canPlaceOrder: totalAvailable > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};


