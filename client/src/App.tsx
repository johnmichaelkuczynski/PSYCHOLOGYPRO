import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";  
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import Home from "./pages/home";
import Enhanced from "./pages/enhanced";
import PsychologyPro from "./pages/psychology-pro";
import NotFound from "./pages/not-found";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Determine which tab should be active based on the current route
  const activeTab = location === "/enhanced" ? "enhanced" : 
                   location === "/psychology-pro" ? "psychology-pro" : "original";
  
  const handleTabChange = (value: string) => {
    if (value === "enhanced") {
      setLocation("/enhanced");
    } else if (value === "psychology-pro") {
      setLocation("/psychology-pro");
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-[600px] grid-cols-3">
            <TabsTrigger value="original" data-testid="original-tab">
              Original Analysis
            </TabsTrigger>
            <TabsTrigger value="enhanced" data-testid="enhanced-tab">
              Enhanced Protocol
            </TabsTrigger>
            <TabsTrigger value="psychology-pro" data-testid="psychology-pro-tab">
              Psychology Pro
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/enhanced" component={Enhanced} />
          <Route path="/psychology-pro" component={PsychologyPro} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
