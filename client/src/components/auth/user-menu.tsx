import { useState } from "react";
import { User, LogOut, UserPlus, LogIn, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "./auth-modal";

interface UserData {
  id: number;
  username: string;
}

interface AuthResponse {
  user: UserData | null;
}

export default function UserMenu({ onShowHistory }: { onShowHistory?: () => void }) {
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Check authentication status
  const { data: authData, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/me"],
  });

  const user = authData?.user;

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses/saved"] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    setAuthMode("login");
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setAuthMode("register");
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" data-testid="user-menu-loading" />
    );
  }

  if (user) {
    // User is logged in - show user menu
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" data-testid="user-menu-trigger">
              <User className="h-4 w-4 mr-2" />
              {user.username}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-testid="user-menu-content">
            {onShowHistory && (
              <>
                <DropdownMenuItem onClick={onShowHistory} data-testid="my-history-button">
                  <History className="h-4 w-4 mr-2" />
                  My History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
        />
      </>
    );
  }

  // User not logged in - show login/register buttons
  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleLogin} data-testid="login-button">
        <LogIn className="h-4 w-4 mr-2" />
        Login
      </Button>
      <Button variant="outline" size="sm" onClick={handleRegister} data-testid="register-button">
        <UserPlus className="h-4 w-4 mr-2" />
        Sign Up
      </Button>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </>
  );
}