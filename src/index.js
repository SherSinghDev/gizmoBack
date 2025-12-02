let express = require('express')
let app = express()
let cors = require('cors')
let db = require('./models/db')
let authControllers = require('./controllers/auth')
let productControllers = require('./controllers/products')
let usersControllers = require('./controllers/users')
let ordersControllers = require('./controllers/orders')


// database connection
db()

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    // origin:['http://localhost:8081']
    origin: "*", credentials: true
}))
app.use(express.static('./assets'))


// routes
app.get('/', (req, res) => {
    res.json({ message: "Backend Working" })
})


app.use("/api/auth", authControllers);
app.use("/products", productControllers);
app.use("/users", usersControllers);
app.use("/orders", ordersControllers);


// listening
app.listen(3200, "0.0.0.0", () => {
    console.log("Listening to http://localhost:3200");
})