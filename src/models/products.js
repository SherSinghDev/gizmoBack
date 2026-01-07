let mongoose = require('mongoose')

const SpecificationSchema = new mongoose.Schema(
  {
    ram: String,
    storage: String,
    battery: String,
    camera: String,
    processor: String,
    screen: String,
    warranty: String,
    accessories: [String],
    displayType: String,
    graphics: String,
    ports: [String],
    connectivity: [String],
    audioFeatures: [String],
    noiseCancellation: String,
    batteryLife: String,
    resolution: String,
    refreshRate: String,

    // allow any custom spec key
    // Mongoose allows arbitrary keys when strict: false
  },
  { _id: false, strict: false }
);

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      // enum: ["Mobiles", "Laptops", "Tablets", "Accessories", "Others","Smart Watches"],
    },

    subcategory: {
      type: String,
      required: true,
    },

    brand: {
      type: String,
      required: true,
    },

    model: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    originalPrice: {
      type: Number,
    },

    condition: {
      type: String,
      required: true,
      enum: ["Excellent", "Good", "Fair", "Poor"],
    },

    description: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    postedDate: {
      type: Date,
      default: Date.now,
    },

    views: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["available", "sold", "reserved","unavailable"],
      default: "available",
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,
      // type:String
    },

    specifications: {
      type: SpecificationSchema,
      default: {},
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    stockQuantity: {
      type: Number,
      default: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports =  mongoose.model("Product", ProductSchema);
