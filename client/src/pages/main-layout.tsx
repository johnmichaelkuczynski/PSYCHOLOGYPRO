import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Home from "./home";
import ComprehensiveHome from "./comprehensive-home";

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState("tab1");

  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto" data-testid="main-tabs">
            <TabsTrigger value="tab1" data-testid="tab1-trigger">
              Tab 1 - Existing App
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tab2-trigger">
              Comprehensive Analysis
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="tab1" className="h-full m-0 data-[state=inactive]:hidden">
            <Home />
          </TabsContent>
          <TabsContent value="tab2" className="h-full m-0 data-[state=inactive]:hidden">
            <ComprehensiveHome />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}