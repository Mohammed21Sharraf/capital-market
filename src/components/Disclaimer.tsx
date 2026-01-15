import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function Disclaimer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 md:px-4 md:py-2.5",
          "flex items-center justify-between gap-2 transition-all hover:bg-amber-500/15",
          "focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-background"
        )}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <span className="text-xs md:text-sm font-medium text-amber-500">Important Disclaimer</span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-amber-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-[11px] md:text-xs leading-relaxed text-muted-foreground">
            Prices may be delayed and are for information purposes only. This data is not intended 
            for trading decisions. Please verify with official sources before making any investment 
            decisions. We do not guarantee the accuracy or timeliness of the information provided.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
