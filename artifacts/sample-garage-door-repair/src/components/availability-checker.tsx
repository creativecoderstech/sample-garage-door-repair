import { getGetAvailabilityQueryKey, useGetAvailability } from "@workspace/api-client-react";
import { useState } from "react";
import { Search, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AvailabilityChecker() {
  const [zip, setZip] = useState("");
  const [searchedZip, setSearchedZip] = useState("");
  
  const { data: availability, isFetching, isError } = useGetAvailability(
    { zip: searchedZip },
    { query: { enabled: searchedZip.length >= 5, queryKey: getGetAvailabilityQueryKey({ zip: searchedZip }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length >= 5) {
      setSearchedZip(zip.substring(0, 5));
    }
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <h3 className="font-display font-bold text-lg mb-2">Check service coverage</h3>
      <p id="availability-help" className="text-sm text-muted-foreground mb-4">Enter a ZIP code before sharing a full street address. The business must confirm coverage and timing.</p>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            aria-label="ZIP code"
            aria-describedby="availability-help"
            inputMode="numeric"
            autoComplete="postal-code"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="Enter ZIP (e.g. 90210)"
            className="pl-9"
            maxLength={10}
          />
        </div>
        <Button type="submit" disabled={zip.length < 5 || isFetching}>
          {isFetching ? "Checking..." : "Check"}
        </Button>
      </form>

      {searchedZip && availability && (
        <div role="status" aria-live="polite" className={`p-4 rounded-lg flex items-start gap-3 ${availability.available ? 'bg-primary/10 border border-primary/20' : 'bg-muted border border-border'}`}>
          {availability.available ? (
             <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          ) : (
             <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          )}
          
          <div>
            <h4 className={`font-bold text-sm ${availability.available ? 'text-primary' : 'text-foreground'}`}>
               {availability.available ? 'Coverage available' : 'Coverage confirmation required'}
            </h4>
            <p className="text-sm mt-1 mb-2 font-medium">
              {availability.message}
            </p>
            {availability.available && availability.eta && (
              <div className="inline-flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                Est. Arrival: {availability.eta}
              </div>
            )}
          </div>
        </div>
      )}
      
      {isError && (
        <div role="alert" className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
          Coverage could not be checked. Please try again or submit a request for confirmation.
        </div>
      )}
    </div>
  );
}
