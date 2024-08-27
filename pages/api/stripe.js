import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { cartItems, deliveryDetails } = req.body; // Destructure the request body

      // Ensure cartItems is an array before using .map()
      if (!Array.isArray(cartItems)) {
        throw new Error('Expected cartItems to be an array');
      }

      const params = {
        submit_type: 'pay',
        mode: 'payment',
        payment_method_types: ['card'],
        billing_address_collection: 'auto',
        shipping_address_collection: {
          allowed_countries: ['US', 'CA'], // Adjust as needed
        },
        shipping_options: [
          { shipping_rate: 'shr_1M0QLHBxzlriU0UItHJ5tZCH' },
          { shipping_rate: 'shr_1M0QM1BxzlriU0UIPd03dDTC' },
        ],
        line_items: cartItems.map((item) => {
          const img = item.image[0].asset._ref;
          const newImage = img.replace('image-', 'https://cdn.sanity.io/images/am3wpofs/production').replace('-webp', '.webp');

          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
                images: [newImage],
              },
              unit_amount: item.price * 100,
            },
            adjustable_quantity: {
              enabled: true,
              minimum: 1,
            },
            quantity: item.quantity,
          };
        }),
        success_url: `${req.headers.origin}/success`,
        cancel_url: `${req.headers.origin}/canceled`,
        metadata: {
          deliveryDate: deliveryDetails.deliveryDate,
          deliveryTime: deliveryDetails.deliveryTime,
        },
      };

      const session = await stripe.checkout.sessions.create(params);
      res.status(200).json(session);
    } catch (err) {
      // Handle any errors that occur in the try block
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  } else {
    // Handle non-POST requests
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}