import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { useLocation } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY. Stripe functionality will be disabled.');
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "You are subscribed!",
      });
      setLocation("/");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <GradientButton 
        type="submit" 
        className="w-full py-3 rounded-xl font-semibold"
        disabled={!stripe || !elements}
        data-testid="button-subscribe"
      >
        Subscribe
      </GradientButton>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!stripePromise) {
      toast({
        title: "Payment Unavailable",
        description: "Payment processing is currently unavailable.",
        variant: "destructive",
      });
      return;
    }

    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/create-subscription")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Subscription error:", error);
        toast({
          title: "Error",
          description: "Failed to initialize subscription. Please try again.",
          variant: "destructive",
        });
      });
  }, [toast]);

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center">Payment Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">
              Payment processing is currently unavailable. Please try again later.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-back-to-dashboard"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <i className="fas fa-brain text-2xl text-primary"></i>
              <span className="text-xl font-bold">BrainBoost</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-back"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Upgrade to <span className="text-primary">Premium</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of your brain training with advanced features and unlimited access
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Features */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Premium Features</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <i className="fas fa-check-circle text-primary text-xl mt-1"></i>
                <div>
                  <h3 className="font-semibold">Unlimited Games</h3>
                  <p className="text-muted-foreground text-sm">Access to all cognitive training games without restrictions</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <i className="fas fa-check-circle text-primary text-xl mt-1"></i>
                <div>
                  <h3 className="font-semibold">Advanced Analytics</h3>
                  <p className="text-muted-foreground text-sm">Detailed progress tracking and performance insights</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <i className="fas fa-check-circle text-primary text-xl mt-1"></i>
                <div>
                  <h3 className="font-semibold">Personalized Plans</h3>
                  <p className="text-muted-foreground text-sm">AI-powered custom training routines</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <i className="fas fa-check-circle text-primary text-xl mt-1"></i>
                <div>
                  <h3 className="font-semibold">Priority Support</h3>
                  <p className="text-muted-foreground text-sm">Get help when you need it most</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">$9.99/month</div>
                <div className="text-muted-foreground">Cancel anytime</div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <Card className="premium-shadow">
            <CardHeader>
              <CardTitle className="text-center">Complete Your Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm />
              </Elements>
              
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <i className="fas fa-lock"></i>
                  Secure payment powered by Stripe
                </div>
                <div>30-day money-back guarantee</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
