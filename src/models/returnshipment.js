let mongoose = require('mongoose')

const ReturnShipmentSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        shipmentId: String,
        orderRef: String,
        awb: String,
        courier: String,
        status: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("ReturnShipment", ReturnShipmentSchema);
