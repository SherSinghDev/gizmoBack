const express = require("express");
const Review = require("../../models/review");
const router = express.Router();

// POST /reviews/add
router.post("/add", async (req, res) => {
    try {
        const { productId, sellerId, userId, userName, rating, comment } = req.body;

        if (!productId || !sellerId || !userId || !rating || !comment) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newReview = await Review.create({
            productId,
            sellerId,
            userId,
            userName,
            rating,
            comment,
        });

        res.status(201).json({
            message: "Review added successfully",
            review: newReview,
        });
    } catch (error) {
        console.error("Add review error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// GET /reviews/all
router.get("/all", async (req, res) => {
    try {
        const { productId } = req.query;

        let filter = {};
        if (productId) {
            filter.productId = productId;
        }

        const reviews = await Review.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            message: "Reviews fetched successfully",
            reviews,
        });
    } catch (error) {
        console.error("Fetch all reviews error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.patch("/respond/:reviewId", async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { sellerId, response } = req.body;

        if (!response || !sellerId) {
            return res.status(400).json({ message: "sellerId and response are required" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        // Ensure the review belongs to this seller
        if (review.sellerId.toString() !== sellerId.toString()) {
            return res.status(403).json({ message: "Unauthorized: Not your review" });
        }

        review.sellerResponse = {
            response,
            respondedAt: new Date().toISOString(),
        };

        await review.save();

        res.status(200).json({
            message: "Seller response added",
            review,
        });
    } catch (error) {
        console.error("Respond to review error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// FLAG a Review
router.put("/flag/:reviewId", async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;

        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            {
                flagged: true,
                flagReason: reason || "No reason provided",
                flaggedAt: new Date(),
            },
            { new: true }
        );

        if (!updatedReview) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.json({
            message: "Review flagged successfully",
            review: updatedReview,
        });
    } catch (error) {
        console.error("Flag review error:", error);
        res.status(500).json({ message: "Failed to flag review" });
    }
});


module.exports = router;
