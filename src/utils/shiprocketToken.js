let axios = require("axios");
let dotenv = require('dotenv')
dotenv.config()



let cachedToken = null;
let tokenExpiry = null;




const getShiprocketToken = async () => {
    if (cachedToken && tokenExpiry > Date.now()) {
        return cachedToken;
    }

    try {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        var raw = JSON.stringify({
            "email": process.env.SHIPROCKET_EMAIL,
            "password": process.env.SHIPROCKET_PASSWORD
        });

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };

        const result = await fetch(`${process.env.SHIPROCKET_BASE_URL}/auth/login`, requestOptions);

        let res = await result.json()
        cachedToken = res.token;
        tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days
        return cachedToken;
    }
    catch (err) {
        console.log(err);
        return undefined

    }
};


module.exports = getShiprocketToken
