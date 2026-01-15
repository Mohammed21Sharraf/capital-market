export interface Stock {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  previousLtp?: number;
  valueMn: number;
  trade: number;
  // New fields for sector/category
  sector?: string;
  category?: string;
}

export interface StockFundamentals {
  symbol: string;
  marketCap?: number;
  authorizedCap?: number;
  paidUpCap?: number;
  faceValue?: number;
  pe?: number;
  eps?: number;
  nav?: number;
  listingYear?: number;
  yearHigh?: number;
  yearLow?: number;
  lastAGM?: string;
  sector?: string;
  category?: string;
}

export interface MarketStatus {
  isOpen: boolean;
  lastUpdated: Date;
  message?: string;
}

export interface MarketData {
  stocks: Stock[];
  status: MarketStatus;
}
