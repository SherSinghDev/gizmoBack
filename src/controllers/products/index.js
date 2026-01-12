let express = require('express')
const router = express.Router();
let Product = require('../../models/products')
let ProductView = require('../../models/productview')
const multer = require("multer");
const path = require("path");
const users = require('../../models/users');
let mongoose = require('mongoose');
const products = require('../../models/products');
const analytics = require('../../models/analytics');



// Storage in local uploads folder
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./assets/uploads/products/");
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


/**
 * CREATE PRODUCT
 */
router.post("/add", upload.array("images", 10), async (req, res) => {
    try {
        let imageUrls = [];

        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map((file) => `./assets/uploads/products/${file.filename}`);
        } else {
            return res.status(400).json({ message: "Images are required" });
        }

        const {
            title,
            category,
            subcategory,
            brand,
            model,
            price,
            condition,
            description,
            location,
            city,
            state,
            vendorId,
            stockQuantity,
            lowStockThreshold,
            specifications,
            // venderId
        } = req.body;

        console.log(vendorId);

        let id = await users.findById(JSON.parse(vendorId)).select('_id')
        console.log(id);


        const product = new Product({
            title,
            category,
            subcategory,
            brand,
            model,
            price,
            condition,
            description,
            location,
            city,
            state,
            // vendorId,
            stockQuantity,
            lowStockThreshold,
            images: imageUrls,
            vendorId: id._id,
            specifications: specifications ? JSON.parse(specifications) : {},
        });

        await product.save();
        console.log(product);


        res.status(201).json({
            message: "Product created successfully",
            product,
        });
    } catch (error) {
        console.error("Add Product Error:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

/**
 * UPDATE PRODUCT
 */
// router.put("/update/:id", upload.array("images", 10), async (req, res) => {
//     try {
//         let updatedImages = [];

//         if (req.files && req.files.length > 0) {
//             updatedImages = req.files.map(
//                 (file) =>
//                     `${req.protocol}://${req.get("host")}/uploads/products/${file.filename}`
//             );
//         }

//         const updateData = { ...req.body };

//         if (updatedImages.length > 0) {
//             updateData.images = updatedImages;
//         }

//         if (req.body.specifications) {
//             updateData.specifications = JSON.parse(req.body.specifications);
//         }

//         const product = await Product.findByIdAndUpdate(
//             req.params.id,
//             updateData,
//             { new: true }
//         );

//         if (!product) return res.status(404).json({ message: "Product not found" });

//         res.json({ message: "Product updated", product });
//     } catch (error) {
//         console.error("Update Product Error:", error);
//         res.status(500).json({ message: "Server error", error });
//     }
// });

/**
 * DELETE PRODUCT
 */
router.delete("/delete/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product)
            return res.status(404).json({ message: "Product not found" });

        res.json({ message: "Product deleted" });
    } catch (error) {
        console.error("Delete Product Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET ALL PRODUCTS (with filters)
 */
router.get("/all", async (req, res) => {
    try {
        const { category, brand, city, state, search, minPrice, maxPrice } = req.query;

        let filter = {};

        if (category) filter.category = category;
        if (brand) filter.brand = brand;
        if (city) filter.city = city;
        if (state) filter.state = state;

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        if (search) {
            filter.$or = [
                { title: new RegExp(search, "i") },
                { brand: new RegExp(search, "i") },
                { model: new RegExp(search, "i") },
            ];
        }

        const products = await Product.find(filter).sort({ createdAt: -1 });

        res.json({ count: products.length, products });
    } catch (error) {
        console.error("Get All Products Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET SINGLE PRODUCT
 */
// router.get("/:id", async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id);

//         if (!product)
//             return res.status(404).json({ message: "Product not found" });

//         res.json(product);
//     } catch (error) {
//         console.error("Get Product Error:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// });


// Update

router.put("/update/:id", upload.array("images", 10), async (req, res) => {
    try {
        let images = [];
        let updatedImages = [];
        // 2. If new files are uploaded → merge with existing images
        if (req.files && req.files.length > 0) {
            const newImageUrls = req.files.map(
                (file) => `./assets/uploads/products/${file.filename}`
            );
            updatedImages = [...updatedImages, ...newImageUrls];
        }

        // let prevImage = await Product.findById(req.params.id).select('images')
        // console.log(prevImage.images);
        console.log(updatedImages);

        const updateData = {
            ...req.body,
            images: [...updatedImages],
        };

        // Parse specifications JSON
        if (req.body.specifications) {
            updateData.specifications = JSON.parse(req.body.specifications);
        }
        // Build update object
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({
            message: "Product updated successfully",
            product: updatedProduct,
        });

    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).json({ message: "Server error", error });
    }
});



// Update product status
router.put("/status/:id", async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !["available", "unavailable"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({
            success: true,
            message: "Product status updated successfully",
            product: updatedProduct,
        });

    } catch (error) {
        console.error("Status update error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



// router.put("/:id/view", async (req, res) => {
//     try {
//         const product = await Product.findByIdAndUpdate(
//             req.params.id,
//             { $inc: { views: 1 } }, // ✅ atomic increment
//             { new: true }
//         );

//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found" });
//         }

//         res.json({
//             success: true,
//             views: product.views,
//         });
//     } catch (error) {
//         console.error("Increment view error:", error);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// });

router.put("/:id/view", async (req, res) => {
    try {
        console.log(req.body);

        const productId = req.params.id;
        const userId = req.body.id || null; // from auth if logged in
        const sessionId = req.headers["x-session-id"] || null;
        const ipAddress = req.ip;
        const platform = req.headers["x-platform"] || "web";

        // ✅ Start of today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ✅ Prevent duplicate views (per day)
        const alreadyViewed = await ProductView.findOne({
            productId,
            $or: [
                { userId: userId },
                { sessionId: sessionId },
                { ipAddress: ipAddress },
            ],
            viewedAt: { $gte: today },
        });

        if (alreadyViewed) {
            return res.json({ success: true, skipped: true });
        }

        // ✅ Save view record
        await ProductView.create({
            productId,
            userId,
            sessionId,
            ipAddress,
            platform,
        });

        // ✅ Increment total views
        await Product.findByIdAndUpdate(productId, {
            $inc: { views: 1 },
        });

        let product = await products.findById(productId)


        // when product page is viewed
        let ana = await analytics.create({
            sellerId: product.vendorId,
            productId,
            type: "view",
            source: "search" // or direct / ads / share
        });
        console.log(ana);
        res.json({ success: true });
    } catch (error) {
        console.error("Track view error:", error);
        res.status(500).json({ success: false });
    }
});

// GET all analytics events (optionally filtered by seller)
router.get("/events", async (req, res) => {
  try {
    const { sellerId, productId, type, from, to } = req.query;

    const filter = {};

    if (sellerId) filter.sellerId = sellerId;
    if (productId) filter.productId = productId;
    if (type) filter.type = type;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const events = await analytics.find()
    //   .populate("productId", "name price")
    //   .populate("sellerId", "name email")
      .sort({ createdAt: -1 });

    // console.log(events);
    

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics events",
    });
  }
});


/**
 * GET total viewed products count for a user
 * /api/products/viewed-count/:userId
 */
router.get("/viewed-count/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // ✅ Count DISTINCT products viewed by user
        const count = await ProductView.distinct("productId", {
            userId,
        });

        res.json({
            userId,
            viewedProductsCount: count.length,
        });
    } catch (error) {
        console.error("Viewed count error:", error);
        res.status(500).json({ message: "Server error" });
    }
});



/**
 * GET low stock alerts for a seller
 * GET /api/inventory/low-stock/:sellerId
 */
router.get('/low-stock/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: 'Invalid sellerId' });
        }

        // find products for seller where stock <= threshold OR stock === 0
        const products = await Product.find({
            vendorId: sellerId,
        }).select('title stockQuantity lowStockThreshold price images city state vendorId createdAt');

        const alerts = [];

        let criticalCount = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalValue = 0; // value of units to restock (rough)



        products.forEach((p) => {
            console.log(p.stockQuantity, p.lowStockThreshold);
            const currentStock = p.stockQuantity ?? 0;
            const threshold = p.lowStockThreshold ?? 1;

            // Determine status
            let status = null;
            if (currentStock <= 0) {
                status = 'out-of-stock';
                outOfStockCount++;
            } else if (currentStock <= Math.floor(threshold * 0.4)) {
                status = 'critical';
                criticalCount++;
            } else if (currentStock <= threshold) {
                status = 'low';
                lowStockCount++;
            }

            console.log(status);


            if (status) {
                // recommendedRestockQuantity: bring stock up to 2*threshold (simple heuristic)
                const recommended = Math.max(0, threshold * 2 - currentStock);
                const lastRestocked = p.updatedAt || p.createdAt || new Date().toISOString();

                // value: price * recommended units (if price available)
                if (p.price && recommended > 0) {
                    totalValue += p.price * recommended;
                }

                alerts.push({
                    productId: p._id,
                    productTitle: p.title,
                    images: p.images || [],
                    currentStock,
                    lowStockThreshold: threshold,
                    recommendedRestockQuantity: recommended,
                    lastRestocked,
                    status,
                });
            }
        });

        const response = {
            alerts,
            count: alerts.length,
            criticalCount,
            lowStockCount,
            outOfStockCount,
            totalValue, // raw amount in currency (e.g. INR)
        };

        res.json(response);
    } catch (err) {
        console.error('Low stock alerts error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * PUT update product stock
 * PUT /api/products/:id/update-stock
 * Body: { stockQuantity: Number, lowStockThreshold?: Number }
 */
router.put('/products/:id/update-stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { stockQuantity, lowStockThreshold } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product id' });
        }

        const update = {};
        if (typeof stockQuantity === 'number') update.stockQuantity = stockQuantity;
        if (typeof lowStockThreshold === 'number') update.lowStockThreshold = lowStockThreshold;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: 'No update fields provided' });
        }

        const product = await Product.findByIdAndUpdate(id, update, { new: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        res.json({ message: 'Product stock updated', product });
    } catch (err) {
        console.error('Update stock error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.put("/products/:id", async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ success: true, product: updated });
    } catch (err) {
        console.error("Update product error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;
