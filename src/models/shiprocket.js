let mongoose = require("mongoose");

const shiprocketOrderSchema = new mongoose.Schema(
    {
        /* ---------------- BASIC REFERENCES ---------------- */
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // required: true,
        },

        pickupPincode: String,
        deliveryPincode: String,

        internalOrderId: {
            type: String, // Your app order ID
            // required: true,
            index: true,
        },

        awbCode: String,
        shipmentId: Number,
        orderId: Number,

        /* ---------------- SHIPROCKET IDS ---------------- */
        shiprocket: {
            orderId: Number,
            shipmentId: Number,
            awbCode: String,
            courierCompanyId: Number,
            courierName: String,
        },

        /* ---------------- ORDER DETAILS ---------------- */
        orderDetails: {
            orderDate: Date,
            paymentMethod: {
                type: String,
                enum: ["Prepaid", "COD"],
            },
            subTotal: Number,
            weight: Number,
            dimensions: {
                length: Number,
                breadth: Number,
                height: Number,
            },
        },

        /* ---------------- PICKUP & DELIVERY ---------------- */
        pickup: {
            location: String,
            pincode: String,
            city: String,
            state: String,
            country: {
                type: String,
                default: "India",
            },
        },

        delivery: {
            customerName: String,
            phone: String,
            email: String,
            address: String,
            city: String,
            state: String,
            pincode: String,
            country: {
                type: String,
                default: "India",
            },
        },

        /* ---------------- ITEMS ---------------- */
        items: [
            {
                name: String,
                sku: String,
                units: Number,
                sellingPrice: Number,
                discount: Number,
                tax: Number,
            },
        ],

        /* ---------------- COURIER SELECTION ---------------- */
        courier: {
            name: String,
            id: Number,
            rate: Number,
            etd: String,
            rating: Number,
            pickupPerformance: Number,
            deliveryPerformance: Number,
        },

        /* ---------------- TRACKING ---------------- */
        tracking: {
            currentStatus: {
                type: String,
                default: "NEW",
            },
            currentStatusId: Number,
            estimatedDeliveryDate: String,
            lastLocation: String,

            history: [
                {
                    status: String,
                    statusId: Number,
                    location: String,
                    date: Date,
                },
            ],
        },

        /* ---------------- DOCUMENTS ---------------- */
        documents: {
            labelUrl: String,
            invoiceUrl: String,
            manifestUrl: String,
        },

        /* ---------------- COD / RTO ---------------- */
        cod: {
            collectableAmount: Number,
            remitted: {
                type: Boolean,
                default: false,
            },
        },

        rto: {
            initiated: {
                type: Boolean,
                default: false,
            },
            delivered: {
                type: Boolean,
                default: false,
            },
        },

        /* ---------------- STATUS ---------------- */
        status: {
            type: String,
            enum: [
                "NEW",
                "AWB_ASSIGNED",
                "PICKED_UP",
                "IN_TRANSIT",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED",
                "RTO_INITIATED",
                "RTO_DELIVERED",
            ],
            default: "NEW",
            index: true,
        },

        /* ---------------- RAW SHIPROCKET RESPONSE ---------------- */
        rawResponse: {
            createOrder: Object,
            assignAwb: Object,
            webhookEvents: [Object],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ShiprocketOrder", shiprocketOrderSchema);
