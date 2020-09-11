const express = require("express")
const app = express()
const bodyParser = require("body-parser");

require("dotenv").config();
const stripe_secret_key = process.env.STRIPE_SECRET_KEY;
const stripe_public_key = process.env.STRIPE_PUBLIC_KEY;
const stripe = require("stripe")(stripe_secret_key);


// ejs engine
app.set("view engine", "ejs");
// static path
app.use(express.static(__dirname + "/public"));

app.use(bodyParser.urlencoded({
    extended: true
}));

// let cust = {};
// stripe.customers.create(
//     {
//         description: 'test customer',
//         email: "asd@asd.com"
//     },
//     function(err, customer) {
//         cust = customer
//         console.log(cust)
//     }
// )

app.get("/", async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_intent_data: {
            setup_future_usage: 'off_session',
        },
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Lesson'
                },
                unit_amount: 1000
            },
            quantity: 1,
        }],
        // customer: 'cus_Hn6K5fKGujM0BS',
        success_url: 'http://localhost:8000/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://localhost:8000/cancel',
    });
    res.render("payment", {
        session: session,
        key: stripe_public_key
    });
});

app.get("/success", async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.json(session);
});

app.get("/saved-card", async (req, res) => {
    const paymentMethods = await stripe.paymentMethods.list({
        customer: req.query.customerID,
        type: 'card',
    });
    res.json(paymentMethods.data[0]);
});

app.get("/second-charge", (req, res) => {
    res.render("second-charge", {
        customerID: req.query.customerID
    });
});

app.post("/second-charge", async (req, res) => {
    const paymentMethods = await stripe.paymentMethods.list({
        customer: req.body.customerID,
        type: 'card',
    });
    const paymentMethod_id = paymentMethods.data[0].id;
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 1099,
            currency: 'usd',
            customer: req.body.customerID,
            payment_method: paymentMethod_id,
            off_session: true,
            confirm: true,
        });
        res.json(paymentIntent);
    } catch (err) {
        // Error code will be authentication_required if authentication is needed
        console.log('Error code is: ', err.code);
        const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
        console.log('PI retrieved: ', paymentIntentRetrieved.id);
        res.status(404).json(err);
    }
});

app.get("/refund", (req, res) => {
    res.render("refund", {
        paymentIntent: req.query.paymentIntent
    });
});

app.post("/refund", (req, res) => {
    stripe.refunds.create({
        amount: 500,
        payment_intent: req.body.paymentIntent
    }, function (err, refund) {
        if (err) return console.log(err)
        res.json(refund);
    })
});



app.listen(8000, function () {
    console.log("stripe test is running on port 8000");
});