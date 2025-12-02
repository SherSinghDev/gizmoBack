let mongoose = require('mongoose')

// const UserSchema = new mongoose.Schema(
//     {
//         // ---------------------
//         // BASIC USER DETAILS
//         // ---------------------
//         name: {
//             type: String,
//             // required: true,
//             trim: true,
//         },

//         email: {
//             type: String,
//             trim: true,
//             lowercase: true,
//             unique: true,
//             sparse: true, // allows nullable unique field
//         },

//         phone: {
//             type: String,
//             required: true,
//             unique: true,
//             trim: true,
//         },

//         password: {
//             type: String,
//         },

//         avatar: {
//             type: String,
//             default: "",
//         },

//         roles: {
//             type: [String],
//             enum: ["buyer", "vendor", "admin"],
//             default: ["buyer"], // Everyone is buyer by default
//         },

//         // ---------------------
//         // VENDOR-SPECIFIC DATA
//         // ---------------------
//         vendorData: {
//             rating: { type: Number, default: 0 },
//             totalRatings: { type: Number, default: 0 },

//             responseTime: { type: String, default: "N/A" }, // e.g. "1 hour", "5 hours"

//             memberSince: { type: Date },

//             totalSales: { type: Number, default: 0 },

//             isVerified: { type: Boolean, default: false },

//             location: { type: String, default: "" },

//             description: { type: String, default: "" },

//             kycStatus: {
//                 type: String,
//                 enum: ["pending", "approved", "rejected"],
//                 default: "pending",
//             },

//             kycDocuments: {
//                 aadharFront: String,
//                 aadharBack: String,
//                 panCard: String,
//                 shopProof: String,
//             },
//         },

//         // ---------------------
//         // BUYER-SPECIFIC DATA
//         // ---------------------
//         buyerData: {
//             addresses: [
//                 {
//                     name: String,
//                     phone: String,
//                     pincode: String,
//                     city: String,
//                     state: String,
//                     addressLine: String,
//                     landmark: String,
//                     isDefault: { type: Boolean, default: false },
//                 },
//             ],

//             preferences: {
//                 favouriteBrands: [String],
//                 savedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
//             },
//         },

//         // ---------------------
//         // ADMIN-SPECIFIC DATA
//         // ---------------------
//         adminData: {
//             permissions: {
//                 manageUsers: { type: Boolean, default: false },
//                 manageProducts: { type: Boolean, default: false },
//                 manageKyc: { type: Boolean, default: false },
//                 manageOrders: { type: Boolean, default: false },
//                 managePayments: { type: Boolean, default: false },
//             },
//         },

//         // ---------------------
//         // SYSTEM FIELDS
//         // ---------------------
//         lastLogin: Date,
//         isBlocked: { type: Boolean, default: false },
//     },
//     { timestamps: true }
// );



const KYCDocumentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            "pan",
            "aadhaar_front",
            "aadhaar_back",
            "business_proof",
            "address_proof",
        ],
        // required: true,
    },
    uri: { type: String },
    uploadedAt: { type: String },
});

const KYCDataSchema = new mongoose.Schema({
    fullName: String,
    businessName: String,
    panNumber: String,
    aadhaarNumber: String,
    businessAddress: String,
    city: String,
    state: String,
    pincode: String,
    documents: [KYCDocumentSchema],
    bankAccountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    gstNumber: String,
    submittedAt: String,
});

const VendorDetailsSchema = new mongoose.Schema({
    businessName: String,
    fullAddress: String,
    city: String,
    state: String,
    pincode: String,
    bankAccountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    gstNumber: String,
    panNumber: String,
    documents: {
        businessProof: String,
        addressProof: String,
        idProof: String,
        panCard: String,
        aadhaarFront: String,
        aadhaarBack: String,
    },
});

const SocialLinksSchema = new mongoose.Schema({
    facebook: { type: String, default: null },
    twitter: { type: String, default: null },
    instagram: { type: String, default: null },
    linkedin: { type: String, default: null },
    website: { type: String, default: null },
});

const AddressSchema = new mongoose.Schema({
    id: String,
    type: String,
    name: String,
    phoneNumber: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    isDefault: { type: Boolean, default: false },
}, { _id: false });

const FavoriteSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    addedAt: { type: String, required: true },
});

const PriceAlertSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    targetPrice: { type: Number, required: true },
    createdAt: { type: String, required: true },
    isActive: { type: Boolean, default: true },
});

const UserSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true },

        // Roles
        roles: {
            type: [String],
            enum: ["buyer", "seller", "admin"],
            default: ["buyer"],
        },
        activeRole: {
            type: String,
            enum: ["buyer", "seller", "admin"],
            default: "buyer",
        },

        // Vendor / Seller registration
        isVendorRegistered: { type: Boolean, default: false },
        vendorDetails: VendorDetailsSchema,

        // KYC
        kycStatus: {
            type: String,
            enum: ["not_submitted", "pending", "approved", "rejected"],
            default: "not_submitted",
        },
        kycSubmittedAt: String,
        kycRejectionReason: String,
        kycData: KYCDataSchema,

        // Profile details
        fullName: String,
        email: String,
        bio: String,
        photoUrl: String,
        socialLinks: SocialLinksSchema,

        // Metadata
        memberSince: { type: String },
        createdAt: { type: Date, default: Date.now },

        // ---------------------
        // BUYER-SPECIFIC DATA
        // ---------------------
        buyerData: {
            addresses: [AddressSchema],
            preferences: {
                favouriteBrands: [String],
                savedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
            },
            favorites: [FavoriteSchema],
            priceAlerts: [PriceAlertSchema],
        },

        // ---------------------
        // ADMIN-SPECIFIC DATA
        // ---------------------
        adminData: {
            permissions: {
                manageUsers: { type: Boolean, default: false },
                manageProducts: { type: Boolean, default: false },
                manageKyc: { type: Boolean, default: false },
                manageOrders: { type: Boolean, default: false },
                managePayments: { type: Boolean, default: false },
            },
        },

        // ---------------------
        // SYSTEM FIELDS
        // ---------------------
        lastLogin: Date,
        isBlocked: { type: Boolean, default: false },
    },
    { timestamps: true }
);




module.exports = mongoose.model("User", UserSchema);
