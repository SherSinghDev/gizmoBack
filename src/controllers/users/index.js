let express = require('express');
const users = require('../../models/users');
const router = express.Router();
let jwt = require('jsonwebtoken');
let dayjs = require('dayjs')
const multer = require("multer");
let dotenv = require("dotenv")
dotenv.config()

auth = (roles = []) => {
    return (req, res, next) => {
        try {
            // console.log("auth");

            const token = req.headers.authorization?.split(" ")[1];

            // console.log(token);
            if (!token)
                return res.status(401).json({ message: "Unauthorized: No token" });

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // if (roles.length && !roles.includes(decoded.role)) {
            //     return res.status(403).json({ message: "Permission denied" });
            // }

            next();
        } catch (err) {
            console.log(err);

            return res.status(401).json({ message: "Invalid token" });
        }
    };
};

router.get("/addresses/:userId", auth(), async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await users.findById(userId).select("buyerData.addresses");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            addresses: user.buyerData?.addresses || [],
        });

    } catch (error) {
        console.error("Fetch buyer addresses error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



router.post("/address/add/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const newAddress = req.body;

        const user = await users.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // If new default: remove default from others
        if (newAddress.isDefault) {
            user.buyerData.addresses.forEach(a => (a.isDefault = false));
        }

        user.buyerData.addresses.push(newAddress);
        await user.save();

        res.json({
            success: true,
            addresses: user.buyerData.addresses
        });

    } catch (error) {
        console.error("Add address error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


router.put("/address/update/:userId/:addressId", async (req, res) => {
    try {
        const { userId, addressId } = req.params;
        const updatedData = req.body;

        const user = await users.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Reset default if needed
        if (updatedData.isDefault) {
            user.buyerData.addresses.forEach(a => (a.isDefault = false));
        }

        const index = user.buyerData.addresses.findIndex(a => a.id === addressId);
        if (index === -1) return res.status(404).json({ success: false, message: "Address not found" });

        user.buyerData.addresses[index] = { ...user.buyerData.addresses[index], ...updatedData };

        await user.save();

        res.json({
            success: true,
            addresses: user.buyerData.addresses
        });

    } catch (error) {
        console.error("Update address error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



router.delete("/users/:userId/addresses/:addressId", async (req, res) => {
    try {
        const { userId, addressId } = req.params;

        const user = await users.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Filter out the address
        user.buyerData.addresses = user.buyerData.addresses.filter(
            (addr) => addr.id !== addressId
        );

        await user.save();

        res.json({
            success: true,
            addresses: user.buyerData.addresses,
            message: "Address deleted successfully",
        });
    } catch (error) {
        console.log("Delete address error:", error);
        res.status(500).json({ error: error.message });
    }
});





router.post("/favorites/add", async (req, res) => {
    try {
        // console.log("back");
        const token = req.headers.authorization?.split(" ")[1];

        if (!token)
            return res.status(401).json({ message: "Unauthorized: No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { productId } = req.body;



        const user = await users.findById(decoded.id);
        // console.log(user);

        if (!user) return res.status(404).json({ message: "User not found" });

        const favorites = user.buyerData.favorites;

        // Check if already exists
        const alreadyFav = favorites.some(
            (fav) => fav.productId.toString() === productId
        );
        // console.log(alreadyFav);

        if (alreadyFav)
            return res.json({ message: "Already in favorites" });

        // Insert new favorite
        favorites.push({
            productId,
            addedAt: dayjs().toISOString(),
        });

        await user.save();

        // let product = await product

        res.json({
            message: "Added to favorites",
            favorite: {
                productId,
                addedAt: dayjs().toISOString(),
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/favorites/:productId", async (req, res) => {
    try {

        const { productId } = req.params;

        // console.log("back");
        const token = req.headers.authorization?.split(" ")[1];

        if (!token)
            return res.status(401).json({ message: "Unauthorized: No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log(decoded);



        const user = await users.findById(decoded.id);
        // console.log(user);

        if (!user) return res.json({ message: "User not found" });

        user.buyerData.favorites = user.buyerData.favorites.filter(
            (fav) => fav.productId.toString() !== productId
        );

        // console.log(user);


        await user.save();

        res.json({ message: "Removed from favorites" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/favourite/toggle", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const favorites = user.buyerData.favorites;

        const exists = favorites.some(
            (fav) => fav.productId.toString() === productId
        );

        if (exists) {
            // Remove
            user.buyerData.favorites = favorites.filter(
                (fav) => fav.productId.toString() !== productId
            );
            await user.save();

            return res.json({ message: "Removed from favorites", favorited: false });
        } else {
            // Add
            favorites.push({
                productId,
                addedAt: new Date().toISOString(),
            });

            await user.save();

            return res.json({ message: "Added to favorites", favorited: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get("/favorites/all", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        // console.log(token);

        if (!token)
            return res.json({ message: "Unauthorized: No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log(decoded);

        const user = await users.findById(decoded.id)
        // .populate(
        //     "buyerData.favorites.productId"
        // );
        // console.log(user.buyerData.favorites);


        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user.buyerData.favorites);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/price-alerts", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        // console.log(token);

        if (!token)
            return res.json({ message: "Unauthorized: No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await users.findById(decoded.id).select("buyerData.priceAlerts");

        if (!user) return res.status(404).json({ message: "User not found" });
        // console.log(user);

        return res.json({
            success: true,
            priceAlerts: user.buyerData.priceAlerts || []
        });

    } catch (err) {
        console.error("Error fetching price alerts:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});








router.post("/price-alerts/set", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        // console.log(token);

        if (!token)
            return res.json({ message: "Unauthorized: No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { productId, targetPrice } = req.body;

        if (!productId || !targetPrice) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const user = await users.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        let alerts = user.buyerData.priceAlerts;

        // Check if already exists
        const existing = alerts.find(alert => alert.productId.toString() === productId);

        if (existing) {
            // Update
            existing.targetPrice = targetPrice;
            existing.isActive = true;
        } else {
            // Add new alert
            alerts.push({
                productId,
                targetPrice,
                createdAt: new Date().toISOString(),
                isActive: true,
            });
        }

        await user.save();

        return res.json({
            message: "Price alert saved",
            priceAlerts: user.buyerData.priceAlerts,
        });

    } catch (err) {
        console.error("Price alert error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.delete("/price-alerts/:productId", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        // console.log(token);

        if (!token)
            return res.json({ message: "Unauthorized: No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { productId } = req.params;

        const user = await users.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        let alerts = user.buyerData.priceAlerts;

        // Filter out the alert
        const updatedAlerts = alerts.filter(
            alert => alert.productId.toString() !== productId
        );

        user.buyerData.priceAlerts = updatedAlerts;
        await user.save();

        return res.json({
            message: "Price alert removed",
            priceAlerts: updatedAlerts,
        });

    } catch (err) {
        console.error("Remove alert error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./assets/uploads/profile/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type"), false);
    }
};

let upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});


router.put(
    "/update-profile",

    upload.single("photo"),
    async (req, res) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            // console.log(token);

            if (!token)
                return res.json({ message: "Unauthorized: No token" });

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            const {
                fullName,
                email,
                bio,
                socialLinks
            } = req.body;

            let photoUrl;

            if (req.file) {
                photoUrl = `./assets/uploads/profile/${req.file.filename}`;
            }

            const updateData = {};

            if (fullName) updateData.fullName = fullName;
            if (email) updateData.email = email;
            if (bio) updateData.bio = bio;

            if (socialLinks) {
                updateData.socialLinks = JSON.parse(socialLinks);
            }

            if (photoUrl) updateData.photoUrl = photoUrl;

            const updatedUser = await users.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                user: updatedUser,
            });

        } catch (error) {
            console.error("Profile update error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
);

const storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./assets/uploads/kyc/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const fileFilter1 = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type"), false);
    }
};

let upload1 = multer({
    storage: storage1,    // ✔ Correct key
    fileFilter: fileFilter1, // ✔ Correct key
    limits: { fileSize: 5 * 1024 * 1024 },
});


// Submit KYC
// router.post(
//     "/submit-kyc",
//     upload1.array("documents"),
//     async (req, res) => {
//         try {
//             const {
//                 fullName,
//                 businessName,
//                 panNumber,
//                 aadhaarNumber,
//                 businessAddress,
//                 city,
//                 state,
//                 pincode,
//                 bankAccountNumber,
//                 ifscCode,
//                 accountHolderName,
//                 gstNumber,
//                 submittedAt,
//             } = req.body;

//             console.log(req.body);


//             const documentTypes = req.body.documentTypes; // array
//             const files = req.files; // array of uploaded files
//             console.log(files[0]);

//             // Create mapped document list
//             const documents = files.map((file, index) => ({
//                 type: Array.isArray(documentTypes)
//                     ? documentTypes[index]
//                     : documentTypes,
//                 uri: `./assets/uploads/kyc/${file.filename}`,
//                 uploadedAt: new Date(),
//             }));

//             const kycRecord = {
//                 fullName,
//                 businessName,
//                 panNumber,
//                 aadhaarNumber,
//                 businessAddress,
//                 city,
//                 state,
//                 pincode,
//                 documents,
//                 bankAccountNumber,
//                 ifscCode,
//                 accountHolderName,
//                 gstNumber,
//                 submittedAt,
//                 status: "pending",
//             };

//             // save to DB inside user or separate collection  
//             const userId = req.user?._id || req.body.userId;

//             const updated = await users.findByIdAndUpdate(
//                 userId,
//                 { kycData: kycRecord, kycStatus: "pending" },
//                 { new: true }
//             );

//             return res.json({
//                 message: "KYC submitted",
//                 user: updated,
//             });
//         } catch (err) {
//             console.error("KYC Error:", err);
//             return res.status(500).json({ message: "Server error", err });
//         }
//     }
// );


const QUICK_EKYC_BASE_URL = process.env.QUICK_EKYC_BASE_URL;
const QUICK_EKYC_API_KEY = process.env.QUICK_EKYC_API_KEY;


console.log(QUICK_EKYC_BASE_URL);
console.log(QUICK_EKYC_API_KEY);


const quickEkycFetch = async (endpoint, payload) => {
    const response = await fetch(`${QUICK_EKYC_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
            // Authorization: `Bearer ${QUICK_EKYC_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    console.log(response);


    const data = await response.json();
    console.log(data);

    if (!response.ok) {
        throw new Error(
            data?.message || `Quick eKYC API failed for ${endpoint}`
        );
    }

    return data;
};

const IS_MOCK = process.env.MOCK_EKYC === "true";

/* ---------------- PAN ---------------- */
const verifyPAN = async (panNumber, fullName) => {
    if (IS_MOCK) {
        return {
            status: "VALID",
            pan: panNumber,
            name: fullName,
            message: "Mock PAN verified",
        };
    }

    return quickEkycFetch("/pan/pan", {
        key: QUICK_EKYC_API_KEY,
        id_number: panNumber
    });
};

/* ---------------- Aadhaar ---------------- */
const verifyAadhaar = async (aadhaarNumber) => {
    if (IS_MOCK) {
        return {
            status: "OTP_SENT",
            aadhaar: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
            message: "Mock Aadhaar OTP sent",
            request_id: "mock_aadhaar_req_123",
        };
    }

    return quickEkycFetch("/aadhaar/aadhaar-validation", {
        key: QUICK_EKYC_API_KEY,
        id_number: aadhaarNumber,
    });
};

/* ---------------- Bank ---------------- */
const verifyBank = async (accountNumber, ifsc) => {
    if (IS_MOCK) {
        return {
            status: "VALID",
            account_number: `XXXXXX${accountNumber.slice(-4)}`,
            ifsc,
            account_holder_name: "MOCK ACCOUNT HOLDER",
            message: "Mock bank account verified",
        };
    }

    return quickEkycFetch("/bank-verification", {
        key: QUICK_EKYC_API_KEY,
        id_number: accountNumber,
        ifsc: ifsc
    });
};

/* ---------------- GST ---------------- */
const verifyGST = async (gstNumber) => {
    if (IS_MOCK) {
        return {
            status: "ACTIVE",
            gstin: gstNumber,
            business_name: "MOCK BUSINESS PVT LTD",
            state: "Delhi",
            message: "Mock GST verified",
        };
    }

    return {
        status: "ACTIVE",
        gstin: gstNumber,
        business_name: "MOCK BUSINESS PVT LTD",
        state: "Delhi",
        message: "Mock GST verified",
    };

    // return quickEkycFetch("/gst/verify", {
    //     gstin: gstNumber,
    // });
};



// const verifyPAN = async (panNumber, fullName) => {
//     return quickEkycFetch("/pan/verify", {
//         pan: panNumber,
//         name: fullName,
//     });
// };


// const verifyAadhaar = async (aadhaarNumber) => {
//     return quickEkycFetch("/aadhaar/verify", {
//         aadhaar: aadhaarNumber,
//     });
// };

// const verifyBank = async (accountNumber, ifsc) => {
//     return quickEkycFetch("/bank/verify", {
//         account_number: accountNumber,
//         ifsc,
//     });
// };

// const verifyGST = async (gstNumber) => {
//     return quickEkycFetch("/gst/verify", {
//         gstin: gstNumber,
//     });
// };



router.post(
    "/submit-kyc",
    upload1.array("documents"),
    async (req, res) => {
        try {
            const {
                fullName,
                businessName,
                panNumber,
                aadhaarNumber,
                businessAddress,
                city,
                state,
                pincode,
                bankAccountNumber,
                ifscCode,
                accountHolderName,
                gstNumber,
                submittedAt,
                userId,
                documentTypes,
            } = req.body;

            const files = req.files || [];

            // Map documents
            const documents = files.map((file, index) => ({
                type: Array.isArray(documentTypes)
                    ? documentTypes[index]
                    : documentTypes,
                uri: `/assets/uploads/kyc/${file.filename}`,
                uploadedAt: new Date(),
            }));

            // 🔍 Call Quick eKYC APIs
            const [panResult, bankResult, gstResult] = await Promise.all([
                panNumber ? verifyPAN(panNumber, fullName) : null,
                bankAccountNumber && ifscCode
                    ? verifyBank(bankAccountNumber, ifscCode)
                    : null,
                gstNumber ? verifyGST(gstNumber) : null,
            ]);

            console.log(panResult,bankResult,gstResult);
            

            // Decide KYC status
            const isVerified =
                panResult?.status === "VALID" &&
                bankResult?.status === "VALID";

            const kycRecord = {
                fullName,
                businessName,
                panNumber,
                aadhaarNumber,
                businessAddress,
                city,
                state,
                pincode,
                documents,
                bankAccountNumber,
                ifscCode,
                accountHolderName,
                gstNumber,
                submittedAt,
                status: isVerified ? "approved" : "pending",
                ekycResponse: {
                    pan: panResult,
                    bank: bankResult,
                    gst: gstResult,
                },
            };

            const updatedUser = await users.findByIdAndUpdate(
                userId,
                {
                    kycData: kycRecord,
                    kycStatus: kycRecord.status,
                },
                { new: true }
            );

            return res.json({
                message: "KYC submitted successfully",
                status: kycRecord.status,
                user: updatedUser,
            });
        } catch (err) {
            console.error("KYC Error:", err);
            return res.status(500).json({
                message: "KYC submission failed",
                error: err.message,
            });
        }
    }
);




// GET ALL USERS
router.get("/", async (req, res) => {
    try {
        const Users = await users.find().sort({ createdAt: -1 }); // latest first

        res.status(200).json({
            message: "Users fetched successfully",
            Users,
            stats: {
                total: Users.length,
                buyers: Users.filter(u => u.roles?.includes("buyer")).length,
                sellers: Users.filter(u => u.roles?.includes("seller")).length,
                admins: Users.filter(u => u.roles?.includes("admin")).length,
            },
        });
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});



// GET ALL USERS
// --------------------------------------------------------------------
// router.get("/list", async (req, res) => {
//     try {
//         const users = await User.find().sort({ createdAt: -1 });

//         res.json({
//             success: true,
//             users,
//             stats: {
//                 total: users.length,
//                 buyers: users.filter(u => u.roles?.includes("buyer")).length,
//                 sellers: users.filter(u => u.roles?.includes("seller")).length,
//                 admins: users.filter(u => u.roles?.includes("admin")).length,
//             },
//         });
//     } catch (error) {
//         console.error("Fetch Users Error:", error);
//         res.status(500).json({ success: false, message: "Failed to load users" });
//     }
// });

// --------------------------------------------------------------------
// TOGGLE USER STATUS
// --------------------------------------------------------------------
router.patch("/toggle-status/:id", async (req, res) => {
    try {
        const { isActive } = req.body;

        const updated = await users.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true }
        );

        res.json({ success: true, user: updated });
    } catch (error) {
        console.error("Toggle Status Error:", error);
        res.status(500).json({ success: false, message: "Failed to update user status" });
    }
});

// --------------------------------------------------------------------
// CHANGE USER ROLE
// --------------------------------------------------------------------
router.patch("/change-role/:id", async (req, res) => {
    try {
        const { newRole } = req.body;

        const updated = await users.findByIdAndUpdate(
            req.params.id,
            {
                roles: [newRole],
                activeRole: newRole,
            },
            { new: true }
        );

        console.log(updated);


        res.json({ success: true, user: updated });
    } catch (error) {
        console.error("Change Role Error:", error);
        res.status(500).json({ success: false, message: "Failed to change role" });
    }
});


// routes/adminKyc.js
router.get("/kyc", async (req, res) => {
    try {
        const { status } = req.query;

        const filter = {
            kycStatus: { $in: ["pending", "approved", "rejected"] },
        };

        if (status) filter.kycStatus = status;

        const user = await users.find(filter)
            .select("fullName email phone kycStatus kycData kycSubmittedAt")
            .sort({ kycSubmittedAt: -1 });

        const formatted = user.map(u => ({
            id: u._id,
            userId: u._id,
            status: u.kycStatus,
            submittedAt: u.kycSubmittedAt,
            kyc: u.kycData,
        }));

        res.json({ success: true, kyc: formatted });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch KYC list" });
    }
});


router.put("/kyc/approve/:userId", async (req, res) => {
    try {
        const user = await users.findByIdAndUpdate(
            req.params.userId,
            {
                kycStatus: "approved",
                kycRejectionReason: null,
                isActive: true,
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ success: true, message: "KYC approved" });
    } catch (err) {
        res.status(500).json({ message: "KYC approval failed" });
    }
});


router.put("/kyc/reject/:userId", async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason)
            return res.status(400).json({ message: "Rejection reason required" });

        const user = await users.findByIdAndUpdate(
            req.params.userId,
            {
                kycStatus: "rejected",
                kycRejectionReason: reason,
                isActive: false,
            },
            { new: true }
        );

        res.json({ success: true, message: "KYC rejected" });
    } catch (err) {
        res.status(500).json({ message: "KYC rejection failed" });
    }
});

module.exports = router;
