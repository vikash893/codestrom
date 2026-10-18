import crypto from 'crypto';
import { MedicineOrder } from '../models/MedicineOrder.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';
import { Notification } from '../models/Notification.js';
import { emitToUser } from '../config/socket.js';

export const createOrder = async (req, res, next) => {
  try {
    const {
      pharmacyId,
      items,
      deliveryType = 'home_delivery',
      deliveryAddress,
      paymentMethod = 'cash_on_delivery',
    } = req.body;

    const validItems = Array.isArray(items)
      ? items.filter((it) => it && (it.medicineName || it.name))
      : [];

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine item is required to place an order.',
      });
    }

    if (deliveryType === 'home_delivery') {
      if (!deliveryAddress?.street || !deliveryAddress?.city || !deliveryAddress?.contactPhone) {
        return res.status(400).json({
          success: false,
          message: 'Street address, city, and contact phone are required for home delivery.',
        });
      }
    }

    let pharmacy = null;
    if (pharmacyId && typeof pharmacyId === 'string' && pharmacyId.match(/^[0-9a-fA-F]{24}$/)) {
      pharmacy = await Pharmacy.findById(pharmacyId);
    }
    if (!pharmacy) {
      pharmacy = await Pharmacy.findOne({ isActive: true });
    }
    if (!pharmacy) {
      return res.status(400).json({
        success: false,
        message: 'No active pharmacy available to process this order.',
      });
    }

    // STRICT INVENTORY AVAILABILITY CHECK:
    // Verify each item actually exists in this pharmacy's inventory with sufficient stock!
    let totalAmount = 0;
    const sanitizedItems = [];
    const inventoryUpdates = [];

    for (const item of validItems) {
      const name = (item.medicineName || item.name || 'Prescribed Medicine').trim();
      const generic = (item.genericName || item.generic_name || name).trim();
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);

      let inv = null;
      if (item.inventoryId && typeof item.inventoryId === 'string' && item.inventoryId.match(/^[0-9a-fA-F]{24}$/)) {
        inv = await PharmacyInventory.findOne({
          _id: item.inventoryId,
          pharmacyId: pharmacy._id,
          isAvailable: true,
        });
      }

      if (!inv) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        inv = await PharmacyInventory.findOne({
          pharmacyId: pharmacy._id,
          isAvailable: true,
          $or: [
            { medicineName: new RegExp(escaped, 'i') },
            { genericName: new RegExp(escaped, 'i') },
            { brandName: new RegExp(escaped, 'i') },
          ],
        });
      }

      // Check stock availability
      if (!inv || inv.availableQuantity < qty) {
        const currentStock = inv ? inv.availableQuantity : 0;
        return res.status(400).json({
          success: false,
          message: `Availability check failed: "${name}" is currently ${currentStock === 0 ? 'out of stock' : 'under-stocked'} at ${pharmacy.storeName}. Requested: ${qty}, Available: ${currentStock}.`,
          unavailableItem: {
            name,
            genericName: generic,
            requestedQuantity: qty,
            availableQuantity: currentStock,
          },
        });
      }

      const unitPrice = inv.unitPrice || Math.max(0, parseFloat(item.unitPrice || item.price) || 50);
      totalAmount += qty * unitPrice;

      sanitizedItems.push({
        medicineName: inv.medicineName || name,
        genericName: inv.genericName || generic,
        quantity: qty,
        unitPrice,
        inventoryId: inv._id,
      });

      inventoryUpdates.push({
        invDoc: inv,
        deductQty: qty,
      });
    }

    // Deduct stock atomically now that all items are verified available
    for (const update of inventoryUpdates) {
      const { invDoc, deductQty } = update;
      invDoc.availableQuantity = Math.max(0, invDoc.availableQuantity - deductQty);
      if (invDoc.availableQuantity === 0) {
        invDoc.stockStatus = 'out_of_stock';
      } else if (invDoc.availableQuantity < 10) {
        invDoc.stockStatus = 'low_stock';
      }
      await invDoc.save();
    }

    const generatedOrderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const order = await MedicineOrder.create({
      orderId: generatedOrderId,
      patientId: req.user._id,
      pharmacyId: pharmacy._id,
      items: sanitizedItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      deliveryType,
      deliveryAddress: {
        street: deliveryAddress?.street || pharmacy.address?.street || 'Local Delivery',
        city: deliveryAddress?.city || pharmacy.address?.city || 'Delhi',
        state: deliveryAddress?.state || pharmacy.address?.state || 'Delhi',
        postalCode: deliveryAddress?.postalCode || pharmacy.address?.postalCode || '110001',
        contactPhone: deliveryAddress?.contactPhone || req.user.phone,
        patientName: deliveryAddress?.patientName || req.user.name || 'Patient',
        instructions: deliveryAddress?.instructions || '',
      },
      paymentMethod,
      status: 'placed',
      statusHistory: [
        {
          status: 'placed',
          timestamp: new Date(),
          note: `Order placed for ${deliveryType === 'home_delivery' ? 'Home Delivery' : 'Store Pickup'}`,
        },
      ],
      estimatedDeliveryMinutes: deliveryType === 'home_delivery' ? 40 : 15,
    });

    // Notify Pharmacy
    if (pharmacy.userId) {
      await Notification.create({
        userId: pharmacy.userId,
        title: 'New Medicine Home Delivery Order!',
        message: `Order ${order.orderId} received for ₹${order.totalAmount}. Destination: ${order.deliveryAddress.street}, ${order.deliveryAddress.city}.`,
        category: 'order',
        metadata: { orderId: order._id },
      });

      emitToUser(pharmacy.userId, 'new_medicine_order', {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
        deliveryAddress: order.deliveryAddress,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Medicine order placed successfully! The pharmacy has been notified.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientOrders = async (req, res, next) => {
  try {
    const orders = await MedicineOrder.find({ patientId: req.user._id })
      .populate('pharmacyId', 'storeName verifiedContactNumber address')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getPharmacyOrders = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findOne({ userId: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy profile not found for this account.',
      });
    }

    const { status } = req.query;
    const filter = { pharmacyId: pharmacy._id };
    if (status) {
      filter.status = status;
    }

    const orders = await MedicineOrder.find(filter)
      .populate('patientId', 'phone name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const pharmacy = await Pharmacy.findOne({ userId: req.user._id });
    if (!pharmacy && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only registered pharmacies can update medicine delivery order statuses.',
      });
    }

    const order = await MedicineOrder.findOne({
      $or: [{ orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Order updated to ${status.replace(/_/g, ' ')}`,
    });

    await order.save();

    // Real-time tracking notification to Patient
    emitToUser(order.patientId, 'order_status_updated', {
      orderId: order.orderId,
      status: order.status,
      note,
      updatedAt: new Date(),
    });

    await Notification.create({
      userId: order.patientId,
      title: `Order Update: ${status.replace(/_/g, ' ').toUpperCase()}`,
      message: `Your medicine order ${order.orderId} is now ${status.replace(/_/g, ' ')}.`,
      category: 'order',
      metadata: { orderId: order._id, status },
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    next(error);
  }
};
