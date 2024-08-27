import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for raw request body
  },
};

const buffer = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Handle line items or display items
      const items = session.line_items || session.display_items;
      const cartItems = items
        ? items.map(item => `${item.quantity} x ${item.description || item.custom.name}`).join(', ')
        : 'No items found';

      // Extract delivery details from the session metadata
      const deliveryDate = session.metadata?.deliveryDate || 'Not provided';
      const deliveryTime = session.metadata?.deliveryTime || 'Not provided';

      // Send an email with order details
      await sendOrderEmail({
        to: 'your-email@example.com',
        subject: 'New Order Received',
        text: `You have received a new order.

Order Details:
- Items: ${cartItems}
- Delivery Date: ${deliveryDate}
- Delivery Time: ${deliveryTime}
- Customer Email: ${session.customer_email}

Payment Details:
- Amount: ${session.amount_total / 100} ${session.currency.toUpperCase()}
- Payment Status: ${session.payment_status}`
      });
    }

    // Acknowledge receipt of the event
    res.status(200).json({ received: true });
  } else {
    // If the method is not POST, return a 405 error
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

async function sendOrderEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Or another email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
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
