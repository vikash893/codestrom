import { Hospital } from '../models/Hospital.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { DoctorProfile } from '../models/DoctorProfile.js';

export const getNearbyHealthcare = async (req, res, next) => {
  try {
    const { lng, lat, radiusKm = 10, category = 'all' } = req.query;

    if (lng === undefined || lat === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates (lng and lat) are required for nearby discovery.',
      });
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be a valid number between -180 and 180.',
      });
    }

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be a valid number between -90 and 90.',
      });
    }

    const maxDistanceMeters = Math.max(1, parseFloat(radiusKm)) * 1000;
    const centerPoint = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    const results = {
      center: { longitude, latitude },
      radiusKm: parseFloat(radiusKm),
      hospitals: [],
      pharmacies: [],
      doctors: [],
    };

    const geoNearStage = {
      $geoNear: {
        near: centerPoint,
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
      },
    };

    // 1. Discover Nearby Hospitals
    if (['all', 'hospitals'].includes(category)) {
      results.hospitals = await Hospital.aggregate([
        geoNearStage,
        { $match: { isActive: true } },
        {
          $project: {
            hospitalName: 1,
            registrationNumber: 1,
            verifiedEmergencyNumbers: 1,
            regularPhoneNumbers: 1,
            address: 1,
            location: 1,
            emergencyDepartmentAvailable: 1,
            traumaCareLevel: 1,
            operatingHours: 1,
            isVerified: 1,
            distanceMeters: { $round: ['$distanceMeters', 0] },
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 25 },
      ]);
    }

    // 2. Discover Nearby Pharmacies
    if (['all', 'pharmacies'].includes(category)) {
      results.pharmacies = await Pharmacy.aggregate([
        geoNearStage,
        { $match: { isActive: true } },
        {
          $project: {
            storeName: 1,
            drugLicenseNumber: 1,
            verifiedContactNumber: 1,
            alternateContactNumber: 1,
            address: 1,
            location: 1,
            operatingHours: 1,
            isVerified: 1,
            distanceMeters: { $round: ['$distanceMeters', 0] },
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 25 },
      ]);
    }

    // 3. Discover Nearby Doctors
    if (['all', 'doctors'].includes(category)) {
      results.doctors = await DoctorProfile.aggregate([
        geoNearStage,
        {
          $project: {
            fullName: 1,
            specialties: 1,
            qualifications: 1,
            consultationFee: 1,
            consultationModes: 1,
            isAvailable: 1,
            isVerified: 1,
            verifiedPhone: 1,
            clinicAddress: 1,
            location: 1,
            distanceMeters: { $round: ['$distanceMeters', 0] },
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 25 },
      ]);
    }

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
