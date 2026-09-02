import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    // Simulate auth for demo
    setTimeout(() => {
      setIsLoading(false);
      if (values.password.toLowerCase() === "admin") {
        setLocation("/admin");
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid credentials. Hint: use 'admin'",
          variant: "destructive"
        });
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
         <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-sm mb-4">
            <Lock className="h-8 w-8" />
         </div>
         <h1 className="text-2xl font-display font-bold tracking-tight">Ops Center Login</h1>
         <p className="text-muted-foreground mt-1">Staff portal for Sample Garage Door Repair</p>
      </div>

      <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access PIN</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter 'admin' to access demo" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-md font-bold" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Access Dashboard"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center text-sm text-muted-foreground bg-muted p-4 rounded-lg">
          <p className="font-semibold text-foreground mb-1">Demo Environment</p>
          <p>Enter <code className="bg-background px-1 py-0.5 rounded border text-foreground">admin</code> to access the operations dashboard.</p>
        </div>
      </div>
      
      <div className="mt-12 text-sm text-muted-foreground">
        <a href="/" className="hover:text-primary transition-colors">← Return to public site</a>
      </div>
    </div>
  );
}
