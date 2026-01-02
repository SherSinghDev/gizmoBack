let express = require("express");
const router = express.Router();
let { checkServiceability, createOrder, assignAWB, getPickupLocations, registerPickupLocation } = require('../../services/shiprocket')
let Shipment = require('../../models/shiprocket')
let Order = require('../../models/orders')
let dotenv = require('dotenv')
let ReturnShipment = require('../../models/returnshipment')
dotenv.config()
let getShiprocketToken = require("../../utils/shiprocketToken");
const baseURL = process.env.SHIPROCKET_BASE_URL;

router.post("/serviceability", async (req, res) => {
    // console.log(req.body);

    try {
        let couriers = await checkServiceability({
            pickup_postcode: +req.body.pickupPincode,
            delivery_postcode: +req.body.deliveryPincode,
            weight: req.body.weight,
            cod: req.body.cod ? 1 : 0,
            returned: req.body?.returned || false
        });

        // console.log(couriers);


        // const MOCK_COURIERS = [
        //     {
        //         courier_company_id: 1,
        //         courier_name: "Delhivery Surface",
        //         rate: 85,
        //         estimated_delivery_days: 4,
        //         etd: "4-5 Days",
        //         cod: 0,
        //         prepaid: 1,
        //         rating: 4.5,
        //     },
        //     {
        //         courier_company_id: 2,
        //         courier_name: "Blue Dart Express",
        //         rate: 140,
        //         estimated_delivery_days: 2,
        //         etd: "2-3 Days",
        //         cod: 0,
        //         prepaid: 1,
        //         rating: 4.8,
        //     },
        //     {
        //         courier_company_id: 3,
        //         courier_name: "Ecom Express",
        //         rate: 95,
        //         estimated_delivery_days: 3,
        //         etd: "3-4 Days",
        //         cod: 1,
        //         prepaid: 1,
        //         rating: 4.3,
        //     },
        // ];

        // console.log(couriers);
        if (!couriers) {
            couriers = {
                success: false,
                message: "No Courier Available"
            }
        }

        res.json(couriers);
    } catch (err) {
        console.log(err);

        res.json({ message: "Serviceability failed", err });
    }
});
// router.post("/create-shipment", async (req, res) => {
//     try {
//         const {
//             courierCompanyId,
//             courierName,
//             rate,
//             etd,
//             shipmentData,
//             seller
//         } = req.body;

//         console.log(shipmentData);


//         // 1️⃣ Create Order
//         const orderRes = await createOrder(shipmentData);
//         console.log("res",orderRes);
//         // console.log(orderRes.data.data);

//         // 2️⃣ Assign AWB
//         const awbRes = await assignAWB(
//             orderRes.shipment_id,
//             courierCompanyId
//         );

//         console.log(awbRes.response.data.shipped_by);

//         if (!awbRes.awb_assign_status) {
//             throw new Error("AWB assignment failed");
//         }

//         // 3️⃣ Save to DB
//         const shipment = await Shipment.create({
//             orderId: orderRes.order_id,
//             shipmentId: orderRes.shipment_id,
//             awbCode: awbRes.response.data.awb_code,

//             courier: {
//                 id: courierCompanyId,
//                 name: courierName,
//                 rate,
//                 etd,
//             },

//             pickupPincode: shipmentData.pickup_postcode,
//             deliveryPincode: shipmentData.billing_pincode,
//             // userId: req.user._id,
//         });

//         res.json(shipment);
//     } catch (err) {
//         console.log(err);

//         res.status(500).json({
//             message: "Shipment creation failed",
//             error: err.message,
//         });
//     }
// });

router.post("/create-shipment", async (req, res) => {
    try {
        const {
            courierCompanyId,
            courierName,
            rate,
            etd,
            shipmentData,
            seller, // 👈 full pickup object from frontend
        } = req.body;


        let pickup = {
            name: `${seller.email}_address`,
            contactName: seller.fullName,
            phone: seller.phone,
            email: seller.email || 'example@example.com',
            address: seller.kycData.businessAddress,
            city: seller.kycData.city,
            state: seller.kycData.state,
            pincode: seller.kycData.pincode
        }


        // 1️⃣ Check existing pickup locations
        const pickups = await getPickupLocations();
        // console.log(pickups);


        const pickupExists = pickups.shipping_address.some(
            (p) => p.pickup_location === pickup.name
        );

        // 2️⃣ Register pickup if not exists
        if (!pickupExists) {
            console.log("Registering new pickup location...");
            await registerPickupLocation(pickup);
        }

        // 3️⃣ Assign pickup location to shipment payload
        shipmentData.pickup_location = pickup.name;

        // 4️⃣ Create order
        const orderRes = await createOrder(shipmentData);

        // console.log(orderRes);
        // 5️⃣ Assign AWB
        const awbRes = await assignAWB(
            orderRes.shipment_id,
            courierCompanyId
        );

        if (!awbRes.awb_assign_status) {
            throw new Error("AWB assignment failed");
        }



        // 6️⃣ Save to DB
        const shipment = await Shipment.create({
            orderId: orderRes.order_id,
            shipmentId: orderRes.shipment_id,
            awbCode: awbRes.response.data.awb_code,

            courier: {
                id: courierCompanyId,
                name: courierName,
                rate,
                etd,
            },

            pickupLocation: pickup.name,
            pickupPincode: pickup.pincode,
            deliveryPincode: shipmentData.billing_pincode,
        });
        // console.log(shipment);


        res.json(shipment)
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "Shipment creation failed",
            error: err.message,
        });
    }
});

router.get("/track/:awb", async (req, res) => {
    try {
        const { awb } = req.params;
        const token = await getShiprocketToken();

        const response = await fetch(
            `${baseURL}/courier/track/awb/${awb}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        // if (!response.ok) {
        //     throw new Error("Tracking failed");
        // }

        const data = await response.json();
        // console.log(data);

        if (!data.tracking_data) {
            return res.json({
                success: false,
                message: data.message
            })
        }

        res.json({
            success: true,
            tracking: data,
            // tracking: {
            //     tracking_data: {
            //         track_status: 1,               // 1 = tracking active
            //         shipment_status: 7,            // 7 = Delivered (Shiprocket standard)

            //         shipment_track: [
            //             {
            //                 id: 1102937666,
            //                 awb_code: "JH023186161IN",
            //                 courier_company_id: 24,
            //                 order_id: 1106574061,
            //                 pickup_date: "2026-01-02 10:15:00",
            //                 delivered_date: "2026-01-06 14:42:00",
            //                 weight: "0.5",
            //                 packages: 1,
            //                 current_status: "Delivered",
            //                 delivered_to: "Customer",
            //                 destination: "Bangalore",
            //                 consignee_name: "Rahul Sharma",
            //             }
            //         ],

            //         shipment_track_activities: [
            //             {
            //                 date: "2026-01-02 10:15:00",
            //                 status: "Pickup Scheduled",
            //                 activity: "Pickup scheduled by courier",
            //                 location: "Delhi",
            //             },
            //             {
            //                 date: "2026-01-02 16:40:00",
            //                 status: "Picked Up",
            //                 activity: "Shipment picked up",
            //                 location: "Delhi",
            //             },
            //             {
            //                 date: "2026-01-03 09:30:00",
            //                 status: "In Transit",
            //                 activity: "Shipment in transit to destination hub",
            //                 location: "Delhi Hub",
            //             },
            //             {
            //                 date: "2026-01-05 21:10:00",
            //                 status: "Reached Destination Hub",
            //                 activity: "Shipment reached Bangalore hub",
            //                 location: "Bangalore Hub",
            //             },
            //             {
            //                 date: "2026-01-06 08:50:00",
            //                 status: "Out For Delivery",
            //                 activity: "Shipment out for delivery",
            //                 location: "Bangalore",
            //             },
            //             {
            //                 date: "2026-01-06 14:42:00",
            //                 status: "Delivered",
            //                 activity: "Shipment delivered successfully",
            //                 location: "Bangalore",
            //             }
            //         ],

            //         track_url: "https://shiprocket.co/tracking/JH023186161IN",
            //         etd: "2026-01-06 16:29:55",
            //         qc_response: "",
            //         is_return: false,
            //         order_tag: ""
            //     }
            // }
        });
    } catch (err) {
        console.error("Tracking error:", err);

        res.status(500).json({
            success: false,
            message: "Unable to fetch tracking data",
            error: err.message,
        });
    }
});


router.post("/label", async (req, res) => {
    try {
        const { shipmentId } = req.body;


        if (!shipmentId) {
            return res.status(400).json({ message: "Shipment ID required" });
        }

        const token = await getShiprocketToken();

        // Generate label
        const response = await fetch(
            `${baseURL}/courier/generate/label`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    shipment_id: [shipmentId],
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data?.label_url) {
            throw new Error("Label generation failed");
        }



        await Shipment.findOneAndUpdate(
            { shipmentId },
            {
                $set: {
                    "documents.labelUrl": data.label_url,
                },
            }
        );

        res.json({
            success: true,
            labelUrl: data.label_url,
        });
    } catch (err) {
        console.error("Label error:", err);

        res.status(500).json({
            success: false,
            message: "Unable to generate label",
            error: err.message,
        });
    }
});


router.post("/invoice", async (req, res) => {
    try {
        const { shipmentId } = req.body;



        if (!shipmentId) {
            return res.status(400).json({ message: "Shipment ID required" });
        }

        const token = await getShiprocketToken();

        let order = await Shipment.findOne({ shipmentId }).select('orderId')
        let orderId = order.orderId

        const response = await fetch(`${baseURL}/orders/print/invoice`, {
            method: "POST", // ✅ MUST be POST
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ids: [orderId] // ✅ must be in body
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Shiprocket error: ${errorText}`);
        }

        const data = await response.json();

        const invoiceUrl = data?.invoice_url;

        if (!invoiceUrl) {
            throw new Error("Invoice URL not received from Shiprocket");
        }

        res.json({ invoiceUrl });
    } catch (err) {
        console.error("Invoice error:", err.message);

        res.status(500).json({
            message: "Failed to fetch invoice",
            error: err.message,
        });
    }
});


router.post("/cancel", async (req, res) => {
    try {
        const { awb } = req.body;
        if (!awb) {
            return res.status(400).json({
                success: false,
                message: "Shiprocket awb required",
            });
        }

        // console.log(awb);


        const token = await getShiprocketToken();

        const response = await fetch(`${baseURL}/orders/cancel/shipment/awbs`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                awbs: [awb], // ✅ THIS IS THE KEY
            }),
        });

        const data = await response.json();
        // console.log(data);


        if (!response.ok || data?.status === 0) {
            return res.status(400).json({
                success: false,
                message: data?.message || "Cancellation failed",
                shiprocketResponse: data,
            });
        }

        return res.json({
            success: true,
            message: "Shipment cancelled successfully",
            shiprocketResponse: data,
        });
    } catch (err) {
        console.error("Cancel shipment error:", err.message);

        res.status(500).json({
            success: false,
            message: "Failed to cancel shipment",
            error: err.message,
        });
    }
});


// router.post("/create-return", async (req, res) => {
//     try {
//         const { orderId, seller } = req.body;

//         if (!orderId) {
//             return res.status(400).json({ message: "Order ID required" });
//         }

//         // 1️⃣ Fetch original order from DB
//         const order = await Order.findById(orderId);

//         if (!order || !order.shippingDetails?.trackingNumber) {
//             return res.status(400).json({
//                 message: "Original shipment not found",
//             });
//         }

//         const token = await getShiprocketToken();

//         // 2️⃣ Build return payload
//         const returnPayload = {
//             order_id: `RET-${order._id}`,
//             order_date: new Date().toISOString().slice(0, 10),

//             pickup_customer_name: order.buyerInfo.name,
//             pickup_address: order.buyerInfo.address,
//             pickup_city: order.buyerInfo.city,
//             pickup_state: order.buyerInfo.state,
//             pickup_pincode: order.buyerInfo.pincode,
//             pickup_country: "India",
//             pickup_phone: order.buyerInfo.phone,

//             shipping_customer_name: seller.kycData.fullName,
//             shipping_address: seller.kycData.businessAddress,
//             shipping_city: seller.kycData.city,
//             shipping_state: seller.kycData.state,
//             shipping_pincode: seller.kycData.pincode,
//             shipping_country: "India",
//             shipping_phone: seller.phone,

//             payment_method: "Prepaid",
//             total_discount: 0,
//             sub_total: order.amount,

//             length: 10,
//             breadth: 10,
//             height: 5,
//             weight: 0.5,

//             order_items: [
//                 {
//                     name: order.productDetails.title,
//                     sku: order.productId.toString(),
//                     units: 1,
//                     selling_price: order.amount,
//                 },
//             ],
//         };

//         // 3️⃣ Create return order
//         const response = await fetch(
//             `${baseURL}/orders/create/return`,
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify(returnPayload),
//             }
//         );

//         const data = await response.json();

//         console.log(data);


//         if (!response.ok) {
//             throw new Error(data?.message || "Return creation failed");
//         }

//         // 4️⃣ Save return shipment info
//         order.returnShipment = {
//             shiprocketOrderId: data.order_id,
//             shipmentId: data.shipment_id,
//             awb: data.awb_code,
//             status: "RETURN_CREATED",
//         };

//         await order.save();

//         console.log(order);


//         res.json({
//             success: true,
//             message: "Return shipment created",
//             data,
//         });
//     } catch (err) {
//         console.error("Return creation error:", err.message);

//         res.status(500).json({
//             success: false,
//             message: "Failed to create return shipment",
//             error: err.message,
//         });
//     }
// });


// router.post("/track-return", async (req, res) => {
//     try {
//         const { shipmentId } = req.body;

//         if (!shipmentId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "shipmentId required",
//             });
//         }

//         const token = await getShiprocketToken();

//         const response = await fetch(
//             `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`,
//             {
//                 method: "GET",
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//             }
//         );

//         const data = await response.json();
//         console.log(data);


//         if (!response.ok) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Tracking failed",
//                 error: data,
//             });
//         }

//         res.json({
//             success: true,
//             data,
//         });
//     } catch (err) {
//         console.error("Track return error:", err);
//         res.status(500).json({
//             success: false,
//             message: "Server error",
//         });
//     }
// });



router.post("/create-return", async (req, res) => {
    try {

        let {
            orderId,
            seller,
            courierCompanyId,
            courierName,
            rate,
            weight,
        } = req.body

        // console.log(orderId,seller);


        if (!orderId || !seller) {
            return res.status(400).json({
                success: false,
                message: "orderId and seller details required",
            });
        }

        // 🔐 Shiprocket Token
        const token = await getShiprocketToken();

        // 🧾 Fetch your order from DB
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // 📦 RETURN ORDER PAYLOAD
        const payload = {
            order_id: `RET-${order._id}`,
            order_date: new Date().toISOString().split("T")[0],

            channel_id: "", // leave empty unless channel integrated

            pickup_customer_name: order.buyerInfo.name,
            pickup_last_name: "",
            pickup_address: order.buyerInfo.address,
            pickup_address_2: "",
            pickup_city: order.buyerInfo.city,
            pickup_state: order.buyerInfo.state,
            pickup_country: "India",
            pickup_pincode: order.buyerInfo.pincode,
            pickup_email: order.buyerInfo.email || "support@usedgizmo.com",
            pickup_phone: order.buyerInfo.phone,

            shipping_customer_name: seller.fullName || "Seller",
            shipping_last_name: "",
            shipping_address: seller.kycData.businessAddress,
            shipping_address_2: "",
            shipping_city: seller.kycData.city,
            shipping_state: seller.kycData.state,
            shipping_country: "India",
            shipping_pincode: seller.kycData.pincode,
            shipping_email: seller.email || 'example@example.com',
            shipping_phone: seller.phone,

            order_items: [
                {
                    name: order.productDetails.title,
                    sku: order.productDetails._id,
                    units: 1,
                    selling_price: order.amount,
                },
            ],

            payment_method: "Prepaid",
            sub_total: order.amount,
            length: 10,
            breadth: 10,
            height: 10,
            weight,
            is_return: 1,
        };

        // 🚚 CREATE RETURN ORDER
        const createRes = await fetch(
            "https://apiv2.shiprocket.in/v1/external/orders/create/return",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        const createData = await createRes.json();

        // console.log(createData);


        if (!createRes.ok) {
            return res.status(400).json({
                success: false,
                message: "Return order creation failed",
                shiprocket: createData,
            });
        }

        // 4️⃣ Save return shipment info
        order.returnShipment = {
            shiprocketOrderId: createData.order_id,
            shipmentId: createData.shipment_id,
            // awb: awbData.response.data.awb_code,
            status: "RETURN_CREATED",
        };

        await order.save();

        // console.log(order);

        // 🧾 ASSIGN AWB
        const awbRes = await fetch(
            "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courier_id: courierCompanyId,
                    is_return: 1,
                    shipment_id: createData.shipment_id,
                }),
            }
        );

        const awbData = await awbRes.json();
        // console.log(awbData);

        if (!awbRes.ok) {
            return res.status(400).json({
                success: false,
                message: "AWB assignment failed",
                shiprocket: awbData,
            });
        }



        // 💾 SAVE RETURN SHIPMENT
        await ReturnShipment.create({
            orderId,
            shipmentId: createData.shipment_id,
            orderRef: createData.order_id,
            awb: awbData.awb_code,
            courier: awbData.courier_name,
            status: "return_initiated",
        });



        return res.json({
            success: true,
            message: "Return pickup scheduled successfully",
            shipmentId: createData.shipment_id,
            awb: awbData.awb_code,
            courier: awbData.courier_name,
        });
    } catch (err) {
        console.error("Create return error:", err);
        res.status(500).json({
            success: false,
            message: "Server error while creating return",
        });
    }
});

router.post("/track-return", async (req, res) => {
    try {
        const { shipmentId } = req.body;

        const token = await getShiprocketToken();

        const response = await fetch(
            `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`,
            {
                method: "Get",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                // body: JSON.stringify({ shipment_id: shipmentId }),
                redirect: 'follow'
            }
        );

        const data = await response.json();
        console.log(data);


        if (!response.ok) {
            return res.status(400).json({
                success: false,
                message: "Tracking failed",
                error: data,
            });
        }

        res.json({
            success: true,
            tracking: data,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Tracking error",
        });
    }
});






module.exports = router;
