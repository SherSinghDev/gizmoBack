// routes/billing.js
const express = require("express");
const router = express.Router();
const Transaction = require("../../models/transactions");
const Invoice = require("../../models/invoices");
const Payout = require("../../models/payouts");
const User = require("../../models/users");
// const auth = require("../middlewares/auth"); // adapt to your auth middleware
const dayjs = require("dayjs");
const jwt = require("jsonwebtoken");
let dotenv = require("dotenv");
const mongoose = require("mongoose");
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



// List transactions: GET /api/billing/transactions?sellerId=&limit=&skip=
router.get("/transactions", auth(), async (req, res) => {
    try {
        const { sellerId, limit = 50, skip = 0 } = req.query;
        const filter = {};
        if (sellerId) filter.sellerId = sellerId;
        console.log(req.user);

        // If not admin and no sellerId, use current user
        if (!req.user?.roles?.includes("admin") && !sellerId) filter.sellerId = req.user.id;

        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip))
            .lean();

        res.json(transactions);
    } catch (err) {
        console.error("List transactions error:", err);
        res.status(500).json({ message: "Failed to list transactions" });
    }
});

// List invoices: GET /api/billing/invoices?sellerId=
router.get("/invoices", auth(), async (req, res) => {
    try {
        const { sellerId, limit = 50, skip = 0 } = req.query;
        const filter = {};
        if (sellerId) filter.sellerId = sellerId;
        if (!req.user?.roles?.includes("admin") && !sellerId) filter.sellerId = req.user.id;

        const invoices = await Invoice.find(filter)
            .populate({
                path: "transactions",
                model: "Transaction",
                // select: "amount status createdAt", // optional if you want specific fields
            })
            .sort({ issuedAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip))
            .lean();

        res.json(invoices);
    } catch (err) {
        console.error("List invoices error:", err);
        res.status(500).json({ message: "Failed to list invoices" });
    }
});

// List payouts: GET /api/billing/payouts?sellerId=
router.get("/payouts", auth(), async (req, res) => {
    try {
        const { sellerId, limit = 50, skip = 0 } = req.query;
        const filter = {};
        if (sellerId) filter.sellerId = sellerId;
        if (!req.user?.roles?.includes("admin") && !sellerId) filter.sellerId = req.user.id;

        const payouts = await Payout.find(filter)
            .sort({ initiatedAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip))
            .lean();

        res.json(payouts);
    } catch (err) {
        console.error("List payouts error:", err);
        res.status(500).json({ message: "Failed to list payouts" });
    }
});

// Payout summary: GET /api/billing/payouts/summary?sellerId=

// router.get("/payouts/summary", auth(), async (req, res) => {
//     try {
//         const sellerId = req.query.sellerId || req.user.id;
//         console.log(sellerId);

//         const [totalEarningsAgg] = await Transaction.aggregate([
//             { $match: { sellerId: sellerId, status: "completed" } },
//             { $group: { _id: null, total: { $sum: "$amount" }, platformFees: { $sum: "$platformFee" }, net: { $sum: "$netAmount" } } }
//         ]);
//         console.log(totalEarningsAgg);




//         const totalPaidOutAgg = await Payout.aggregate([
//             { $match: { sellerId: sellerId, status: "completed" } },
//             { $group: { _id: null, totalPaid: { $sum: "$amount" } } }
//         ]);

//         const pendingPayoutAgg = await Payout.aggregate([
//             { $match: { sellerId: sellerId, status: { $in: ["pending", "processing"] } } },
//             { $group: { _id: null, pending: { $sum: "$amount" } } }
//         ]);

//         const availableBalance = (totalEarningsAgg?.net || 0) - (totalPaidOutAgg[0]?.totalPaid || 0);

//         const result = {
//             totalEarnings: totalEarningsAgg?.total || 0,
//             platformFees: totalEarningsAgg?.platformFees || 0,
//             totalPaidOut: totalPaidOutAgg[0]?.totalPaid || 0,
//             pendingPayout: pendingPayoutAgg[0]?.pending || 0,
//             availableBalance,
//             nextPayoutDate: dayjs().add(7, "day").toISOString(),
//         };

//         res.json(result);
//     } catch (err) {
//         console.error("Payout summary error:", err);
//         res.status(500).json({ message: "Failed to compute payout summary" });
//     }
// });

router.get("/payouts/summary", auth(), async (req, res) => {
    try {
        const sellerId = req.query.sellerId || req.user.id;

        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

        /* ============================
           1️⃣ TOTAL EARNINGS
        ============================ */
        const [earningsAgg] = await Transaction.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: "completed",
                    type: "sale",
                },
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    platformFee: { $sum: "$platformFee" },
                    gstOnPlatformFee: { $sum: "$gstOnPlatformFee" },
                    netAmount: { $sum: "$netAmount" },
                },
            },
        ]);

        // console.log(earningsAgg);


        /* ============================
           2️⃣ PAID PAYOUTS
        ============================ */
        const [paidAgg] = await Payout.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: "completed",
                },
            },
            {
                $group: {
                    _id: null,
                    totalPaid: { $sum: "$amount" },
                },
            },
        ]);

        /* ============================
           3️⃣ PENDING PAYOUTS
        ============================ */
        const [pendingAgg] = await Payout.aggregate([
            {
                $match: {
                    sellerId: sellerObjectId,
                    status: { $in: ["pending", "processing"] },
                },
            },
            {
                $group: {
                    _id: null,
                    pendingAmount: { $sum: "$amount" },
                },
            },
        ]);

        /* ============================
           4️⃣ CALCULATIONS
        ============================ */
        const totalNetEarnings = earningsAgg?.netAmount || 0;
        const totalPaidOut = paidAgg?.totalPaid || 0;
        const pendingPayout = pendingAgg?.pendingAmount || 0;

        const availableBalance = totalNetEarnings - totalPaidOut;

        /* ============================
           5️⃣ RESPONSE
        ============================ */
        res.json({
            totalEarnings: earningsAgg?.totalAmount || 0,
            platformFees: earningsAgg?.platformFee || 0,
            gstOnPlatformFees: earningsAgg?.gstOnPlatformFee || 0,
            totalPaidOut,
            pendingPayout,
            availableBalance,
            nextPayoutDate: dayjs().add(7, "day").toISOString(),
        });
    } catch (err) {
        console.error("Payout summary error:", err);
        res.status(500).json({ message: "Failed to compute payout summary" });
    }
});


// Request a payout: POST /api/billing/payouts/request
router.post("/payouts/request", auth(), async (req, res) => {
    try {
        const { invoiceId, amount, bankAccount, utrNumber } = req.body;
        const sellerId = req.body.sellerId || req.user.id;

        if (!amount) return res.status(400).json({ message: "Amount required" });

        const payout = new Payout({
            sellerId,
            invoiceId: new mongoose.Types.ObjectId(invoiceId),
            amount,
            bankAccount: bankAccount || undefined,
            utrNumber: utrNumber || undefined,
            status: "pending",
            initiatedAt: new Date().toISOString(),
        });

        await payout.save();

        // Optionally mark invoice as pending payout or create transaction log
        res.json({ success: true, payout, message: "Payout Requested Successfully!" });
    } catch (err) {
        console.error("Request payout error:", err);
        res.status(500).json({ message: "Failed to request payout" });
    }
});

// Download invoice (returns file url or base64) - POST /api/billing/invoices/download
router.post("/invoices/download", auth(), async (req, res) => {
    try {
        const { invoiceId } = req.body;
        if (!invoiceId) return res.status(400).json({ message: "invoiceId required" });

        const invoice = await Invoice.findById(invoiceId).lean();
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        // For demo: return invoice data (frontend can generate PDF).
        // In production you might stream a generated PDF file.
        res.json({ success: true, invoiceData: invoice });
    } catch (err) {
        console.error("Download invoice error:", err);
        res.status(500).json({ message: "Failed to download invoice" });
    }
});

// Admin

const adminOnly = async (req, res, next) => {
    try {
        // if (req.user.roles.includes('admin')) {
        //     return res.status(403).json({ message: 'Admin access only' });
        // }
        next();
    } catch {
        res.status(401).json({ message: 'Unauthorized' });
    }
};


router.get('/admin/billing/revenue', auth(), adminOnly, async (req, res) => {
    try {
        const totalAgg = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$platformFee' },
                    totalTransactions: { $sum: 1 },
                    avgTransactionFee: { $avg: '$platformFee' },
                },
            },
        ]);

        const thisMonthRevenue = await Transaction.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            },
            { $group: { _id: null, total: { $sum: '$platformFee' } } },
        ]);

        const pendingPayouts = await Payout.aggregate([
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const completedPayouts = await Payout.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);




        res.json({
            totalRevenue: totalAgg[0]?.totalRevenue || 0,
            totalTransactions: totalAgg[0]?.totalTransactions || 0,
            avgTransactionFee: Math.round(totalAgg[0]?.avgTransactionFee || 0),
            thisMonthRevenue: thisMonthRevenue[0]?.total || 0,
            pendingPayouts: pendingPayouts[0]?.total || 0,
            completedPayouts: completedPayouts[0]?.total || 0,
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load revenue summary' });
    }
});



router.get('/admin/billing/transactions', auth(), adminOnly, async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('sellerId', 'fullName')
            .populate('buyerId', 'fullName')
            .sort({ createdAt: -1 });

        // console.log(transactions);





        res.json(transactions.map((t) => ({
            id: t._id,
            sellerName: t.sellerId?.fullName,
            buyerName: t.buyerId?.fullName,
            amount: t.amount,
            platformFee: t.platformFee,
            status: t.status,
            createdAt: t.createdAt,
        })));
    } catch {
        res.status(500).json({ message: 'Failed to load transactions' });
    }
});


router.get('/admin/billing/payouts', auth(), adminOnly, async (req, res) => {
    try {
        const payouts = await Payout.find()
            .populate('sellerId', 'fullName')
            .sort({ initiatedAt: -1 });

        // console.log(payouts.map((p) => ({
        //     id: p._id,
        //     sellerName: p.sellerId.fullName,
        //     amount: p.amount,
        //     status: p.status,
        //     initiatedAt: p.initiatedAt,
        //     completedAt: p.completedAt,
        //     utrNumber: p.utrNumber,
        // })));


        res.json(payouts.map((p) => ({
            id: p._id,
            sellerName: p.sellerId.fullName,
            amount: p.amount,
            status: p.status,
            initiatedAt: p.initiatedAt,
            completedAt: p.completedAt,
            utrNumber: p.utrNumber,
        })));
    } catch {
        res.status(500).json({ message: 'Failed to load payouts' });
    }
});


// router.post('/admin/billing/payouts/:id/approve', auth(), adminOnly, async (req, res) => {
//     const { utrNumber } = req.body;

//     if (!utrNumber) {
//         return res.status(400).json({ message: 'UTR required' });
//     }

//     await Payout.findByIdAndUpdate(req.params.id, {
//         status: 'completed',
//         utrNumber,
//         completedAt: new Date().toISOString(),
//     });

//     res.json({ success: true });
// });



router.post('/admin/billing/payouts/:id/approve', auth(), adminOnly, async (req, res) => {
    try {
        let payoutId = req.params.id
        const { utrNumber } = req.body;

        // 1️⃣ Validate admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // 2️⃣ Fetch payout from DB
        const payout = await Payout.findById(payoutId).populate("seller");

        if (!payout || payout.status !== "pending") {
            return res.status(400).json({ success: false, message: "Invalid payout" });
        }

        const seller = payout.seller;

        if (!seller.razorpayFundAccountId) {
            return res.status(400).json({ success: false, message: "Seller bank not verified" });
        }

        // 3️⃣ Create Razorpay payout
        const razorpayPayout = await razorpay.payouts.create({
            // account_number: process.env.RAZORPAY_ACCOUNT_NUMBER!,
            account_number: '987r5983tu8u4',
            fund_account_id: seller.razorpayFundAccountId,
            amount: payout.amount * 100, // paise
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: payout._id.toString(),
            narration: `Payout for order ${payout.orderId}`,
        });

        // 4️⃣ Update DB ONLY after success
        payout.status = "approved";
        payout.utrNumber = utr;
        payout.razorpayPayoutId = razorpayPayout.id;
        payout.processedAt = new Date();
        await payout.save();
        console.log(razorpayPayout);
        

        return res.json({
            success: true,
            message: "Payout processed successfully",
            razorpayPayout,
        });

    } catch (error) {
        console.error("Payout error:", error);
        return res.status(500).json({
            success: false,
            message: "Payout failed",
        });
    }
});


router.post('/admin/billing/payouts/:id/reject', auth(), adminOnly, async (req, res) => {
    await Payout.findByIdAndUpdate(req.params.id, {
        status: 'failed',
    });

    res.json({ success: true });
});



module.exports = router;
