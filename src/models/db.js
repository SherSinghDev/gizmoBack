let dotenv = require("dotenv")
dotenv.config()
let mongoose = require('mongoose')

function mongoConnection() {
    mongoose.connect(process.env.MONGODB_URI )
        .then(() => {
            console.log("MongoDB Connected..");
        })
        .catch((err) => {
            console.log(err);
        })
}

module.exports = mongoConnection