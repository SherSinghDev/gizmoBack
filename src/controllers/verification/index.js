const router = require("express").Router();
let ProductVerification = require('../../models/verification')
const multer = require("multer");
let dotenv = require("dotenv")
dotenv.config()

const storage = multer.diskStorage({
    destination: "./assets/uploads/verifications",
    filename: (_, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

function auth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    console.log(token);

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch {

        res.json({ message: "Invalid token" });
    }
}

router.post(
    "/photos/:id",
    // auth,
    upload.array("photos", 10),
    async (req, res) => {
        try {
            const { productId, photoTypes } = req.body;
            const sellerId = req.params.id;
            console.log(sellerId);


            if (!req.files || req.files.length === 0) {
                console.log(req.files);
                
                return res.status(400).json({ message: "No photos uploaded" });
            }

            const photos = req.files.map((file, index) => ({
                uri: `./assets/uploads/verifications/${file.filename}`,
                type: photoTypes?.[index] || "unknown",
            }));


            // Save to DB
            const verification = await ProductVerification.create({
                productId,
                sellerId,
                verificationData: {
                    photos,
                },
                photosStatus: 'pending',
                status: "pending",
            });

            res.status(201).json({
                success: true,
                message: "Photos submitted for verification",
                overallScore: req.files.length,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    }
);



// router.post("/verify/authenticity", async (req, res) => {
//     const { productId, imei, serialNumber } = req.body;

//     const checks = {
//         imeiProvided: !!imei,
//         serialProvided: !!serialNumber,
//     };

//     const score =
//         (checks.imeiProvided ? 50 : 0) +
//         (checks.serialProvided ? 50 : 0);

//     await ProductVerification.findOneAndUpdate(
//         { productId },
//         {
//             $set: {
//                 "verificationData.imei": imei,
//                 "verificationData.serialNumber": serialNumber,
//                 "verificationData.authenticity": {
//                     score,
//                     checks,
//                 },
//             },
//         },
//         { upsert: true }
//     );

//     res.json({
//         authenticityScore: score,
//         recommendation:
//             score >= 70 ? "Looks authentic" : "Needs manual review",
//     });
// });


router.post(
    "/authenticity/:id",
    // authMiddleware,
    async (req, res) => {
        try {
            const { productId, imei, serialNumber, purchaseProof } = req.body;
            const sellerId = req.params.id;

            if (!productId) {
                return res.status(400).json({ message: "Product ID is required" });
            }

            let score = 0;
            const checks = {};

            if (imei) {
                checks.imei = true;
                score += 40;
            }

            if (serialNumber) {
                checks.serialNumber = true;
                score += 30;
            }

            if (purchaseProof) {
                checks.purchaseProof = true;
                score += 30;
            }

            let recommendation = "Low authenticity confidence";

            if (score >= 80) recommendation = "High authenticity confidence";
            else if (score >= 50) recommendation = "Medium authenticity confidence";

            const verification = await ProductVerification.findOneAndUpdate(
                { productId, sellerId },

                {
                    $set: {
                        "verificationData.imei": imei,
                        "verificationData.serialNumber": serialNumber,
                        "verificationData.authenticity": {
                            score,
                            checks,
                        },
                        status: "pending",
                        authorityStatus: 'pending'
                    },
                },
                { new: true, upsert: true }
            );

            res.json({
                success: true,
                authenticityScore: score,
                checks,
                recommendation,
                verificationId: verification._id,
            });
        } catch (err) {
            console.error("Authenticity verification error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);



// router.post("/verify/warranty", async (req, res) => {
//     const { productId, warrantyType, warrantyDuration, purchaseDate } =
//         req.body;

//     const isVerified = !!purchaseDate;

//     await ProductVerification.findOneAndUpdate(
//         { productId },
//         {
//             $set: {
//                 "verificationData.warranty": {
//                     type: warrantyType,
//                     duration: warrantyDuration,
//                     purchaseDate,
//                     verified: isVerified,
//                 },
//             },
//         }
//     );

//     res.json({
//         isDocumentVerified: isVerified,
//         warrantyStatus: isVerified ? "Verified" : "Not verified",
//         remainingDays: warrantyDuration || 0,
//     });
// });


// router.post(
//     "/warranty/:id",
//     // authMiddleware,
//     async (req, res) => {
//         try {
//             const {
//                 productId,
//                 warrantyType,
//                 warrantyDuration,
//                 purchaseDate,
//             } = req.body;

//             const sellerId = req.params.id;

//             if (!productId || !warrantyType) {
//                 return res
//                     .status(400)
//                     .json({ message: "Product ID and warranty type are required" });
//             }

//             let warrantyStatus = "not_verified";
//             let remainingDays = 0;
//             let isDocumentVerified = false;

//             if (purchaseDate && warrantyDuration) {
//                 const purchase = new Date(purchaseDate);
//                 const expiry = new Date(purchase);
//                 expiry.setDate(expiry.getDate() + warrantyDuration);

//                 const today = new Date();
//                 remainingDays = Math.max(
//                     Math.ceil((expiry - today) / (1000 * 60 * 60 * 24)),
//                     0
//                 );

//                 if (remainingDays > 0) {
//                     warrantyStatus = "valid";
//                     isDocumentVerified = true;
//                 } else {
//                     warrantyStatus = "expired";
//                 }
//             }

//             const verification = await ProductVerification.findOneAndUpdate(
//                 { productId, sellerId },
//                 {
//                     $set: {
//                         "verificationData.warranty": {
//                             type:warrantyType,
//                             duration:warrantyDuration,
//                             purchaseDate,
//                             varified:isDocumentVerified,
//                             // warrantyStatus,
//                             // isDocumentVerified,
//                         },
//                         status: "pending",
//                     },
//                 },
//                 { new: true, upsert: true }
//             );

//             res.json({
//                 success: true,
//                 warrantyStatus,
//                 remainingDays,
//                 isDocumentVerified,
//                 verificationId: verification._id,
//             });
//         } catch (error) {
//             console.error("Warranty verification error:", error);
//             res.status(500).json({ message: "Server error" });
//         }
//     }
// );



router.post("/warranty/:id", async (req, res) => {
    try {
        const { productId, purchaseDate } = req.body;
        let type = req.body.warrantyType
        let duration = req.body.warrantyDuration
        const sellerId = req.params.id;

        if (!productId || !type) {
            return res.status(400).json({ message: "Product ID and type required" });
        }

        const durationNumber = duration ? Number(duration) : null;

        // let verified = false;

        // if (purchaseDate && durationNumber) {
        //     const purchase = new Date(purchaseDate);
        //     const expiry = new Date(purchase);
        //     expiry.setDate(expiry.getDate() + durationNumber);

        //     verified = expiry > new Date();
        // }

        const verification = await ProductVerification.findOneAndUpdate(
            { productId, sellerId },
            {
                $set: {
                    "verificationData.warranty": {
                        type,
                        duration: durationNumber,
                        purchaseDate,
                        verified: false,
                    },
                    status: "pending",
                    warrantyStatus: "pending"
                },
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            // warrantyStatus: verified ? "valid" : "expired",
            warrantyStatus: "Admin will check the validity",
            isDocumentVerified: false,
        });
    } catch (error) {
        console.error("Warranty error:", error);
        res.status(500).json({ message: "Server error" });
    }
});




router.post("/quality", async (req, res) => {
    const {
        productId,
        photoVerificationScore = 0,
        authenticityScore = 0,
        warrantyVerified,
        condition,
    } = req.body;

    let score =
        photoVerificationScore * 0.4 +
        authenticityScore * 0.4 +
        (warrantyVerified ? 20 : 0);

    score = Math.round(score);

    const badge =
        score >= 85 ? "gold" : score >= 65 ? "silver" : "bronze";

    await ProductVerification.findOneAndUpdate(
        { productId },
        {
            $set: {
                "verificationData.qualityScore": score,
                "verificationData.badge": badge,
            },
        }
    );

    res.json({
        overallScore: score,
        badge,
    });
});






/**
 * Get verification data by productId
 */
router.get("/product/:productId", async (req, res) => {
    try {
        const { productId } = req.params;

        const verification = await ProductVerification.findOne({ productId })
        // .populate("sellerId", "fullName email")
        // .populate("productId", "title brand");

        if (!verification) {
            return res.json({
                success: true,
                verification,
                message: "No verification found for this product",
            });
        }

        return res.status(200).json({
            success: true,
            verification,
        });
    } catch (error) {
        console.error("Fetch verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch verification data",
        });
    }
});


// GET all product verification requests
router.get("/veri", async (req, res) => {
    try {
        const verifications = await ProductVerification.find()
            .populate("sellerId", "fullName email")
            .populate("productId", "title brand")
            .sort({ submittedAt: -1 });

        console.log(verifications);

        res.json({
            success: true,
            verifications,
        });
    } catch (error) {
        console.error("Fetch verifications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch verification requests",
        });
    }
});

router.put(
    "/:id/approve",

    async (req, res) => {
        await ProductVerification.findByIdAndUpdate(req.params.id, {
            status: "verified",
            'verificationData.qualityScore': req.body.qualityScore,
            verifiedAt: new Date(),
        });

        res.json({ message: "Product verified successfully" });
    }
);


router.put(
    "/:id/reject",

    async (req, res) => {
        const { reason } = req.body;

        await ProductVerification.findByIdAndUpdate(req.params.id, {
            status: "rejected",
            rejectionReason: reason,
        });

        res.json({ message: "Verification rejected" });
    }
);

module.exports = router;
