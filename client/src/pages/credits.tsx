import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Zap, Clock, DollarSign } from "lucide-react";
import { PRICING_TIERS, LLM_INFO, type LLMProviderType } from "@/data/pricing";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Credits() {
  const [, setLocation] = useLocation();
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderType>("zhi1");

  const { data: userCredits = 0 } = useQuery<number>({
    queryKey: ["/api/user/credits"],
    select: (data: any) => data.credits || 0,
  });

  const handlePurchase = (amount: number) => {
    setLocation(`/checkout?amount=${amount}&provider=${selectedProvider}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analysis
            </Link>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Current Credits: {userCredits.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Analysis Credits</h1>
          <p className="text-gray-600">Choose your LLM provider and credit package</p>
        </div>

        {/* LLM Provider Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Select LLM Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(LLM_INFO).map(([key, info]) => (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all ${
                    selectedProvider === key 
                      ? "ring-2 ring-blue-500 border-blue-500" 
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedProvider(key as LLMProviderType)}
                  data-testid={`provider-${key}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{info.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-green-700 mb-1">Strengths:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {info.merits.slice(0, 2).map((merit, idx) => (
                          <li key={idx}>• {merit}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-700 mb-1">Considerations:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {info.demerits.slice(0, 2).map((demerit, idx) => (
                          <li key={idx}>• {demerit}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedProvider && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">
                  Selected: {LLM_INFO[selectedProvider].name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-700 mb-1">All Strengths:</h4>
                    <ul className="text-blue-800 space-y-1">
                      {LLM_INFO[selectedProvider].merits.map((merit, idx) => (
                        <li key={idx}>• {merit}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-700 mb-1">All Considerations:</h4>
                    <ul className="text-blue-800 space-y-1">
                      {LLM_INFO[selectedProvider].demerits.map((demerit, idx) => (
                        <li key={idx}>• {demerit}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {PRICING_TIERS.map((tier) => {
            const credits = tier.credits[selectedProvider];
            const isPopular = tier.amount === 25;
            
            return (
              <Card 
                key={tier.amount} 
                className={`relative ${isPopular ? "ring-2 ring-blue-500 scale-105" : ""}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    ${tier.amount}
                  </div>
                  <CardTitle className="text-lg text-gray-600">
                    {credits.toLocaleString()} credits
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-center text-sm text-gray-500">
                    ~{credits.toLocaleString()} words
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <span>Instant delivery</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                      <span>Secure payment</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchase(tier.amount)}
                    data-testid={`purchase-${tier.amount}`}
                  >
                    Purchase ${tier.amount}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Credits are tied to your selected LLM provider and don't expire.</p>
          <p>Secure payments processed by Stripe. Your data is protected.</p>
        </div>
      </div>
    </div>
  );
}