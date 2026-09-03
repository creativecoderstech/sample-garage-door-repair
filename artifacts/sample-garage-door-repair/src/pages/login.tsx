import { useLocation } from "wouter";
import { useEffect } from "react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/sign-in");
  }, [setLocation]);
  return null;
}
