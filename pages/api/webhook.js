const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// Replace this with your actual webhook signing secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Extract delivery details from the session metadata
    const deliveryDate = session.metadata.deliveryDate;
    const deliveryTime = session.metadata.deliveryTime;
    const cartItems = session.display_items.map(item => `${item.quantity} x ${item.custom.name}`).join(', ');

    // Send an email with order details
    sendOrderEmail({
      to: 'jmorestache@outlook.com',
      subject: 'New Order Received',
      text: `You have received a new order.

Order Details:
- Items: ${cartItems}
- Delivery Date: ${deliveryDate}
- Delivery Time: ${deliveryTime}
- Customer Email: ${session.customer_email}

Payment Details:
- Amount: ${session.amount_total / 100} ${session.currency.toUpperCase()}
- Payment Status: ${session.payment_status}`,
    });
  }

  res.json({ received: true });
});

function sendOrderEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email provider
    auth: {
      user: process.env.EMAIL_USER, // Your email user
      pass: process.env.EMAIL_PASS, // Your email password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('Email sent: ' + info.response);
  });
}

app.listen(3000, () => console.log('Server running on port 3000'));