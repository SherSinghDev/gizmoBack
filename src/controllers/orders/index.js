let express = require('express')
const router = express.Router();
let dotenv = require("dotenv")
let jwt = require('jsonwebtoken');
let User = require('../../models/users')
let Order = require('../../models/orders')
dotenv.config()


// GET all orders of a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ buyerId: userId }).sort({ createdAt: -1 });

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

router.post("/create", async (req, res) => {
  try {
    const data = req.body;
    console.log(data.sellerId);


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

    return res.status(201).json({
      success: true,
      order: newOrder,
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
      updateData.paymentStatus = "paid";
      updateData.shippingDetails = {
        ...ship,
        deliveredAt: new Date().toISOString(),
      };
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


module.exports = router;
