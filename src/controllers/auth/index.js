let express = require('express')
let Otp = require('../../models/otp')
const router = express.Router();
let twilio = require('twilio');
let dotenv = require("dotenv")
let jwt = require('jsonwebtoken');
let User = require('../../models/users')
dotenv.config()

// console.log("SID:", process.env.TWILIO_ACCOUNT_SID);
// console.log("TOKEN:", process.env.TWILIO_AUTH_TOKEN);
// console.log("PHONE:", process.env.TWILIO_PHONE_NUMBER);




const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

router.post("/send-otp", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) return res.status(400).json({ message: "Phone number required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.deleteMany({ phone }); // clear old OTPs

        await Otp.create({ phone, otp });

        // ⭐ Send OTP via Twilio
        // const response = await client.messages.create({
        //     body: `Your verification code is ${otp}`,
        //     to: `+91${phone}`,
        //     from: process.env.TWILIO_PHONE_NUMBER,
        // });

        // let response = {
        //     sid: 1
        // }

        console.log("Generated OTP:", otp,); // For debugging
        res.status(200).json({ success: true, otp, message: "OTP sent successfully" });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Failed to send OTP",
            error: err.message,
        });
    }
});


// router.post("/verify-otp", async (req, res) => {
//     try {
//         const { phone, otp } = req.body;

//         if (!phone || !otp)
//             return res.status(400).json({ message: "Phone and OTP required" });

//         const record = await Otp.findOne({ phone });

//         if (!record)
//             return res.status(400).json({ message: "OTP expired or not found" });

//         if (record.otp !== otp)
//             return res.status(400).json({ message: "Invalid OTP" });

//         // OTP matched ⇒ login success
//         await Otp.deleteOne({ phone });

//         return res.status(200).json({ success: true, message: "OTP verified successfully" });

//     } catch (err) {
//         res.status(500).json({ message: "Server error", error: err.message });
//     }
// });

router.post("/verify-otp", async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp)
            return res.status(400).json({ message: "Phone and OTP required" });

        const record = await Otp.findOne({ phone });
        if (!record) return res.status(400).json({ message: "OTP expired or not found" });

        if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

        await Otp.deleteOne({ phone });

        // ---- CHECK IF USER EXISTS ----
        let user = await User.findOne({ phone });


        if (!user) {
            // Create new user as buyer only
            user = await User.create({
                phone,
                roles: ["buyer"],
            });
        }



        // Create JWT token
        // console.log(process.env.JWT_SECRET);

        const token = jwt.sign(
            { id: user._id, roles: user.roles },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // req.user = user

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            token,
            // roles: user.roles,
            user,
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.post("/resend-otp", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone)
            return res.status(400).json({ success: false, message: "Phone is required" });

        // Generate new OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete previous OTPs for same user
        await Otp.deleteMany({ phone });

        // Save new OTP
        await Otp.create({ phone, otp: newOtp });

        // Send OTP via Twilio
        // await client.messages.create({
        //     body: `Your new verification code is ${newOtp}`,
        //     to: `+91${phone}`,
        //     from: process.env.TWILIO_PHONE,
        // });

        console.log("New Otp", newOtp);

        res.status(200).json({
            success: true,
            message: "New OTP sent successfully",
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to resend OTP",
            error: error.message,
        });
    }
});


auth = (roles = []) => {
    return (req, res, next) => {
        try {

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
            return res.status(401).json({ message: "Invalid token" });
        }
    };
};

router.post("/set-role", auth(), async (req, res) => {
    const { activeRole } = req.body;

    if (!activeRole)
        return res.status(400).json({ message: "Role is required" });

    const user = await User.findById(req.user.id);
    // console.log(user);

    if (!user.roles.includes(activeRole)) {
        user.roles.push(activeRole)
    }

    user.activeRole = activeRole
    user.save()
    // return res.status(400).json({ message: "You don't have this role yet" });

    const token = jwt.sign(
        { id: user._id, roles: user.roles, activeRole },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({
        message: "Role switched",
        activeRole,
        token,
    });
});




module.exports = router;
