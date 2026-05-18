import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY || '';
const PAYMONGO_URL    = 'https://api.paymongo.com/v1';

const IS_CONFIGURED = PAYMONGO_SECRET && PAYMONGO_SECRET !== 'YOUR_PAYMONGO_SECRET_KEY';

// ── Create a PayMongo Checkout Session ──────────────────────────────────────
// This creates a checkout link that redirects customer to GCash/Maya to pay
router.post('/create-checkout', async (req, res) => {
  try {
    const { amount, description, orderId, paymentMethod, successUrl, failedUrl } = req.body;

    if (!IS_CONFIGURED) {
      // Simulated mode — return a fake checkout URL for demo
      return res.json({
        checkoutUrl: null,
        simulated: true,
        message: 'PayMongo not configured. Payment recorded as simulated.',
      });
    }

    // PayMongo expects amount in centavos (₱30 = 3000)
    const amountInCentavos = Math.round(amount * 100);

    const payload = {
      data: {
        attributes: {
          line_items: [
            {
              name: description || 'Water Market Order',
              quantity: 1,
              amount: amountInCentavos,
              currency: 'PHP',
            },
          ],
          payment_method_types: ['gcash'],
          description: `Order #${orderId}`,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}?payment=success&orderId=${orderId}`,
          cancel_url: failedUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}?payment=failed&orderId=${orderId}`,
          metadata: {
            order_id: orderId,
          },
        },
      },
    };

    const response = await fetch(`${PAYMONGO_URL}/checkout_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET).toString('base64')}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayMongo error:', data);
      return res.status(400).json({ error: data.errors?.[0]?.detail || 'Payment creation failed' });
    }

    res.json({
      checkoutUrl: data.data.attributes.checkout_url,
      checkoutId: data.data.id,
      simulated: false,
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Check payment status ────────────────────────────────────────────────────
router.get('/status/:checkoutId', async (req, res) => {
  try {
    if (!IS_CONFIGURED) {
      return res.json({ status: 'paid', simulated: true });
    }

    const response = await fetch(`${PAYMONGO_URL}/checkout_sessions/${req.params.checkoutId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET).toString('base64')}`,
      },
    });

    const data = await response.json();
    const payments = data.data?.attributes?.payments || [];
    const isPaid = payments.some(p => p.attributes?.status === 'paid');

    res.json({
      status: isPaid ? 'paid' : 'pending',
      simulated: false,
    });
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
