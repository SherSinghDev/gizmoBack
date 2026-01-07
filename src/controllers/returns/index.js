const express = require("express");
const router = express.Router();
const ReturnRequest = require("../../models/returnrequest");
const Order = require("../../models/orders");

// Create return request
router.post("/create", async (req, res) => {
    try {
        const {
            orderId,
            buyerId,
            sellerId,
            reason,
            description,
            requestedAction,
            refundAmount,
        } = req.body;

        // console.log(req.body);


        // Validate required fields
        if (
            !orderId ||
            !buyerId ||
            !sellerId ||
            !reason ||
            !description ||
            !requestedAction
        ) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }

        // Optional: Ensure order exists
        const orderExists = await Order.findById(orderId);
        if (!orderExists) {
            return res.status(404).json({ message: "Order not found" });
        }

        const newReturn = await ReturnRequest.create({
            orderId,
            buyerId,
            sellerId,
            reason,
            description,
            requestedAction,
            refundAmount: refundAmount || null,
            // notes: notes || "",
            status: "pending", // default
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        res.status(201).json({
            message: "Return request created successfully",
            returnRequest: newReturn,
        });
    } catch (error) {
        console.error("Return Request Error:", error);
        res.status(500).json({
            message: "Failed to create return request",
            error,
        });
    }
});

// Get all return requests
router.get("/all", async (req, res) => {
    try {
        const returnRequests = await ReturnRequest.find().sort({ createdAt: -1 });

        res.status(200).json({
            message: "All return requests fetched successfully",
            returnRequests,
        });
    } catch (error) {
        console.error("Fetch Returns Error:", error);
        res.status(500).json({
            message: "Failed to fetch return requests",
            error,
        });
    }
});

// Update return status
router.put("/update-status/:returnId", async (req, res) => {
    try {
        const { returnId } = req.params;
        const { status, notes, refundAmount } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const updatedReturn = await ReturnRequest.findByIdAndUpdate(
            returnId,
            {
                status,
                notes,
                refundAmount,
                updatedAt: new Date(),
            },
            { new: true }
        );

        if (!updatedReturn) {
            return res.status(404).json({ message: "Return request not found" });
        }

        res.status(200).json({
            message: "Return status updated successfully",
            returnRequest: updatedReturn,
        });
    } catch (error) {
        console.error("Update Return Status Error:", error);
        res.status(500).json({
            message: "Failed to update return status",
            error,
        });
    }
});

module.exports = router;
