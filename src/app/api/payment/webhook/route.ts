import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET;

    if (!merchantId || !merchantSecret) {
      console.error('Missing PayHere credentials');
      return NextResponse.json(
        { error: 'PayHere credentials are not configured' },
        { status: 500 }
      );
    }

    // Verify the signature
    const orderedData = [
      merchantId,
      data.order_id,
      data.payhere_amount,
      data.payhere_currency,
      data.status_code,
      merchantSecret
    ].join('');
    
    const hash = crypto.createHash('md5').update(orderedData).digest('hex').toUpperCase();

    if (hash !== data.md5sig) {
      console.error('Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Check payment status
    if (data.status_code !== '2') {
      console.error('Payment failed:', data.status_message);
      return NextResponse.json(
        { error: 'Payment failed' },
        { status: 400 }
      );
    }

    // Extract user ID from order ID (format: ORDER_TIMESTAMP)
    const userId = data.order_id.split('_')[1];
    if (!userId) {
      console.error('Invalid order ID format');
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    // Update user subscription in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      subscription: data.custom_1?.toLowerCase() || 'premium', // Use custom_1 field which contains the plan name
      subscriptionUpdatedAt: new Date().toISOString(),
      paymentId: data.payment_id,
      paymentAmount: data.payhere_amount,
      paymentCurrency: data.payhere_currency,
      paymentStatus: 'completed'
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 