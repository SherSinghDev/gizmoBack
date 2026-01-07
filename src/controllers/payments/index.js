const router = require("express").Router();
const Payment = require("../../models/payment");
// const auth = require("../middlewares/auth");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
let dotenv = require("dotenv")
dotenv.config()
const Razorpay = require("razorpay");



const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});




const auth = (roles = []) => {
    // allow single role as string
    if (typeof roles === "string") roles = [roles];

    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "Unauthorized: Token missing" });
            }

            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            /**
             * decoded should contain:
             * {
             *   id: user._id,
             *   role: 'admin' | 'seller' | 'user',
             *   email: '',
             * }
             */
            req.user = {
                id: decoded.id,
                role: decoded.role,
                email: decoded.email,
            };

            // ✅ Role-based access (optional)
            if (roles.length > 0 && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: "Permission denied" });
            }

            next();
        } catch (error) {
            console.error("Auth error:", error.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    };
};

// router.post("/create", auth(), async (req, res) => {
//     try {
//         console.log(req.user);

//         const { amount, method, sellerId, orderTempData } = req.body;

//         const payment = await Payment.create({
//             paymentId: "PAY_" + crypto.randomBytes(6).toString("hex"),
//             buyerId: req.user.id,
//             sellerId,
//             amount,
//             method,
//             orderTempData,
//             status: "created",
//         });

//         // 🔹 Simulate payment success
//         setTimeout(async () => {
//             payment.status = "success";
//             await payment.save();
//         }, 1200);

//         res.json({
//             success: true,
//             paymentId: payment.paymentId,
//             status: "success",
//         });
//     } catch (err) {
//         console.error("Create Payment Error:", err);
//         res.status(500).json({ message: "Payment failed" });
//     }
// });

router.post("/create", auth(), async (req, res) => {
    try {
        const { amount, method, sellerId, orderTempData } = req.body;

        // 1️⃣ Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100, // INR → paise
            currency: "INR",
            receipt: "rcpt_" + crypto.randomBytes(6).toString("hex"),
        });

        // 2️⃣ Create payment entry in DB
        const payment = await Payment.create({
            paymentId: razorpayOrder.id,
            buyerId: req.user.id,
            sellerId,
            amount,
            method,
            orderTempData,
            status: "created",
            gateway: "RazorPay"
        });

        console.log(razorpayOrder);


        res.json({
            success: true,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error("Create Payment Error:", err);
        res.status(500).json({ message: "Payment creation failed" });
    }
});


router.post("/verify", auth(), async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        // Update payment status
        await Payment.findOneAndUpdate(
            { paymentId: razorpay_order_id },
            {
                status: "success",
                razorpayPaymentId: razorpay_payment_id,
            }
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Verify Payment Error:", err);
        res.status(500).json({ message: "Payment verification failed" });
    }
});


module.exports = router;
