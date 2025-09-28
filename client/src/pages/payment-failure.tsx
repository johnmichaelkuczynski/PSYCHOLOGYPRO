import React, { useEffect } from 'react';
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentFailure() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Parse URL parameters to get error details
    const params = new URLSearchParams(window.location.search);
    const redirectStatus = params.get('redirect_status');
    const errorMessage = params.get('error_message');

    if (redirectStatus === 'failed') {
      toast({
        title: "Payment Failed",
        description: errorMessage || "Your payment could not be processed. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleRetryPayment = () => {
    setLocation("/credits");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl text-red-700 dark:text-red-400">
              Payment Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              We couldn't process your payment. This could be due to insufficient funds, an expired card, or a network issue.
            </p>
            
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                What you can try:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 mt-2 space-y-1 text-left">
                <li>• Check your card details and try again</li>
                <li>• Ensure you have sufficient funds</li>
                <li>• Try a different payment method</li>
                <li>• Contact your bank if the issue persists</li>
              </ul>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={handleRetryPayment} 
                className="w-full"
                data-testid="button-retry-payment"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation("/")} 
                className="w-full"
                data-testid="button-continue-without-payment"
              >
                Continue Without Payment
              </Button>
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