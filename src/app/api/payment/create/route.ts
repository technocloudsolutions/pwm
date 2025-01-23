import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // PayHere API credentials
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET;

    if (!merchantId || !merchantSecret) {
      console.error('Missing PayHere credentials:', { merchantId, merchantSecret });
      return NextResponse.json(
        { error: 'PayHere credentials are not configured' },
        { status: 500 }
      );
    }

    // Prepare PayHere form data
    const formData = {
      merchant_id: merchantId,
      return_url: `${data.origin}/dashboard/subscription/success`,
      cancel_url: `${data.origin}/dashboard/subscription`,
      notify_url: `${data.origin}/api/payment/webhook`,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: "0771234567",
      address: "No.1, Galle Road",
      city: "Colombo",
      country: "Sri Lanka",
      order_id: data.orderId,
      items: `${data.plan} Plan Subscription`,
      currency: "LKR",
      amount: data.amount.toString(),
      business_category: "4707", // Digital Goods and Software
      platform: "web",
      custom_1: data.plan,
      custom_2: data.orderId,
      hash: ''
    };

    // Generate hash - using exact order as per PayHere docs
    const orderedData = [
      merchantId,
      formData.order_id,
      formData.amount,
      formData.currency,
      merchantSecret
    ].join('');

    // Convert hash to uppercase as required by PayHere
    formData.hash = crypto.createHash('md5').update(orderedData).digest('hex').toUpperCase();

    console.log('Generated hash:', formData.hash);
    console.log('Hash input:', orderedData);
    console.log('Form data:', formData);

    return NextResponse.json(formData);
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
} 