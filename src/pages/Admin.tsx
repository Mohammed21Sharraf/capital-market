import { useState, useCallback } from "react";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ParsedRow {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function Admin() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parseCSV = useCallback((text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse header
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    
    // Find column indices
    const symbolIdx = header.findIndex((h) => h === "symbol" || h === "code" || h === "trading_code");
    const dateIdx = header.findIndex((h) => h === "date" || h === "trading_date");
    const openIdx = header.findIndex((h) => h === "open" || h === "openp");
    const highIdx = header.findIndex((h) => h === "high");
    const lowIdx = header.findIndex((h) => h === "low");
    const closeIdx = header.findIndex((h) => h === "close" || h === "closep" || h === "ltp");
    const volumeIdx = header.findIndex((h) => h === "volume" || h === "vol");

    if (symbolIdx < 0 || dateIdx < 0 || closeIdx < 0) {
      toast.error("CSV must have symbol, date, and close columns");
      return [];
    }

    const data: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      
      const symbol = cols[symbolIdx]?.toUpperCase();
      const dateStr = cols[dateIdx];
      const close = parseFloat(cols[closeIdx]) || 0;
      
      if (!symbol || !dateStr || close <= 0) continue;

      // Parse date - handle multiple formats
      let parsedDate: Date | null = null;
      
      // Try YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        parsedDate = new Date(dateStr);
      }
      // Try DD-MM-YYYY or DD/MM/YYYY
      else if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateStr)) {
        const parts = dateStr.split(/[-\/]/);
        parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      // Try DD-Mon-YYYY
      else if (/^\d{1,2}-\w{3}-\d{4}$/i.test(dateStr)) {
        parsedDate = new Date(dateStr);
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) continue;

      const open = openIdx >= 0 ? parseFloat(cols[openIdx]) || close : close;
      const high = highIdx >= 0 ? parseFloat(cols[highIdx]) || close : close;
      const low = lowIdx >= 0 ? parseFloat(cols[lowIdx]) || close : close;
      const volume = volumeIdx >= 0 ? parseInt(cols[volumeIdx]) || 0 : 0;

      data.push({
        symbol,
        date: parsedDate.toISOString().split("T")[0],
        open,
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close,
        volume,
      });
    }

    return data;
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }

      setFile(selectedFile);
      setImportResult(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setParsedData(parsed);
        
        if (parsed.length > 0) {
          toast.success(`Parsed ${parsed.length} rows from CSV`);
        } else {
          toast.error("No valid data found in CSV");
        }
      };
      reader.readAsText(selectedFile);
    },
    [parseCSV]
  );

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("No data to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 100;
    const totalBatches = Math.ceil(parsedData.length / batchSize);

    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase.functions.invoke("import-historical-prices", {
          body: { prices: batch },
        });

        if (error) {
          result.failed += batch.length;
          result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          result.success += batch.length;
        }
      } catch (err) {
        result.failed += batch.length;
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      setImportProgress(((i + batch.length) / parsedData.length) * 100);
    }

    setImportResult(result);
    setIsImporting(false);

    if (result.success > 0) {
      toast.success(`Successfully imported ${result.success} records`);
    }
    if (result.failed > 0) {
      toast.error(`Failed to import ${result.failed} records`);
    }
  };

  const clearData = () => {
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    setImportProgress(0);
  };

  // Get unique symbols from parsed data
  const uniqueSymbols = [...new Set(parsedData.map((r) => r.symbol))];
  const dateRange = parsedData.length > 0
    ? {
        min: parsedData.reduce((min, r) => (r.date < min ? r.date : min), parsedData[0].date),
        max: parsedData.reduce((max, r) => (r.date > max ? r.date : max), parsedData[0].date),
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Admin - Data Import</h1>
                <p className="text-xs text-muted-foreground">
                  Import historical price data
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 space-y-4">
        {/* CSV Format Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CSV Format</CardTitle>
            <CardDescription>
              Upload a CSV file with the following columns (column names are case-insensitive):
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <p className="text-muted-foreground">Required:</p>
              <p>symbol, date, close</p>
              <p className="text-muted-foreground mt-2">Optional:</p>
              <p>open, high, low, volume</p>
              <p className="text-muted-foreground mt-2">Date formats supported:</p>
              <p>YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD-Mon-YYYY</p>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1"
              />
              {parsedData.length > 0 && (
                <Button variant="outline" size="icon" onClick={clearData}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file.name}</span>
                <span>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {parsedData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Data Preview</span>
                <Badge variant="secondary">{parsedData.length} rows</Badge>
              </CardTitle>
              <CardDescription>
                {uniqueSymbols.length} symbol(s): {uniqueSymbols.slice(0, 10).join(", ")}
                {uniqueSymbols.length > 10 && ` +${uniqueSymbols.length - 10} more`}
                {dateRange && (
                  <span className="ml-2">
                    | Date range: {dateRange.min} to {dateRange.max}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Open</th>
                      <th className="text-right p-2">High</th>
                      <th className="text-right p-2">Low</th>
                      <th className="text-right p-2">Close</th>
                      <th className="text-right p-2">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="p-2 font-medium">{row.symbol}</td>
                        <td className="p-2 font-mono text-xs">{row.date}</td>
                        <td className="p-2 text-right font-mono">{row.open.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono">{row.high.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono">{row.low.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-semibold">{row.close.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">
                          {row.volume.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 20 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    ... and {parsedData.length - 20} more rows
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {isImporting && (
                  <div className="space-y-1">
                    <Progress value={importProgress} />
                    <p className="text-xs text-muted-foreground text-center">
                      Importing... {Math.round(importProgress)}%
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleImport}
                  disabled={isImporting || parsedData.length === 0}
                  className="w-full"
                >
                  {isImporting ? "Importing..." : `Import ${parsedData.length} Records`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {importResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {importResult.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 bg-success/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-success">{importResult.success}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
                <div className="flex-1 bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{importResult.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              
              {importResult.errors.length > 0 && (
                <div className="mt-3 text-sm text-destructive">
                  <p className="font-medium mb-1">Errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
