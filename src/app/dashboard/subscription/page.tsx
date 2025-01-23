'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Check, AlertTriangle } from 'lucide-react';
import PayHereButton from '@/components/PayHereButton';
import { Card } from '@/components/ui/card';
import { getSubscriptionStatus } from '@/lib/subscription';

interface Plan {
  name: string;
  price: string;
  features: string[];
}

const plans: Plan[] = [
  {
    name: 'Free',
    price: '$0/month',
    features: [
      'Store up to 3 passwords',
      'Store 1 personal info entry',
      'Basic encryption',
      'Access from one device',
    ],
  },
  {
    name: 'Premium',
    price: '$4.99/month',
    features: [
      'Unlimited passwords',
      'Store up to 50 personal info entries',
      'Advanced encryption',
      'Access from multiple devices',
      'Secure password sharing',
      'Priority support',
    ],
  },
  {
    name: 'Business',
    price: '$9.99/month',
    features: [
      'Everything in Premium',
      'Unlimited personal info entries',
      'Team password sharing',
      'Admin dashboard',
      'Activity logs',
      '24/7 support',
      'Custom branding',
    ],
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isActive: boolean;
    isSuspended: boolean;
    expiresAt: string | null;
    daysUntilExpiration: number | null;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        await updateDoc(doc(db, 'users', user.uid), {
          email: user.email,
          subscription: 'free',
          createdAt: new Date().toISOString(),
        });
        setCurrentPlan('free');
      } else {
        setCurrentPlan(userDoc.data().subscription || 'free');
      }

      // Load subscription status
      const status = await getSubscriptionStatus(user);
      setSubscriptionStatus(status);
    } catch (error: any) {
      console.error('Error loading subscription:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: 'Failed to load subscription details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    if (!user) return;

    try {
      if (planName.toLowerCase() === 'free') {
        setLoading(true);
        await updateDoc(doc(db, 'users', user.uid), {
          subscription: planName.toLowerCase(),
          updatedAt: new Date().toISOString(),
        });
        
        setCurrentPlan(planName.toLowerCase());
        toast({
          title: 'Success',
          description: `Successfully switched to ${planName} plan`,
        });
        setLoading(false);
        return;
      }

      // For paid plans, show the payment button
      setSelectedPlan(planName);
      setShowPayment(true);
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process upgrade. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const getAmount = (planName: string) => {
    // Convert USD to LKR (approximate conversion rate)
    const usdAmount = planName.toLowerCase() === 'premium' ? 4.99 : planName.toLowerCase() === 'business' ? 9.99 : 0;
    // Convert to LKR and ensure it's a whole number (PayHere doesn't accept decimals)
    const lkrAmount = Math.ceil(usdAmount * 325); // Round up to nearest rupee
    return lkrAmount.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Subscription Warning */}
      {subscriptionStatus && !subscriptionStatus.isActive && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Subscription Expired</h3>
          </div>
          <p className="mt-2 text-sm">
            Your subscription has expired. Please renew to continue using premium features.
          </p>
        </Card>
      )}

      {/* Expiration Warning */}
      {subscriptionStatus && subscriptionStatus.daysUntilExpiration !== null && 
       subscriptionStatus.daysUntilExpiration <= 7 && 
       subscriptionStatus.daysUntilExpiration > 0 && (
        <Card className="p-4 bg-warning/10 border-warning">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Subscription Expiring Soon</h3>
          </div>
          <p className="mt-2 text-sm">
            Your subscription will expire in {subscriptionStatus.daysUntilExpiration} days. 
            Please renew to avoid service interruption.
          </p>
        </Card>
      )}

      {/* Suspension Warning */}
      {subscriptionStatus?.isSuspended && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Account Suspended</h3>
          </div>
          <p className="mt-2 text-sm">
            Your account has been suspended. Please contact support for assistance.
          </p>
        </Card>
      )}

      <div className="text-center">
        <h2 className="text-3xl font-bold">Subscription Plans</h2>
        <p className="text-muted-foreground mt-2">
          Choose the perfect plan for your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative overflow-hidden ${
              currentPlan === plan.name.toLowerCase()
                ? 'border-primary ring-2 ring-primary'
                : ''
            }`}
          >
            {currentPlan === plan.name.toLowerCase() && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm">
                Current Plan
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-primary">{plan.price}</p>
                  {plan.name !== 'Free' && (
                    <p className="text-sm text-muted-foreground">
                      Rs. {getAmount(plan.name)} LKR/month
                    </p>
                  )}
                </div>
              </div>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 space-y-2">
                {showPayment && selectedPlan === plan.name ? (
                  <>
                    <PayHereButton
                      plan={plan.name}
                      amount={parseInt(getAmount(plan.name))}
                      onSuccess={() => {
                        toast({
                          title: 'Success',
                          description: 'Payment processed successfully',
                        });
                        setShowPayment(false);
                        loadSubscription();
                      }}
                      onError={(error) => {
                        toast({
                          title: 'Error',
                          description: error,
                          variant: 'destructive',
                        });
                      }}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowPayment(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    variant={
                      currentPlan === plan.name.toLowerCase() ? 'outline' : 'default'
                    }
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={currentPlan === plan.name.toLowerCase()}
                  >
                    {currentPlan === plan.name.toLowerCase()
                      ? 'Current Plan'
                      : 'Upgrade'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 