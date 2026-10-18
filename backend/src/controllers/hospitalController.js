import { Hospital } from '../models/Hospital.js';
import { Case } from '../models/Case.js';
import { User } from '../models/User.js';

/**
 * Creates or updates a hospital facility.
 */
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
      beds,
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
      if (beds) hospital.beds = { ...hospital.beds, ...beds };

      await hospital.save();
      const statusCode = (req.originalUrl?.includes('register') || req.path?.includes('register')) ? 201 : 200;
      return res.status(statusCode).json({
        success: true,
        message: 'Hospital details registered successfully.',
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
      traumaCareLevel: traumaCareLevel || 'Level 1',
      ambulanceAvailable: ambulanceAvailable !== undefined ? ambulanceAvailable : true,
      operatingHours: operatingHours || { is24Hours: true },
      isVerified: true,
      verificationStatus: 'approved',
    });

    res.status(201).json({
      success: true,
      message: 'Hospital registered successfully.',
      hospital,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns the currently logged in hospital's profile, live bed capacity, and doctor staff.
 * Auto-initializes a default hospital facility if none exists for this user account.
 */
export const getMyHospital = async (req, res, next) => {
  try {
    let hospital = await Hospital.findOne({ userId: req.user._id });

    if (!hospital) {
      // Auto-create default hospital profile for the logged in hospital user
      const user = await User.findById(req.user._id);
      hospital = await Hospital.create({
        userId: req.user._id,
        hospitalName: 'Apex Trauma & Multispecialty Hospital',
        registrationNumber: `HOSP-REG-${Date.now().toString().slice(-6)}`,
        verifiedEmergencyNumbers: [user?.phone || '+911123456789', '112', '108'],
        regularPhoneNumbers: [user?.phone || '+911123456789'],
        address: {
          street: 'Civil Hospital Road, Health City',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
        },
        emergencyDepartmentAvailable: true,
        traumaCareLevel: 'Level 1',
        ambulanceAvailable: true,
        operatingHours: { is24Hours: true },
        isVerified: true,
        verificationStatus: 'approved',
        beds: {
          icu: { total: 15, available: 8, reserved: 4, occupied: 3 },
          emergency: { total: 25, available: 14, reserved: 6, occupied: 5 },
          oxygen: { total: 40, available: 22, reserved: 10, occupied: 8 },
          general: { total: 80, available: 45, reserved: 20, occupied: 15 },
        },
        hospitalDoctors: [
          {
            doctorId: 'DOC-HOSP-01',
            name: 'Dr. R. K. Sharma',
            specialty: 'Cardiology & Emergency',
            qualification: 'MBBS, MD, DM (Cardiology)',
            isOnDuty: true,
            phone: user?.phone || '+919876543210',
            workingHours: '24/7 Trauma Shift',
          },
          {
            doctorId: 'DOC-HOSP-02',
            name: 'Dr. Ananya Sen',
            specialty: 'Emergency & Critical Care',
            qualification: 'MBBS, MD (Emergency Medicine)',
            isOnDuty: true,
            phone: user?.phone || '+919876543210',
            workingHours: '08:00 - 20:00',
          },
          {
            doctorId: 'DOC-HOSP-03',
            name: 'Dr. Vikram Verma',
            specialty: 'General & Trauma Surgery',
            qualification: 'MBBS, MS (General Surgery)',
            isOnDuty: true,
            phone: user?.phone || '+919876543210',
            workingHours: '09:00 - 18:00',
          },
          {
            doctorId: 'DOC-HOSP-04',
            name: 'Dr. Priya Patel',
            specialty: 'Pulmonology & ICU Care',
            qualification: 'MBBS, MD (Pulmonary Medicine)',
            isOnDuty: true,
            phone: user?.phone || '+919876543210',
            workingHours: '10:00 - 19:00',
          },
        ],
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

/**
 * Returns incoming user requests (emergency cases, admission requests, bed inquiries).
 */
export const getHospitalRequests = async (req, res, next) => {
  try {
    let hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) {
      hospital = await Hospital.findOne({ isActive: true });
    }

    // Fetch real cases from Case collection
    const cases = await Case.find({})
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('patientId', 'phone')
      .populate('intakeRecordId');

    const formattedRequests = cases.map((c, idx) => {
      const reservation = hospital?.bedReservations?.find((r) => r.requestId === c.caseId);
      const schedule = hospital?.doctorSchedules?.find((s) => s.requestId === c.caseId);

      let status = 'pending';
      if (reservation) {
        status = reservation.status === 'admitted' ? 'admitted' : 'bed_reserved';
      } else if (schedule) {
        status = 'doctor_scheduled';
      }

      const rawDesc = c.intakeRecordId?.rawDescription || c.patientGuidance || 'Acute condition requiring clinical assessment';

      return {
        requestId: c.caseId,
        patientName: `Patient #${c.caseId.slice(-4)}`,
        patientPhone: c.patientId?.phone || '+919810' + (100000 + idx),
        patientAge: c.intakeRecordId?.patientAge || (30 + (idx * 5) % 40),
        symptoms: rawDesc,
        extractedSymptoms: c.intakeRecordId?.extractedSymptoms || [],
        priority: c.priority || (idx === 0 ? 'P0_EMERGENCY' : 'P1_URGENT'),
        triageLevel: c.triageLevel || (idx === 0 ? 'RED' : 'YELLOW'),
        status,
        reservedBed: reservation ? { bedType: reservation.bedType, bedNumber: reservation.bedNumber, status: reservation.status } : null,
        scheduledDoctor: schedule ? { doctorName: schedule.doctorName, specialty: schedule.specialty, scheduledTime: schedule.scheduledTime } : null,
        createdAt: c.createdAt || new Date(),
      };
    });

    // If no cases exist in DB, provide realistic clinical admission requests for demo
    if (formattedRequests.length === 0) {
      const sampleRequests = [
        {
          requestId: 'REQ-EMG-101',
          patientName: 'Rameshwar Sharma',
          patientPhone: '+919811223344',
          patientAge: 58,
          symptoms: 'Crushing retrosternal chest pain radiating to left arm with diaphoresis (Suspected STEMI)',
          extractedSymptoms: ['chest pain', 'cold sweats', 'shortness of breath'],
          priority: 'P0_EMERGENCY',
          triageLevel: 'RED',
          status: 'pending',
          reservedBed: null,
          scheduledDoctor: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 12),
        },
        {
          requestId: 'REQ-EMG-102',
          patientName: 'Sunita Verma',
          patientPhone: '+919822334455',
          patientAge: 34,
          symptoms: 'Acute respiratory distress with bilateral wheezing; SpO2 dropping to 88% on room air',
          extractedSymptoms: ['wheezing', 'severe breathlessness', 'tachypnea'],
          priority: 'P0_EMERGENCY',
          triageLevel: 'RED',
          status: 'pending',
          reservedBed: null,
          scheduledDoctor: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 25),
        },
        {
          requestId: 'REQ-URG-103',
          patientName: 'Kunal Deshmukh',
          patientPhone: '+919833445566',
          patientAge: 26,
          symptoms: 'Right lower quadrant severe abdominal pain with high fever and vomiting (Suspected Acute Appendicitis)',
          extractedSymptoms: ['abdominal pain', 'fever', 'vomiting'],
          priority: 'P1_URGENT',
          triageLevel: 'YELLOW',
          status: 'pending',
          reservedBed: null,
          scheduledDoctor: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 45),
        },
      ];

      return res.status(200).json({
        success: true,
        count: sampleRequests.length,
        requests: sampleRequests,
      });
    }

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reserves a hospital bed for an incoming patient request.
 */
export const reserveHospitalBed = async (req, res, next) => {
  try {
    const {
      requestId,
      patientName,
      patientPhone,
      patientAge,
      bedType,
      bedNumber,
      notes,
      priority,
    } = req.body;

    if (!bedType || !bedNumber) {
      return res.status(400).json({
        success: false,
        message: 'Bed type (icu, emergency, oxygen, general) and bed number are required.',
      });
    }

    let hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) {
      hospital = await Hospital.findOne({ isActive: true });
    }

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital facility not found.',
      });
    }

    // Check bed availability
    const category = hospital.beds[bedType] || { total: 20, available: 10, reserved: 5, occupied: 5 };
    if (category.available <= 0) {
      return res.status(400).json({
        success: false,
        message: `No available beds remaining in ${bedType.toUpperCase()} ward.`,
      });
    }

    // Decrement available, increment reserved
    category.available = Math.max(0, category.available - 1);
    category.reserved = (category.reserved || 0) + 1;
    hospital.beds[bedType] = category;

    const reservationId = `RES-${Date.now().toString().slice(-6)}`;
    const newReservation = {
      reservationId,
      requestId: requestId || `REQ-${Date.now().toString().slice(-4)}`,
      patientName: patientName || 'Emergency Patient',
      patientPhone: patientPhone || '+919876543210',
      patientAge: Number(patientAge) || 45,
      bedType,
      bedNumber,
      admissionPriority: priority || 'P0 Emergency',
      status: 'reserved',
      notes: notes || 'Bed reserved via Hospital Emergency Portal',
      reservedAt: new Date(),
    };

    hospital.bedReservations.unshift(newReservation);
    hospital.markModified('beds');
    await hospital.save();

    res.status(201).json({
      success: true,
      message: `Bed ${bedNumber} (${bedType.toUpperCase()}) reserved successfully.`,
      reservationId,
      bedNumber,
      bedType,
      beds: hospital.beds,
      reservation: newReservation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Schedules a hospital doctor for an incoming patient request.
 */
export const scheduleHospitalDoctor = async (req, res, next) => {
  try {
    const {
      requestId,
      patientName,
      patientPhone,
      doctorName,
      specialty,
      scheduledTime,
      consultationType,
      priority,
      notes,
    } = req.body;

    if (!doctorName || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Doctor name and scheduled time are required.',
      });
    }

    let hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) {
      hospital = await Hospital.findOne({ isActive: true });
    }

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital facility not found.',
      });
    }

    const scheduleId = `SCHED-${Date.now().toString().slice(-6)}`;
    const newSchedule = {
      scheduleId,
      requestId: requestId || `REQ-${Date.now().toString().slice(-4)}`,
      patientName: patientName || 'Patient',
      patientPhone: patientPhone || '+919876543210',
      doctorName,
      specialty: specialty || 'Emergency & Critical Care',
      scheduledTime,
      consultationType: consultationType || 'Emergency Triage',
      priority: priority || 'Immediate',
      status: 'scheduled',
      notes: notes || 'Scheduled via Hospital Portal',
      scheduledAt: new Date(),
    };

    hospital.doctorSchedules.unshift(newSchedule);
    await hospital.save();

    res.status(201).json({
      success: true,
      message: `${doctorName} scheduled for ${patientName} at ${scheduledTime}.`,
      scheduleId,
      doctorName,
      scheduledTime,
      schedule: newSchedule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates status of a bed reservation (e.g., mark as admitted, discharged, or cancelled).
 */
export const updateBedReservationStatus = async (req, res, next) => {
  try {
    const { reservationId } = req.params;
    const { status } = req.body; // 'admitted' | 'discharged' | 'cancelled'

    let hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) {
      hospital = await Hospital.findOne({ isActive: true });
    }

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    const reservation = hospital.bedReservations.find((r) => r.reservationId === reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }

    const oldStatus = reservation.status;
    const bedType = reservation.bedType;
    const category = hospital.beds[bedType];

    if (category) {
      // Transition logic
      if (oldStatus === 'reserved' && status === 'admitted') {
        category.reserved = Math.max(0, (category.reserved || 1) - 1);
        category.occupied = (category.occupied || 0) + 1;
      } else if (status === 'discharged' || status === 'cancelled') {
        if (oldStatus === 'admitted') {
          category.occupied = Math.max(0, (category.occupied || 1) - 1);
          category.available = (category.available || 0) + 1;
        } else if (oldStatus === 'reserved') {
          category.reserved = Math.max(0, (category.reserved || 1) - 1);
          category.available = (category.available || 0) + 1;
        }
      }
      hospital.beds[bedType] = category;
      hospital.markModified('beds');
    }

    reservation.status = status;
    await hospital.save();

    res.status(200).json({
      success: true,
      message: `Bed reservation status updated to ${status}.`,
      reservation,
      beds: hospital.beds,
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
