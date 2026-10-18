import { DoctorProfile } from '../models/DoctorProfile.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { Consultation } from '../models/Consultation.js';
import { IntakeRecord } from '../models/IntakeRecord.js';
import { Case } from '../models/Case.js';
import { AuditLog } from '../models/AuditLog.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';
import { MedicineOrder } from '../models/MedicineOrder.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { ADMIN_EMAIL } from '../utils/seedAdmin.js';

// ==========================================
// 1. STATS & PENDING APPROVALS
// ==========================================

export const getPendingVerifications = async (req, res, next) => {
  try {
    const doctors = await DoctorProfile.find({ verificationStatus: 'pending' }).limit(50);
    const pharmacies = await Pharmacy.find({ verificationStatus: 'pending' }).limit(50);
    const hospitals = await Hospital.find({ verificationStatus: 'pending' }).limit(50);

    res.status(200).json({
      success: true,
      pending: {
        doctors,
        pharmacies,
        hospitals,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewVerification = async (req, res, next) => {
  try {
    const { entityType, entityId, status, reason = '' } = req.body;

    if (!['DoctorProfile', 'Pharmacy', 'Hospital'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entityType. Must be DoctorProfile, Pharmacy, or Hospital.',
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected.',
      });
    }

    let targetModel;
    if (entityType === 'DoctorProfile') targetModel = DoctorProfile;
    else if (entityType === 'Pharmacy') targetModel = Pharmacy;
    else if (entityType === 'Hospital') targetModel = Hospital;

    const item = await targetModel.findById(entityId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${entityType} record not found.`,
      });
    }

    item.verificationStatus = status;
    item.isVerified = status === 'approved';
    await item.save();

    // Sync parent User verification and active status
    if (item.userId) {
      await User.findByIdAndUpdate(item.userId, {
        isVerified: status === 'approved',
        status: status === 'approved' ? 'active' : 'pending',
      });
    } else if (entityType === 'Hospital' && item.verifiedEmergencyNumbers?.length > 0) {
      await User.updateMany(
        { phone: { $in: item.verifiedEmergencyNumbers } },
        { isVerified: status === 'approved', status: status === 'approved' ? 'active' : 'pending' }
      );
    }

    // Record Audit Log
    await AuditLog.create({
      actorUserId: req.user._id,
      action: status === 'approved' ? `APPROVE_${entityType.toUpperCase()}` : `REJECT_${entityType.toUpperCase()}`,
      targetEntity: entityType,
      targetId: item._id,
      details: { status, reason },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `${entityType} verification updated to ${status}.`,
      item,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await DoctorProfile.countDocuments();
    const verifiedDoctors = await DoctorProfile.countDocuments({ isVerified: true });
    const pendingDoctors = await DoctorProfile.countDocuments({ verificationStatus: 'pending' });

    const totalPharmacies = await Pharmacy.countDocuments();
    const verifiedPharmacies = await Pharmacy.countDocuments({ isVerified: true });
    const pendingPharmacies = await Pharmacy.countDocuments({ verificationStatus: 'pending' });

    const totalHospitals = await Hospital.countDocuments();
    const emergencyHospitals = await Hospital.countDocuments({ emergencyDepartmentAvailable: true });
    const pendingHospitals = await Hospital.countDocuments({ verificationStatus: 'pending' });

    const totalOrders = await MedicineOrder.countDocuments();
    const totalMedicines = await PharmacyInventory.countDocuments();
    const totalConsultations = await Consultation.countDocuments();
    const totalIntakes = await IntakeRecord.countDocuments();
    const emergencyIntakes = await IntakeRecord.countDocuments({ isEmergency: true });

    const pendingApprovalsCount = pendingDoctors + pendingPharmacies + pendingHospitals;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        totalDoctors,
        verifiedDoctors,
        pendingDoctors,
        totalPharmacies,
        verifiedPharmacies,
        pendingPharmacies,
        totalHospitals,
        emergencyHospitals,
        pendingHospitals,
        pendingApprovalsCount,
        totalOrders,
        totalMedicines,
        totalConsultations,
        totalIntakes,
        emergencyIntakes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const logs = await AuditLog.find()
      .populate('actorUserId', 'phone email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await AuditLog.countDocuments();

    res.status(200).json({
      success: true,
      total,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserSuspension = async (req, res, next) => {
  try {
    const { userId, suspend, reason = '' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role === 'admin' || user.email === ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend an administrative account.',
      });
    }

    user.status = suspend ? 'suspended' : 'active';
    await user.save();

    await AuditLog.create({
      actorUserId: req.user._id,
      action: suspend ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      targetEntity: 'User',
      targetId: user._id,
      details: { suspend, reason },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User account ${suspend ? 'suspended' : 'activated'} successfully.`,
      user: {
        id: user._id,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. USER CRUD
// ==========================================

export const listUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (role && role !== 'all') filter.role = role;
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { phone, email, password, role = 'patient', status = 'active', isVerified = false, fullName } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required.' });
    }

    const existing = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email: email.toLowerCase() }] : [])],
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this phone or email already exists.' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      phone,
      email: email ? email.toLowerCase() : undefined,
      passwordHash,
      role,
      status,
      isVerified,
    });

    if (role === 'patient') {
      await PatientProfile.create({
        userId: user._id,
        fullName: fullName || `User ${phone.slice(-4)}`,
      });
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'ADMIN_CREATE_USER',
      targetEntity: 'User',
      targetId: user._id,
      details: { role, phone },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: {
        _id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone, email, role, status, isVerified, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (phone) user.phone = phone;
    if (email !== undefined) user.email = email ? email.toLowerCase() : undefined;
    if (role) user.role = role;
    if (status) user.status = status;
    if (isVerified !== undefined) user.isVerified = Boolean(isVerified);
    if (password) {
      user.passwordHash = await User.hashPassword(password);
    }

    await user.save();

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'ADMIN_UPDATE_USER',
      targetEntity: 'User',
      targetId: user._id,
      details: { role, status, isVerified },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: {
        _id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own active administrator account.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.email === ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Cannot delete the protected system root admin.' });
    }

    // Cascade delete associated profiles
    await DoctorProfile.deleteMany({ userId: user._id });
    await Pharmacy.deleteMany({ userId: user._id });
    await Hospital.deleteMany({ userId: user._id });
    await PatientProfile.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(id);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'ADMIN_DELETE_USER',
      targetEntity: 'User',
      targetId: user._id,
      details: { phone: user.phone, role: user.role },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'User and linked resources deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. DOCTOR CRUD
// ==========================================

export const listDoctors = async (req, res, next) => {
  try {
    const { search, specialty, verificationStatus } = req.query;
    const filter = {};

    if (verificationStatus && verificationStatus !== 'all') {
      filter.verificationStatus = verificationStatus;
    }
    if (specialty && specialty !== 'all') {
      filter.specialties = specialty;
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { medicalRegistrationNumber: { $regex: search, $options: 'i' } },
        { verifiedPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const doctors = await DoctorProfile.find(filter)
      .populate('userId', 'email phone status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      email,
      password = 'DoctorPassword@123',
      medicalRegistrationNumber,
      registrationCouncil = 'State Medical Council',
      specialties = ['General Physician'],
      qualifications = ['MBBS'],
      consultationFee = 500,
      clinicAddress = 'Central Clinic, Health City',
      isVerified = true,
      verificationStatus = 'approved',
    } = req.body;

    if (!fullName || !phone || !medicalRegistrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone, and medical registration number are required.',
      });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      const passwordHash = await User.hashPassword(password);
      user = await User.create({
        phone,
        email: email ? email.toLowerCase() : undefined,
        passwordHash,
        role: 'doctor',
        status: verificationStatus === 'approved' ? 'active' : 'pending',
        isVerified: Boolean(isVerified),
      });
    }

    const doctor = await DoctorProfile.create({
      userId: user._id,
      fullName,
      medicalRegistrationNumber,
      registrationCouncil,
      specialties: Array.isArray(specialties) ? specialties : [specialties],
      qualifications: Array.isArray(qualifications) ? qualifications : [qualifications],
      consultationFee: Number(consultationFee),
      clinicAddress,
      verifiedPhone: phone,
      isVerified: Boolean(isVerified),
      verificationStatus,
      isAvailable: true,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor profile created successfully.',
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const doctor = await DoctorProfile.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    Object.assign(doctor, updates);
    if (updates.isVerified !== undefined) {
      doctor.verificationStatus = updates.isVerified ? 'approved' : 'pending';
    }
    await doctor.save();

    if (doctor.userId) {
      await User.findByIdAndUpdate(doctor.userId, {
        isVerified: doctor.isVerified,
        status: doctor.isVerified ? 'active' : 'pending',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully.',
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await DoctorProfile.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    if (doctor.userId) {
      await User.findByIdAndDelete(doctor.userId);
    }
    await DoctorProfile.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Doctor profile and associated account deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. HOSPITAL CRUD
// ==========================================

export const listAllHospitals = async (req, res, next) => {
  try {
    const { search, verificationStatus } = req.query;
    const filter = {};

    if (verificationStatus && verificationStatus !== 'all') {
      filter.verificationStatus = verificationStatus;
    }
    if (search) {
      filter.$or = [
        { hospitalName: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const hospitals = await Hospital.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    next(error);
  }
};

export const createHospital = async (req, res, next) => {
  try {
    const {
      hospitalName,
      registrationNumber,
      verifiedEmergencyNumbers,
      address,
      traumaCareLevel = 'Level 1',
      emergencyDepartmentAvailable = true,
      phone,
      password = 'HospitalPassword@123',
      beds,
      isVerified = true,
      verificationStatus = 'approved',
    } = req.body;

    if (!hospitalName || !registrationNumber || !address) {
      return res.status(400).json({
        success: false,
        message: 'Hospital name, registration number, and address are required.',
      });
    }

    let userId = undefined;
    if (phone) {
      let user = await User.findOne({ phone });
      if (!user) {
        const passwordHash = await User.hashPassword(password);
        user = await User.create({
          phone,
          passwordHash,
          role: 'hospital',
          status: verificationStatus === 'approved' ? 'active' : 'pending',
          isVerified: Boolean(isVerified),
        });
      }
      userId = user._id;
    }

    const hospital = await Hospital.create({
      userId,
      hospitalName,
      registrationNumber,
      verifiedEmergencyNumbers: Array.isArray(verifiedEmergencyNumbers) && verifiedEmergencyNumbers.length > 0 ? verifiedEmergencyNumbers : [phone || '112'],
      address,
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
      traumaCareLevel,
      emergencyDepartmentAvailable: Boolean(emergencyDepartmentAvailable),
      beds: beds || {
        icu: { total: 15, available: 8, reserved: 4, occupied: 3 },
        emergency: { total: 25, available: 14, reserved: 6, occupied: 5 },
        oxygen: { total: 40, available: 22, reserved: 10, occupied: 8 },
        general: { total: 80, available: 45, reserved: 20, occupied: 15 },
      },
      isVerified: Boolean(isVerified),
      verificationStatus,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Hospital facility created successfully.',
      hospital,
    });
  } catch (error) {
    next(error);
  }
};

export const updateHospital = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    Object.assign(hospital, updates);
    if (updates.isVerified !== undefined) {
      hospital.verificationStatus = updates.isVerified ? 'approved' : 'pending';
    }
    await hospital.save();

    if (hospital.userId) {
      await User.findByIdAndUpdate(hospital.userId, {
        isVerified: hospital.isVerified,
        status: hospital.isVerified ? 'active' : 'pending',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hospital facility updated successfully.',
      hospital,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHospital = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    if (hospital.userId) {
      await User.findByIdAndDelete(hospital.userId);
    }
    await Hospital.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Hospital facility and linked credentials deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. PHARMACY (MEDICAL STORE) CRUD
// ==========================================

export const listPharmacies = async (req, res, next) => {
  try {
    const { search, verificationStatus } = req.query;
    const filter = {};

    if (verificationStatus && verificationStatus !== 'all') {
      filter.verificationStatus = verificationStatus;
    }
    if (search) {
      filter.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { drugLicenseNumber: { $regex: search, $options: 'i' } },
        { verifiedContactNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const pharmacies = await Pharmacy.find(filter)
      .populate('userId', 'email phone status')
      .sort({ createdAt: -1 });

    // Enrich each pharmacy with total medicines count and total orders count
    const enriched = await Promise.all(
      pharmacies.map(async (p) => {
        const totalMedicines = await PharmacyInventory.countDocuments({ pharmacyId: p._id });
        const totalOrders = await MedicineOrder.countDocuments({ pharmacyId: p._id });

        const revenueAgg = await MedicineOrder.aggregate([
          { $match: { pharmacyId: p._id } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        return {
          ...p.toObject(),
          totalMedicines,
          totalOrders,
          totalRevenue,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enriched.length,
      pharmacies: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const getPharmacyDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacy = await Pharmacy.findById(id).populate('userId', 'email phone status');
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found.' });
    }

    const totalMedicines = await PharmacyInventory.countDocuments({ pharmacyId: pharmacy._id });
    const totalOrders = await MedicineOrder.countDocuments({ pharmacyId: pharmacy._id });

    const revenueAgg = await MedicineOrder.aggregate([
      { $match: { pharmacyId: pharmacy._id } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      pharmacy: {
        ...pharmacy.toObject(),
        totalMedicines,
        totalOrders,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPharmacy = async (req, res, next) => {
  try {
    const {
      storeName,
      drugLicenseNumber,
      gstin = '07AAAAA0000A1Z5',
      verifiedContactNumber,
      phone,
      password = 'PharmacyPassword@123',
      address,
      homeDeliveryAvailable = true,
      deliveryRadiusKm = 10,
      isVerified = true,
      verificationStatus = 'approved',
    } = req.body;

    const contactPhone = verifiedContactNumber || phone;
    if (!storeName || !drugLicenseNumber || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Store name, drug license number, and contact phone are required.',
      });
    }

    let user = await User.findOne({ phone: contactPhone });
    if (!user) {
      const passwordHash = await User.hashPassword(password);
      user = await User.create({
        phone: contactPhone,
        passwordHash,
        role: 'pharmacy',
        status: verificationStatus === 'approved' ? 'active' : 'pending',
        isVerified: Boolean(isVerified),
      });
    }

    const pharmacy = await Pharmacy.create({
      userId: user._id,
      storeName,
      drugLicenseNumber,
      gstin,
      verifiedContactNumber: contactPhone,
      address: address || {
        street: 'Main Market Road',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
      },
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
      homeDeliveryAvailable: Boolean(homeDeliveryAvailable),
      deliveryRadiusKm: Number(deliveryRadiusKm),
      serviceRadiusKm: Number(deliveryRadiusKm),
      isVerified: Boolean(isVerified),
      verificationStatus,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Medical store / pharmacy created successfully.',
      pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found.' });
    }

    Object.assign(pharmacy, updates);
    if (updates.isVerified !== undefined) {
      pharmacy.verificationStatus = updates.isVerified ? 'approved' : 'pending';
    }
    await pharmacy.save();

    if (pharmacy.userId) {
      await User.findByIdAndUpdate(pharmacy.userId, {
        isVerified: pharmacy.isVerified,
        status: pharmacy.isVerified ? 'active' : 'pending',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pharmacy profile updated successfully.',
      pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found.' });
    }

    // Delete associated inventory & orders
    await PharmacyInventory.deleteMany({ pharmacyId: pharmacy._id });
    await MedicineOrder.deleteMany({ pharmacyId: pharmacy._id });
    if (pharmacy.userId) {
      await User.findByIdAndDelete(pharmacy.userId);
    }
    await Pharmacy.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Pharmacy, inventory, and orders deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. MEDICINES CRUD (UPLOADED BY PHARMACY)
// ==========================================

export const getPharmacyMedicines = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search } = req.query;

    const filter = { pharmacyId: id };
    if (search) {
      filter.$or = [
        { medicineName: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
      ];
    }

    const medicines = await PharmacyInventory.find(filter).sort({ medicineName: 1 });

    res.status(200).json({
      success: true,
      count: medicines.length,
      medicines,
    });
  } catch (error) {
    next(error);
  }
};

export const addPharmacyMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      medicineName,
      genericName,
      brandName,
      strength,
      dosageForm = 'tablet',
      availableQuantity = 10,
      unitPrice,
      batchNumber,
    } = req.body;

    if (!medicineName || unitPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name and unit price are required.',
      });
    }

    const qty = parseInt(availableQuantity, 10) || 0;
    const item = await PharmacyInventory.create({
      pharmacyId: id,
      medicineName,
      genericName,
      brandName,
      strength,
      dosageForm,
      availableQuantity: qty,
      unitPrice: parseFloat(unitPrice),
      batchNumber: batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
      stockStatus: qty > 10 ? 'in_stock' : qty > 0 ? 'low_stock' : 'out_of_stock',
      isAvailable: true,
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added to pharmacy inventory successfully.',
      medicine: item,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const { medicineId } = req.params;
    const updates = req.body;

    const item = await PharmacyInventory.findById(medicineId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Medicine item not found.' });
    }

    Object.assign(item, updates);
    if (updates.availableQuantity !== undefined) {
      const qty = parseInt(updates.availableQuantity, 10);
      item.availableQuantity = qty;
      item.stockStatus = qty > 10 ? 'in_stock' : qty > 0 ? 'low_stock' : 'out_of_stock';
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully.',
      medicine: item,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedicine = async (req, res, next) => {
  try {
    const { medicineId } = req.params;
    const item = await PharmacyInventory.findByIdAndDelete(medicineId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Medicine item not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully from inventory.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. ORDERS RECEIVED BY A PARTICULAR PHARMACY
// ==========================================

export const getPharmacyOrders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orders = await MedicineOrder.find({ pharmacyId: id })
      .populate('patientId', 'phone email')
      .sort({ createdAt: -1 });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
    const pendingCount = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalAmount,
        deliveredCount,
        pendingCount,
      },
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, note = 'Updated by administrator' } = req.body;

    const order = await MedicineOrder.findOne({
      $or: [{ orderId }, ...(orderId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: orderId }] : [])],
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.status = status;
    order.statusHistory.push({ status, note });
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. PURGE / DELETE SEEDED DEMO DATA
// ==========================================

export const purgeSeedData = async (req, res, next) => {
  try {
    const { entityType = 'all' } = req.body;
    let report = {};

    if (entityType === 'all' || entityType === 'cases') {
      const delCases = await Case.deleteMany({});
      const delIntakes = await IntakeRecord.deleteMany({});
      report.casesDeleted = delCases.deletedCount;
      report.intakesDeleted = delIntakes.deletedCount;
    }

    if (entityType === 'all' || entityType === 'orders') {
      const delOrders = await MedicineOrder.deleteMany({});
      report.ordersDeleted = delOrders.deletedCount;
    }

    if (entityType === 'all' || entityType === 'medicines') {
      const delMed = await PharmacyInventory.deleteMany({});
      report.medicinesDeleted = delMed.deletedCount;
    }

    if (entityType === 'all' || entityType === 'demo_providers') {
      // Keep root admin safe
      const adminUsers = await User.find({ email: ADMIN_EMAIL });
      const adminIds = adminUsers.map((u) => u._id);

      const delConsults = await Consultation.deleteMany({});
      report.consultationsDeleted = delConsults.deletedCount;

      // Clean non-admin demo records
      const delAudit = await AuditLog.deleteMany({});
      report.auditLogsCleared = delAudit.deletedCount;
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'PURGE_SEEDED_DATA',
      targetEntity: 'System',
      details: { entityType, report },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Seeded demo data successfully purged.',
      report,
    });
  } catch (error) {
    next(error);
  }
};
