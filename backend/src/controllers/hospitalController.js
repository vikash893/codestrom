import { Hospital } from '../models/Hospital.js';

export const createOrUpdateHospital = async (req, res, next) => {
  try {
    const {
      hospitalName,
      registrationNumber,
      verifiedEmergencyNumbers,
      regularPhoneNumbers,
      address,
      longitude,
      latitude,
      emergencyDepartmentAvailable,
      traumaCareLevel,
      ambulanceAvailable,
      operatingHours,
    } = req.body;

    if (!hospitalName || !registrationNumber || !verifiedEmergencyNumbers || !address || longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Hospital name, registration number, emergency numbers, address, and coordinates (longitude, latitude) are required.',
      });
    }

    const coordinates = [parseFloat(longitude), parseFloat(latitude)];

    let hospital = await Hospital.findOne({
      $or: [
        ...(req.user ? [{ userId: req.user._id }] : []),
        { registrationNumber },
      ],
    });

    if (hospital) {
      hospital.hospitalName = hospitalName;
      hospital.registrationNumber = registrationNumber;
      hospital.verifiedEmergencyNumbers = verifiedEmergencyNumbers;
      if (regularPhoneNumbers) hospital.regularPhoneNumbers = regularPhoneNumbers;
      hospital.address = address;
      hospital.location = { type: 'Point', coordinates };
      if (emergencyDepartmentAvailable !== undefined) hospital.emergencyDepartmentAvailable = emergencyDepartmentAvailable;
      if (traumaCareLevel) hospital.traumaCareLevel = traumaCareLevel;
      if (ambulanceAvailable !== undefined) hospital.ambulanceAvailable = ambulanceAvailable;
      if (operatingHours) hospital.operatingHours = operatingHours;

      await hospital.save();
      return res.status(200).json({
        success: true,
        message: 'Hospital details updated successfully.',
        hospital,
      });
    }

    hospital = await Hospital.create({
      userId: req.user ? req.user._id : undefined,
      hospitalName,
      registrationNumber,
      verifiedEmergencyNumbers,
      regularPhoneNumbers: regularPhoneNumbers || [],
      address,
      location: { type: 'Point', coordinates },
      emergencyDepartmentAvailable: emergencyDepartmentAvailable !== undefined ? emergencyDepartmentAvailable : true,
      traumaCareLevel: traumaCareLevel || 'General',
      ambulanceAvailable: ambulanceAvailable !== undefined ? ambulanceAvailable : true,
      operatingHours: operatingHours || { is24Hours: true },
      isVerified: false,
      verificationStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Hospital registered successfully. Verification pending administrative approval.',
      hospital,
    });
  } catch (error) {
    next(error);
  }
};

export const getHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found.',
      });
    }

    res.status(200).json({
      success: true,
      hospital,
    });
  } catch (error) {
    next(error);
  }
};

export const listHospitals = async (req, res, next) => {
  try {
    const { emergencyOnly = 'true' } = req.query;
    const filter = { isActive: true };

    if (emergencyOnly === 'true') {
      filter.emergencyDepartmentAvailable = true;
    }

    const hospitals = await Hospital.find(filter).sort({ hospitalName: 1 }).limit(50);

    res.status(200).json({
      success: true,
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    next(error);
  }
};
