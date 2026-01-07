let axios = require("axios");
let dotenv = require('dotenv')
dotenv.config()

let getShiprocketToken = require("../utils/shiprocketToken");
const baseURL = process.env.SHIPROCKET_BASE_URL;



const checkServiceability = async (payload) => {
    const token = await getShiprocketToken();

    // Build query params
    const query = new URLSearchParams({
        pickup_postcode: payload.pickup_postcode,
        delivery_postcode: payload.delivery_postcode,
        weight: payload.weight,
        is_return: payload.returned ? 1 : 0,
        declared_value: 35000,
        cod: payload.cod ? 1 : 0,
    }).toString();

    const response = await fetch(
        `${baseURL}/courier/serviceability?${query}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Serviceability failed: ${errorText}`);
    }

    const data = await response.json();
    console.log(data);
    
    return data?.data?.available_courier_companies;
};


const createOrder = async (orderPayload) => {
    const token = await getShiprocketToken();

    const response = await fetch(
        `${baseURL}/orders/create/adhoc`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(orderPayload),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Create order failed: ${errorText}`);
    }

    return await response.json();
};


const assignAWB = async (shipmentId, courierCompanyId) => {
    const token = await getShiprocketToken();

    const response = await fetch(
        `${baseURL}/courier/assign/awb`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                shipment_id: shipmentId,
                courier_company_id: courierCompanyId,
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWB assignment failed: ${errorText}`);
    }

    return await response.json();
};

const getPickupLocations = async () => {
    const token = await getShiprocketToken();

    const res = await fetch(`${baseURL}/settings/company/pickup`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await res.json();
    return data.data || [];
};


const registerPickupLocation = async (pickup) => {
    const token = await getShiprocketToken();

    const res = await fetch(`${baseURL}/settings/company/addpickup`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            pickup_location: pickup.name,
            name: pickup.contactName,
            email: pickup.email,
            phone: pickup.phone,
            address: pickup.address,
            city: pickup.city,
            state: pickup.state,
            country: "India",
            pin_code: pickup.pincode,
        }),
    });

    const data = await res.json();

    if (!data.success) {
        throw new Error(data.message || "Pickup registration failed");
    }

    return data;
};



module.exports = {
    checkServiceability,
    createOrder,
    assignAWB,
    getPickupLocations,
    registerPickupLocation
}