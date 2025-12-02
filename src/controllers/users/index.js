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




module.exports = router;
