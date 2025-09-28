import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import { PRICING_TIERS, LLM_INFO, type LLMProviderType } from "@/data/pricing";
import { Link, useLocation } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
console.log('Stripe public key found:', !!stripePublicKey);
if (!stripePublicKey) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(stripePublicKey);

const CheckoutForm = ({ amount, llmProvider }: { amount: number; llmProvider: LLMProviderType }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
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
        description: "Thank you for your purchase! Credits will be added to your account.",
      });
      // Redirect to home page
      setLocation("/");
    }

    setIsProcessing(false);
  };

  const tier = PRICING_TIERS.find(t => t.amount === amount);
  const credits = tier?.credits[llmProvider] || 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analysis
        </Link>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Purchase Summary
              <Badge variant="secondary">${amount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>LLM Provider:</span>
                <span className="font-medium">{LLM_INFO[llmProvider].name}</span>
              </div>
              <div className="flex justify-between">
                <span>Credits:</span>
                <span className="font-medium">{credits.toLocaleString()} words</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>${amount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!stripe || !elements || isProcessing}
              data-testid="submit-payment-button"
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Complete Purchase - ${amount}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [llmProvider, setLlmProvider] = useState<LLMProviderType | null>(null);
  const [urlParamsLoaded, setUrlParamsLoaded] = useState(false);
  const { toast } = useToast();

  // Parse URL parameters first
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const amountParam = urlParams.get('amount');
    const providerParam = urlParams.get('provider');
    
    const parsedAmount = amountParam ? parseInt(amountParam) : 5;
    const parsedProvider = (providerParam && ["zhi1", "zhi2", "zhi3", "zhi4"].includes(providerParam)) 
      ? providerParam as LLMProviderType 
      : "zhi1";
    
    setAmount(parsedAmount);
    setLlmProvider(parsedProvider);
    setUrlParamsLoaded(true);
  }, []);

  useEffect(() => {
    // Only create PaymentIntent after URL params are loaded
    if (!urlParamsLoaded || amount === null || llmProvider === null) {
      console.log('Waiting for URL params to load...', { urlParamsLoaded, amount, llmProvider });
      return;
    }
    
    console.log('=== FRONTEND: Creating payment intent ===');
    console.log('Amount:', amount, 'Provider:', llmProvider);
    console.log('URL loaded:', urlParamsLoaded);
    
    apiRequest("POST", "/api/create-payment-intent", { amount, llmProvider })
      .then(async (response) => {
        console.log('=== FRONTEND: Payment intent response ===');
        console.log('Response received:', response);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('JSON data:', data);
        console.log('Client secret exists:', !!data.clientSecret);
        console.log('Client secret length:', data.clientSecret?.length || 0);
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error('=== FRONTEND: Payment intent creation failed ===');
        console.error('Error:', error);
        toast({
          title: "Payment Setup Failed",
          description: "Unable to initialize payment. Please try again.",
          variant: "destructive",
        });
      });
  }, [urlParamsLoaded, amount, llmProvider, toast]);

  if (!clientSecret || amount === null || llmProvider === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm amount={amount} llmProvider={llmProvider} />
    </Elements>
  );
}