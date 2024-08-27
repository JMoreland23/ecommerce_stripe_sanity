import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // Disable Next.js's body parser so we can use raw body for Stripe's signature verification
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
      console.error(`⚠️  Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Example of accessing metadata
      const deliveryDate = session.metadata.deliveryDate;
      const deliveryTime = session.metadata.deliveryTime;

      // Process the event (e.g., send an email or update your database)
      // You can use a function like sendOrderEmail() to send the order details via email
      console.log('Session Metadata:', session.metadata);

      // Example: Log the payment details to the console (you should handle this appropriately in your application)
      console.log(`Payment for session ${session.id} succeeded!`);
    }

    // Respond with a 200 status to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } else {
    // If the method is not POST, return a 405 error
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
