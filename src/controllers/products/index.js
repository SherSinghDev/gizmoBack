let express = require('express')
const router = express.Router();
let Product = require('../../models/products')
const multer = require("multer");
const path = require("path");
const users = require('../../models/users');



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
            vendorId:id._id,
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
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product)
            return res.status(404).json({ message: "Product not found" });

        res.json(product);
    } catch (error) {
        console.error("Get Product Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


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

module.exports = router;
