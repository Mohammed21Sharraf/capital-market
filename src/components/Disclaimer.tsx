import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-accent">Important Disclaimer</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Prices may be delayed and are for information purposes only. This data is not intended 
            for trading decisions. Please verify with official sources before making any investment 
            decisions. We do not guarantee the accuracy or timeliness of the information provided.
          </p>
        </div>
      </div>
    </div>
  );
}
