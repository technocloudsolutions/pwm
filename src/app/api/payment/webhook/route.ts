import { db } from "@/lib/firebase-admin";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Valid subscription plans
const VALID_PLANS = ["premium", "business"];
const VALID_CURRENCIES = ["LKR", "USD"];

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET;

    // Log incoming webhook data (excluding sensitive info)
    console.log("Webhook received:", {
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status_code,
    });

    if (!merchantId || !merchantSecret) {
      console.error("Missing PayHere credentials");
      return NextResponse.json(
        { error: "PayHere credentials are not configured" },
        { status: 500 }
      );
    }

    // Verify the signature
    const orderedData = [
      merchantId,
      data.order_id,
      data.amount,
      data.currency,
      data.status_code,
      merchantSecret,
    ].join("");

    const hash = crypto
      .createHash("md5")
      .update(orderedData)
      .digest("hex")
      .toUpperCase();

    if (hash !== data.md5sig) {
      console.error("Invalid signature", {
        orderId: data.order_id,
        expectedHash: hash,
        receivedHash: data.md5sig,
      });
      return NextResponse.json(
        {
          error: "Invalid signature",
          details: "Payment verification failed",
        },
        { status: 400 }
      );
    }

    // Validate currency
    if (!VALID_CURRENCIES.includes(data.currency)) {
      console.error("Invalid currency:", data.currency);
      return NextResponse.json(
        {
          error: "Invalid currency",
          details: `Supported currencies: ${VALID_CURRENCIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check payment status
    if (data.status_code !== "2") {
      console.error("Payment failed:", {
        orderId: data.order_id,
        status: data.status_code,
        message: data.status_message,
      });
      return NextResponse.json(
        {
          error: "Payment failed",
          details: data.status_message,
        },
        { status: 400 }
      );
    }

    // Extract user ID from order ID (format: ORDER_TIMESTAMP)
    const userId = data.order_id.split("_")[1];
    if (!userId) {
      console.error("Invalid order ID format:", data.order_id);
      return NextResponse.json(
        {
          error: "Invalid order ID format",
          details: "Order ID must be in format: ORDER_USERID_TIMESTAMP",
        },
        { status: 400 }
      );
    }

    // Validate subscription plan
    const subscriptionPlan = data.custom_1?.toLowerCase() || "premium";
    if (!VALID_PLANS.includes(subscriptionPlan)) {
      console.error("Invalid subscription plan:", subscriptionPlan);
      return NextResponse.json(
        {
          error: "Invalid subscription plan",
          details: `Supported plans: ${VALID_PLANS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Calculate expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const now = new Date().toISOString();

    // Check if user exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error("User not found:", userId);
      return NextResponse.json(
        {
          error: "User not found",
          details: "Cannot process payment for non-existent user",
        },
        { status: 404 }
      );
    }

    // Create payment document
    const paymentData = {
      amount: Number(data.amount),
      createdAt: now,
      orderId: data.order_id,
      plan: subscriptionPlan,
      status: "succeeded",
      userId: userId,
      paymentReference: data.payment_id,
      currency: data.currency,
      paymentMethod: "payhere",
      metadata: {
        payment_id: data.payment_id,
        status_code: data.status_code,
        status_message: data.status_message,
      },
    };

    await db.collection("payments").add(paymentData);

    // Update user document
    await userRef.update({
      subscription: subscriptionPlan,
      subscriptionUpdatedAt: now,
      subscriptionExpiresAt: expirationDate.toISOString(),
      lastPayment: {
        amount: Number(data.amount),
        currency: data.currency,
        date: now,
        orderId: data.order_id,
        paymentId: data.payment_id,
        paymentMethod: "payhere",
      },
    });

    console.log("Payment processed successfully:", {
      orderId: data.order_id,
      userId: userId,
      plan: subscriptionPlan,
      expiresAt: expirationDate.toISOString(),
    });

    return NextResponse.json({
      status: "success",
      orderId: data.order_id,
      plan: subscriptionPlan,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
