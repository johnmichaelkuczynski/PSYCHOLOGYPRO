import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Authentication mutation
  const authMutation = useMutation({
    mutationFn: (data: AuthFormData) => {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      return apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses/saved"] });
      toast({
        title: mode === "login" ? "Welcome back!" : "Account created!",
        description: mode === "login" 
          ? "You have been successfully logged in." 
          : "Your account has been created and you are now logged in.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    try {
      await authMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle data-testid="auth-modal-title">
            {mode === "login" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription data-testid="auth-modal-description">
            {mode === "login" 
              ? "Enter your credentials to access your saved analyses" 
              : "Create an account to save and manage your analyses"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="auth-form">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              data-testid="username-input"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-sm text-red-600" data-testid="username-error">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              data-testid="password-input"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-600" data-testid="password-error">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
              data-testid="auth-submit-button"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="auth-cancel-button"
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600 border-t pt-4">
          {mode === "login" ? (
            <p data-testid="auth-switch-text">
              Don't have an account? Registration is quick and lets you save your analyses.
            </p>
          ) : (
            <p data-testid="auth-switch-text">
              Already have an account? Use the Login button to sign in.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}