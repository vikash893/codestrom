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

