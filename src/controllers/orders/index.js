let express = require('express')
const router = express.Router();
let dotenv = require("dotenv")
let jwt = require('jsonwebtoken');
let User = require('../../models/users')
let Order = require('../../models/orders')
let Transaction = require('../../models/transactions');
const users = require('../../models/users');
const invoices = require('../../models/invoices');
const analytics = require('../../models/analytics');
dotenv.config()


// GET all orders 
router.get("/user", async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error loading user orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load orders",
    });
  }
});


// Create Order

// router.post("/create", async (req, res) => {
//   try {
//     const data = req.body;
//     console.log(data.sellerId);


//     const newOrder = await Order.create({
//       productId: data.productId,
//       buyerId: data.buyerId,
//       sellerId: data.sellerId,
//       amount: data.amount,

//       status: "pending",
//       paymentStatus: "completed",

//       productDetails: data.productDetails,
//       buyerInfo: data.buyerInfo,

//       shippingDetails: data.shippingDetails || null,
//       taxDetails: data.taxDetails || null,
//       platformFeeDetails: data.platformFeeDetails || null,

//       createdAt: new Date(),
//       updatedAt: new Date(),
//     });

//     console.log(data.sellerId);
//     let buyerName = (await users.findById(data.buyerId).select('fullName')).fullName

//     await Transaction.create({
//       transactionId: "T-" + Date.now(),
//       buyerName,
//       platformFee: data.platformFeeDetails.baseFee,
//       orderId: newOrder._id,
//       buyerId: data.buyerId,
//       sellerId: data.sellerId,
//       amount: data.amount,
//       platformFee: data.platformFeeDetails.total || 0,
//       netAmount: data.platformFeeDetails.total ? (data.amount - data.platformFeeDetails.total) : data.amount,
//       paymentMethod: data.selectedMethod,
//       status: "completed",
//     });

//     return res.status(201).json({
//       success: true,
//       order: newOrder,
//     });

//   } catch (error) {
//     console.error("Create Order Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to create order",
//     });
//   }
// });


router.post("/create", async (req, res) => {
  try {
    const data = req.body;

    /* =========================
       1. Create Order
    ========================= */
    const newOrder = await Order.create({
      productId: data.productId,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      amount: data.amount,

      status: "pending",
      paymentStatus: "completed",

      productDetails: data.productDetails,
      buyerInfo: data.buyerInfo,

      shippingDetails: data.shippingDetails || null,
      taxDetails: data.taxDetails || null,
      platformFeeDetails: data.platformFeeDetails || null,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    /* =========================
       2. Create Transaction
    ========================= */
    const buyer = await users.findById(data.buyerId).select("fullName");

    const platformFee = data.platformFeeDetails?.baseFee || 0;
    const gstTotal = data.platformFeeDetails?.gstTotal || 0;

    console.log(data.method);


    const transaction = await Transaction.create({
      transactionId: "T-" + Date.now(),
      buyerName: buyer.fullName,
      orderId: newOrder._id,

      buyerId: data.buyerId,
      sellerId: data.sellerId,

      amount: data.amount,
      platformFee,
      netAmount: data.amount - (platformFee + gstTotal),

      paymentMethod: data.method,
      status: "completed",
    });

    /* =========================
       3. Create Invoice
    ========================= */
    // const now = new Date();
    const now = new Date();

    // Copy of `now` for due date
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // console.log(now);
    // console.log(new Date(now.setDate(now.getDate() + 7)));


    const invoice = await invoices.create({
      invoiceNumber: `INV-${period.replace("-", "")}-${Date.now()}`,
      sellerId: data.sellerId,
      period,

      invoiceType: "seller_settlement",

      amount: data.amount,
      platformFee: platformFee,

      gst: {
        cgst: data.platformFeeDetails?.cgst || 0,
        sgst: data.platformFeeDetails?.sgst || 0,
        igst: data.platformFeeDetails?.igst || 0,
        total: gstTotal,
      },

      netAmount: data.amount - (platformFee + gstTotal),
      currency: "INR",

      transactions: [transaction._id],

      status: "pending",
      issuedAt: now,
      dueAt: dueDate, // 7-day settlement window
    });

    await analytics.create({
      sellerId: data.sellerId,
      productId: data.productId,
      type: "order",
      source: "direct",
    });


    /* =========================
       4. Response
    ========================= */
    return res.status(201).json({
      success: true,
      order: newOrder,
      transaction,
      invoice,
    });

  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
});







// Cancel an order
router.put("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, reason, refundMethod, amount } = req.body;

    const order = await Order.findById(orderId);
    if (!order)
      return res.json({ message: "Order not found" });

    if (order.status === "cancelled")
      return res.json({ message: "Order already cancelled" });

    // Update order
    order.status = "cancelled";
    order.paymentStatus = "refunded";
    order.cancelReason = reason;
    order.cancelledBy = "buyer";
    order.cancelledAt = new Date();

    // Optional: Save refund log
    order.notes.push({
      id: Date.now().toString(),
      orderId,
      userId,
      content: `Cancelled. Refund method: ${refundMethod}. Reason: ${reason}`,
      isInternal: false,
      createdAt: new Date(),
    });

    await order.save();

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Failed to cancel order" });
  }
});


// cancel by seller

// Cancel order route
router.put("/cancel", async (req, res) => {
  try {
    const { orderId, cancelReason, cancelledBy } = req.body;

    if (!orderId || !cancelledBy) {
      return res.status(400).json({
        success: false,
        message: "orderId and cancelledBy are required",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "cancelled",
        cancelReason,
        cancelledBy,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while cancelling order",
      error,
    });
  }
});


// Add a note to order
router.post("/add-note", async (req, res) => {
  try {
    const { orderId, note } = req.body;
    if (!orderId || !note) {
      return res.status(400).json({ message: "Order ID and note are required" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        $push: { notes: note },
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Note added successfully",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Add note error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.put("/update-status/:id", async (req, res) => {
  try {
    const { status, shippingDetails, cancelReason, cancelledBy } = req.body;

    if (!status) {
      return res.json({ message: "Status is required" });
    }

    const updateData = { status };

    // ----------------------------------
    // 📦 SHIPPING DETAILS UPDATE (shipped)
    // ----------------------------------
    if (shippingDetails) {
      updateData.shippingDetails = {
        shipmentId: shippingDetails.shipmentId,
        courierPartner: shippingDetails.courierPartner,
        trackingNumber: shippingDetails.trackingNumber,
        estimatedDelivery: shippingDetails.estimatedDelivery,
        trackingUrl: shippingDetails.trackingUrl,
        shippedAt: new Date().toISOString(),
      };

      // when shipped → update payment status (if required)
      updateData.paymentStatus = "paid";
    }

    // ----------------------------------
    // ❌ CANCEL ORDER (if pending)
    // ----------------------------------
    if (status === "cancelled") {
      updateData.cancelReason = cancelReason || "";
      updateData.cancelledBy = cancelledBy || "system";
      updateData.cancelledAt = new Date().toISOString();
    }

    // ----------------------------------
    // 🟢 CONFIRMED
    // ----------------------------------
    if (status === "confirmed") {
      updateData.paymentStatus = "paid"; // optional
    }

    // ----------------------------------
    // 🟣 DELIVERED
    // ----------------------------------
    if (status === "delivered") {
      let ship = (await Order.findById(req.params.id).select('shippingDetails')).shippingDetails
      // let order = (await Order.findById(req.params.id)).productId
      let { sellerId, productId } = await Order.findById(req.params.id).select('sellerId productId')
      updateData.paymentStatus = "paid";
      updateData.shippingDetails = {
        ...ship,
        deliveredAt: new Date().toISOString(),
      };

      await analytics.create({
        sellerId,
        productId,
        type: "sale",
        source: "direct",
      });

    }

    // console.log(updateData);


    // ----------------------------------
    // 🔄 Update Order
    // ----------------------------------
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(updatedOrder);

  } catch (error) {
    console.error("Update Order Status Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});


// GET seller orders
router.get("/seller/:id", async (req, res) => {
  try {
    const sellerId = req.params.id

    const orders = await Order.find({ sellerId })
      // .populate("buyerId", "name phone")
      // .populate("productId", "title price")
      .sort({ createdAt: -1 });

    // console.log(sellerId);
    // console.log(orders);



    res.status(200).json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Seller orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch seller orders",
    });
  }
});


module.exports = router;
