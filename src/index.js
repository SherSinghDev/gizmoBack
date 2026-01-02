let express = require('express')
let app = express()
let cors = require('cors')
let db = require('./models/db')
let authControllers = require('./controllers/auth')
let productControllers = require('./controllers/products')
let usersControllers = require('./controllers/users')
let ordersControllers = require('./controllers/orders')
let returnControllers = require('./controllers/returns')
let reviewsControllers = require('./controllers/reviews')
let transactionControllers = require('./controllers/transactions')
let paymentControllers = require('./controllers/payments')
let searchControllers = require('./controllers/search')
let notificationsControllers = require('./controllers/notifications')
let verificationControllers = require('./controllers/verification')
let chatControllers = require('./controllers/chat')
let analyticControllers = require('./controllers/analytics')
let shiprocketControllers = require('./controllers/shiprocket')


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
app.use("/returns", returnControllers);
app.use("/reviews", reviewsControllers);
app.use("/reviews", reviewsControllers);
app.use("/billing", transactionControllers);
app.use("/payment", paymentControllers);
app.use("/search", searchControllers);
app.use("/notifications", notificationsControllers);
app.use("/verification", verificationControllers);
app.use("/chat", chatControllers);
app.use("/analytic", analyticControllers);
app.use("/shiprocket", shiprocketControllers);


// listening
app.listen(3200, "0.0.0.0", () => {
    console.log("Listening to http://localhost:3200");
})