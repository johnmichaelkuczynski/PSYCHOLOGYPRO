import React, { useEffect, useState } from 'react';
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentDetails, setPaymentDetails] = useState<{
    amount?: string;
    credits?: string;
    provider?: string;
  }>({});

  useEffect(() => {
    // Parse URL parameters to get payment details
    const params = new URLSearchParams(window.location.search);
    const paymentIntent = params.get('payment_intent');
    const paymentIntentClientSecret = params.get('payment_intent_client_secret');
    const redirectStatus = params.get('redirect_status');

    if (redirectStatus === 'succeeded') {
      toast({
        title: "Payment Successful!",
        description: "Your credits have been added to your account.",
      });
    }

    // Set payment details if available
    setPaymentDetails({
      amount: params.get('amount') || undefined,
      credits: params.get('credits') || undefined,
      provider: params.get('provider') || undefined,
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-700 dark:text-green-400">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Thank you for your purchase. Your credits have been successfully added to your account.
            </p>
            
            {paymentDetails.amount && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Payment Details</span>
                </div>
                {paymentDetails.amount && (
                  <p className="text-sm">Amount: ${paymentDetails.amount}</p>
                )}
                {paymentDetails.credits && (
                  <p className="text-sm">Credits Added: {paymentDetails.credits}</p>
                )}
                {paymentDetails.provider && (
                  <p className="text-sm">Provider: {paymentDetails.provider}</p>
                )}
              </div>
            )}

            <div className="pt-4 space-y-3">
              <Button 
                onClick={() => setLocation("/")} 
                className="w-full"
                data-testid="button-continue-analysis"
              >
                Continue to Analysis
              </Button>
              
              <Link href="/credits">
                <Button 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-view-credits"
                >
                  View Credit Balance
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}