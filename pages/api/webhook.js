import { buffer } from 'micro';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // Disable Next.js's body parser to use raw body for Stripe signature verification
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify that the event posted to the webhook is coming from Stripe using the secret
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

       // Process your webhook here
       console.log('Session Metadata:', session.metadata);

       // Example: Log the payment details to the console
       console.log(`Payment for session ${session.id} succeeded!`);
       
      // Extract delivery details from the session metadata
      const deliveryDate = session.metadata.deliveryDate;
      const deliveryTime = session.metadata.deliveryTime;
      const cartItems = session.display_items.map(item => `${item.quantity} x ${item.custom.name}`).join(', ');

      // Send an email with order details
      await sendOrderEmail({
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

    // Respond to Stripe to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } else {
    // If the method is not POST, return a 405 error
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

async function sendOrderEmail({ to, subject, text }) {
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

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        return reject(error);
      }
      console.log('Email sent:', info.response);
      resolve(info);
    });
  });
}
