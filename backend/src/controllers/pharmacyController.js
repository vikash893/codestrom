import { Pharmacy } from '../models/Pharmacy.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';
import { MedicineCatalogue } from '../models/MedicineCatalogue.js';

export const createOrUpdatePharmacy = async (req, res, next) => {
  try {
    const {
      storeName,
      drugLicenseNumber,
      gstin,
      verifiedContactNumber,
      alternateContactNumber,
      address,
      longitude,
      latitude,
      operatingHours,
      serviceRadiusKm,
    } = req.body;

    if (!storeName || !drugLicenseNumber || !verifiedContactNumber || !address || longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Store name, license number, contact number, address, and coordinates (longitude, latitude) are required.',
      });
    }

    const coordinates = [parseFloat(longitude), parseFloat(latitude)];

    let pharmacy = await Pharmacy.findOne({ userId: req.user._id });

    if (pharmacy) {
      pharmacy.storeName = storeName;
      pharmacy.drugLicenseNumber = drugLicenseNumber;
      if (gstin) pharmacy.gstin = gstin;
      pharmacy.verifiedContactNumber = verifiedContactNumber;
      if (alternateContactNumber) pharmacy.alternateContactNumber = alternateContactNumber;
      pharmacy.address = address;
      pharmacy.location = { type: 'Point', coordinates };
      if (operatingHours) pharmacy.operatingHours = operatingHours;
      if (serviceRadiusKm) pharmacy.serviceRadiusKm = serviceRadiusKm;

      await pharmacy.save();
      return res.status(200).json({
        success: true,
        message: 'Pharmacy profile updated successfully.',
        pharmacy,
      });
    }

    pharmacy = await Pharmacy.create({
      userId: req.user._id,
      storeName,
      drugLicenseNumber,
      gstin,
      verifiedContactNumber,
      alternateContactNumber,
      address,
      location: { type: 'Point', coordinates },
      operatingHours: operatingHours || { openTime: '08:00', closeTime: '22:00', is24Hours: false },
      serviceRadiusKm: serviceRadiusKm || 10,
      isVerified: false,
      verificationStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Pharmacy registered. License is pending verification.',
      pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

export const getPharmacy = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.id);
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found.',
      });
    }

    res.status(200).json({
      success: true,
      pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPharmacy = async (req, res, next) => {
  try {
    let pharmacy = await Pharmacy.findOne({ userId: req.user._id });
    if (!pharmacy) {
      pharmacy = await Pharmacy.create({
        userId: req.user._id,
        storeName: 'Apollo City Pharmacy & Medical Store',
        drugLicenseNumber: `DL-${Date.now().toString().slice(-6)}`,
        gstin: '07AAAAA0000A1Z5',
        verifiedContactNumber: req.user.phone || '+919876543210',
        address: {
          street: 'Main Market Road, Health Zone',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
        },
        homeDeliveryAvailable: true,
        deliveryRadiusKm: 12,
        serviceRadiusKm: 12,
        operatingHours: { openTime: '08:00', closeTime: '23:00', is24Hours: false },
        isVerified: true,
        verificationStatus: 'approved',
        isActive: true,
      });

      // Seed starter inventory
      await PharmacyInventory.create([
        {
          pharmacyId: pharmacy._id,
          medicineName: 'Dolo 650mg Tablet',
          genericName: 'Paracetamol',
          brandName: 'Dolo',
          strength: '650mg',
          dosageForm: 'tablet',
          availableQuantity: 45,
          unitPrice: 32.0,
          batchNumber: 'BATCH-DOLO-01',
          stockStatus: 'in_stock',
        },
        {
          pharmacyId: pharmacy._id,
          medicineName: 'Amoxicillin 500mg Capsule',
          genericName: 'Amoxicillin Trihydrate',
          brandName: 'Mox',
          strength: '500mg',
          dosageForm: 'capsule',
          availableQuantity: 30,
          unitPrice: 75.0,
          batchNumber: 'BATCH-AMOX-02',
          stockStatus: 'in_stock',
        },
        {
          pharmacyId: pharmacy._id,
          medicineName: 'Pantoprazole 40mg Tablet',
          genericName: 'Pantoprazole DSR',
          brandName: 'Pan-40',
          strength: '40mg',
          dosageForm: 'tablet',
          availableQuantity: 50,
          unitPrice: 95.0,
          batchNumber: 'BATCH-PAN-03',
          stockStatus: 'in_stock',
        },
        {
          pharmacyId: pharmacy._id,
          medicineName: 'Levocetirizine 5mg Tablet',
          genericName: 'Levocetirizine HCl',
          brandName: 'Levocet',
          strength: '5mg',
          dosageForm: 'tablet',
          availableQuantity: 60,
          unitPrice: 42.0,
          batchNumber: 'BATCH-LEVO-04',
          stockStatus: 'in_stock',
        },
      ]);
    }
    const inventory = await PharmacyInventory.find({ pharmacyId: pharmacy._id }).sort({ medicineName: 1 });
    res.status(200).json({
      success: true,
      pharmacy,
      inventory,
    });
  } catch (error) {
    next(error);
  }
};

export const addInventoryItem = async (req, res, next) => {
  try {
    let pharmacy = await Pharmacy.findOne({ userId: req.user._id });
    if (!pharmacy) {
      pharmacy = await Pharmacy.create({
        userId: req.user._id,
        storeName: 'Apollo City Pharmacy & Medical Store',
        drugLicenseNumber: `DL-${Date.now().toString().slice(-6)}`,
        gstin: '07AAAAA0000A1Z5',
        verifiedContactNumber: req.user.phone || '+919876543210',
        address: {
          street: 'Main Market Road, Health Zone',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
        },
        homeDeliveryAvailable: true,
        deliveryRadiusKm: 12,
        serviceRadiusKm: 12,
        operatingHours: { openTime: '08:00', closeTime: '23:00', is24Hours: false },
        isVerified: true,
        verificationStatus: 'approved',
        isActive: true,
      });
    }

    const {
      medicineName,
      genericName,
      brandName,
      strength,
      dosageForm,
      availableQuantity,
      unitPrice,
      batchNumber,
      expiryDate,
    } = req.body;

    if (!medicineName || availableQuantity === undefined || unitPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name, available quantity, and unit price are required.',
      });
    }

    const qty = parseInt(availableQuantity, 10);
    const stockStatus = qty <= 0 ? 'out_of_stock' : qty <= 10 ? 'low_stock' : 'in_stock';

    // Check if canonical medicine exists in catalogue
    const catalogueMatch = await MedicineCatalogue.findOne({
      canonicalName: medicineName.toUpperCase().trim(),
    });

    const item = await PharmacyInventory.create({
      pharmacyId: pharmacy._id,
      medicineCatalogueId: catalogueMatch ? catalogueMatch._id : undefined,
      medicineName,
      genericName: genericName || (catalogueMatch ? catalogueMatch.genericName : undefined),
      brandName: brandName || (catalogueMatch ? catalogueMatch.brandName : undefined),
      strength: strength || (catalogueMatch ? catalogueMatch.strength : undefined),
      dosageForm: dosageForm || (catalogueMatch ? catalogueMatch.dosageForm : undefined),
      availableQuantity: qty,
      unitPrice: parseFloat(unitPrice),
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      stockStatus,
      isAvailable: qty > 0,
      lastRestockedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added to inventory.',
      item,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'No registered pharmacy found for your account.',
      });
    }

    const item = await PharmacyInventory.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      });
    }

    // Ownership check: must match pharmacy ID
    if (item.pharmacyId.toString() !== pharmacy._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify another pharmacy inventory.',
      });
    }

    const { availableQuantity, unitPrice, isAvailable, batchNumber, expiryDate } = req.body;

    if (availableQuantity !== undefined) {
      const qty = parseInt(availableQuantity, 10);
      item.availableQuantity = qty;
      item.stockStatus = qty <= 0 ? 'out_of_stock' : qty <= 10 ? 'low_stock' : 'in_stock';
      item.isAvailable = qty > 0;
      item.lastRestockedAt = new Date();
    }

    if (unitPrice !== undefined) {
      item.unitPrice = parseFloat(unitPrice);
    }

    if (isAvailable !== undefined) {
      item.isAvailable = isAvailable;
    }

    if (batchNumber !== undefined) item.batchNumber = batchNumber;
    if (expiryDate !== undefined) item.expiryDate = new Date(expiryDate);

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully.',
      item,
    });
  } catch (error) {
    next(error);
  }
};

export const getInventory = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { search, stockStatus, page = 1, limit = 20 } = req.query;

    const filter = { pharmacyId, isAvailable: true };

    if (search) {
      filter.$or = [
        { medicineName: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
      ];
    }

    if (stockStatus) {
      filter.stockStatus = stockStatus;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const items = await PharmacyInventory.find(filter)
      .sort({ medicineName: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await PharmacyInventory.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      items,
    });
  } catch (error) {
    next(error);
  }
};

export const getLowStockAlerts = async (req, res, next) => {
  try {
    let pharmacy = await Pharmacy.findOne({ userId: req.user._id });
    if (!pharmacy) {
      return res.status(200).json({
        success: true,
        count: 0,
        alerts: [],
      });
    }

    const lowStockItems = await PharmacyInventory.find({
      pharmacyId: pharmacy._id,
      $or: [{ availableQuantity: { $lte: 10 } }, { stockStatus: 'low_stock' }, { stockStatus: 'out_of_stock' }],
    }).sort({ availableQuantity: 1 });

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      alerts: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
};
