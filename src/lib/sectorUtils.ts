// Shared sector utilities for the application
import { Stock } from "@/types/market";

// DSE Sector mapping - ordered by priority (more specific patterns first)
export const SECTOR_PATTERNS: Record<string, RegExp[]> = {
  // Pharmaceuticals - check before others to avoid false matches
  "Pharmaceuticals": [
    /PHARMA/i, /DRUG/i, /MEDICINE/i,
    /^ACME$/i, /^SQURPHARMA$/i, /^RENATA$/i, /^BEXIMCO$/i, /^IBNSINA$/i, 
    /^ORION/i, /^GLAXO/i, /^SILCOPHARMA$/i, /^ACI$/i, /^BXPHARMA$/i,
    /^AMBEE/i, /^BEACON$/i, /^CENTRALPHARMA$/i, /^ESKAYEF$/i, /^GLOBALINS$/i,
    /^KOHINOOR$/i, /^LIBROPH$/i, /^MARICO$/i, /^NAVANAPHAR$/i, /^RECKITTBEN$/i,
    /^SANOFI$/i
  ],
  
  // Banks - specific bank names
  "Bank": [
    /BANK/i, /^AB$/i, /^ABBANK$/i, /^AIBL$/i, /^ALARABANK$/i, /^ALBANK$/i,
    /^BRACBANK$/i, /^CITYBANK$/i, /^DHAKABANK$/i, /^DBBL$/i, /^DUTCHBANG$/i,
    /^EBL$/i, /^EXIMBK$/i, /^FIRSTSBANK$/i, /^IBBL$/i, /^IFIC$/i, /^ISLAMIBANK$/i,
    /^JAMUNABANK$/i, /^MERCANBANK$/i, /^MTB$/i, /^MTBL$/i, /^NBL$/i, /^NCCBANK$/i,
    /^NRBCBANK$/i, /^ONEBANKLTD$/i, /^PRIMEBANK$/i, /^PUBALIBANK$/i, /^RUPALIBANK$/i,
    /^SHAHJABANK$/i, /^SIBL$/i, /^SONARBANG$/i, /^SOUTHEASTB$/i, /^STANDBBANK$/i,
    /^STANBIC$/i, /^TRUSTBANK$/i, /^UCBL$/i, /^UTTARABANK$/i
  ],
  
  // Financial Institutions
  "NBFI": [
    /FINANCE/i, /LEASING/i, /^BDFINANCE$/i, /^BIFC$/i, /^DFINANCE$/i,
    /^FAREASTFIN$/i, /^GSPFINANCE$/i, /^ICBAMCL$/i, /^IDLC$/i, /^ILFSL$/i,
    /^IPDC$/i, /^ISLAMICFIN$/i, /^LANKABD$/i, /^MIDAS$/i, /^NATIOLIFE$/i,
    /^NHFIL$/i, /^PLFSL$/i, /^PREMFIN$/i, /^UNILEASING$/i
  ],
  
  // Insurance
  "Insurance": [
    /INSURANCE/i, /INSUR/i, /^AGRANINS$/i, /^ASIAINS$/i, /^ASIAPAC$/i,
    /^BAYLEASING$/i, /^BGIC$/i, /^CENTRALINS$/i, /^CONTININS$/i, /^DELTALIFE$/i,
    /^DHAKALIFE$/i, /^EASTERNS$/i, /^EASTLANDINS$/i, /^FAREAST$/i, /^FIDELITY$/i,
    /^GENINS$/i, /^GLOBEINS$/i, /^GREENDELINS$/i, /^JANATALIFE$/i, /^KARNAPHULI$/i,
    /^MEGHNALIFE$/i, /^MERCTILE$/i, /^NATIONALLIFE$/i, /^NITOLINS$/i, /^PARAMOUNT$/i,
    /^PEOPLES$/i, /^PHOENIX$/i, /^PIONEER$/i, /^POPULARLIF$/i, /^PRAGATILIF$/i,
    /^PRIMEINS$/i, /^PROGRESLIF$/i, /^RELIANCEINS$/i, /^REPUBLICINS$/i, /^RUPALIINS$/i,
    /^SANDHANINS$/i, /^SENAKALYAN$/i, /^SONARLIFE$/i, /^STANDARDINS$/i, /^SUNLIFE$/i,
    /^UNIONINS$/i
  ],
  
  // Telecom
  "Telecom": [
    /TELECOM/i, /^GP$/i, /^GRAMEENPHONE$/i, /^ROBI$/i, /^BANGLALINK$/i, /^TELETALK$/i
  ],
  
  // IT & Technology
  "IT": [
    /TECH/i, /SOFTWARE/i, /COMPUTER/i, /DIGITAL/i, /^ADNTEL$/i, /^AAMRA$/i,
    /^BDCOM$/i, /^BRACIT$/i, /^DAFFODIL$/i, /^DATASOFT$/i, /^DHAKATEL$/i,
    /^GENEXIL$/i, /^INFOTECH$/i, /^ISLONET$/i, /^LRGLOBAL$/i, /^SAIHAMTEX$/i,
    /^SQLTC$/i
  ],
  
  // Fuel & Power
  "Fuel & Power": [
    /POWER/i, /ENERGY/i, /^BARKAPOWER$/i, /^BDWELD$/i, /^BGDCL$/i, /^DESCO$/i,
    /^DPDC$/i, /^EASTRNLUB$/i, /^JAMUNAOIL$/i, /^LINDEBD$/i, /^MEGHNACEM$/i,
    /^MPETROLEUM$/i, /^PADMAOIL$/i, /^POWERGRID$/i, /^RDFOOD$/i, /^SPCL$/i,
    /^SUMITPOWER$/i, /^TITASGAS$/i, /^UNITEDEN$/i, /^UPGDCO$/i
  ],
  
  // Engineering
  "Engineering": [
    /STEEL/i, /ENGINEERING/i, /^AFTABAUTO$/i, /^AZIZBHG$/i, /^BSRMLTD$/i,
    /^BSRMSTEEL$/i, /^GPHISPAT$/i, /^KAY&QUE$/i, /^KDSLTD$/i, /^KSRM$/i,
    /^NAVANA$/i, /^OIMEX$/i, /^OLYMPIC$/i, /^QUASEM$/i, /^RANGPUR$/i,
    /^RSRMSTEEL$/i, /^RUNNERAUTO$/i, /^SFTL$/i, /^SINGERBD$/i, /^WALTONHIL$/i
  ],
  
  // Textile
  "Textile": [
    /TEX/i, /YARN/i, /SPINNING/i, /WEAVING/i, /DENIM/i, /COTTON/i, /GARMENT/i,
    /^ALHAJ$/i, /^ANLIMAYARN$/i, /^APEXADEN$/i, /^APEXSPNG$/i, /^ARAMILL$/i,
    /^BDCOL$/i, /^BEXTEX$/i, /^CRESCENT$/i, /^CVOPRL$/i, /^DESHBNDHU$/i,
    /^DULAMIACOT$/i, /^ENVOYTEX$/i, /^FAMILYTEX$/i, /^FEKDIL$/i, /^FUWANGFOOD$/i,
    /^HMTEX$/i, /^MAKSONSPIN$/i, /^MATINSPINN$/i, /^METROSPIN$/i, /^MONNOSTAF$/i,
    /^NURANI$/i, /^PAZARTEX$/i, /^PRIMETEX$/i, /^RAHIM$/i, /^RNSPIN$/i,
    /^SAFKOSPINN$/i, /^SALVOCHEM$/i, /^SAMATA$/i, /^SAMORITA$/i, /^SHEEP$/i,
    /^SIMTEX$/i, /^SONCOY$/i, /^SONARGAON$/i, /^SQUARETEXT$/i, /^STYLECRAFT$/i,
    /^TALLUSPIN$/i, /^TOKYOIND$/i, /^ZAFARSPIN$/i, /^ZAHEENSPIN$/i, /^ZAHINTEX$/i
  ],
  
  // Cement
  "Cement": [
    /CEMENT/i, /^CONFID$/i, /^HEIDELBCEM$/i, /^LAFSUR$/i, /^MICEMENT$/i,
    /^PREMIERCEM$/i, /^MICEM$/i
  ],
  
  // Food & Allied
  "Food & Allied": [
    /FOOD/i, /DAIRY/i, /SUGAR/i, /AGRO/i, /^AAMRACL$/i, /^AGRICUL$/i,
    /^AMCL$/i, /^APEXFOODS$/i, /^BATBC$/i, /^BEACHHATCH$/i, /^BENGALFOOD$/i,
    /^CITYGENERA$/i, /^FUWANGCER$/i, /^GEMINI$/i, /^IFAD$/i, /^KOHINOOR$/i,
    /^LEGACYFOOT$/i, /^MEGHNALIFE$/i, /^MILKEVIT$/i, /^NATFOOD$/i, /^NAVANACNG$/i,
    /^NURANI$/i, /^OLYMPICIND$/i, /^PREMIERBAN$/i, /^RDFOOD$/i, /^SONALIPAPR$/i
  ],
  
  // Ceramics
  "Ceramics": [
    /CERAMIC/i, /^FUWANGCER$/i, /^MONNOCER$/i, /^RAK$/i, /^SHINEPUKUR$/i,
    /^STANDARCER$/i
  ],
  
  // Paper & Printing
  "Paper & Printing": [
    /PAPER/i, /PRINTING/i, /^BANGLAPACK$/i, /^HRTEX$/i, /^KPPL$/i,
    /^SONALIPAPR$/i
  ],
  
  // Jute
  "Jute": [
    /JUTE/i, /^BJFML$/i, /^JUTESPNRS$/i
  ],
  
  // Tannery
  "Tannery": [
    /TANNERY/i, /LEATHER/i, /^APEXLEATH$/i, /^BATABD$/i, /^LEGACYFOOT$/i,
    /^SAMATA$/i
  ],
  
  // Travel & Leisure
  "Travel & Leisure": [
    /HOTEL/i, /TRAVEL/i, /RESORT/i, /^BENGALWIND$/i, /^UNIQUEHOT$/i
  ],
  
  // Services & Real Estate
  "Services & Real Estate": [
    /ESTATE/i, /PROPERTY/i, /^BDTHAI$/i, /^ECABLES$/i, /^EASTRNHOUS$/i
  ],
  
  // Mutual Funds
  "Mutual Fund": [
    /FUND/i, /^1JANATAMF$/i, /^1STPRIMFMF$/i, /^AIBL1STIMF$/i, /^CAPMBDBLMF$/i,
    /^CAPMIBBLMF$/i, /^DBH1STMF$/i, /^EBL1STMF$/i, /^ELOPMF$/i, /^EXIMBPMF$/i,
    /^GREENDELMF$/i, /^GRAMEENS2$/i, /^ICB$/i, /^ICBAMCL$/i, /^IFICAMCL$/i,
    /^LRGLOBAL$/i, /^MBL1STMF$/i, /^NCCBMF$/i, /^NLI1STMF$/i, /^PHPMF1$/i,
    /^PF1STMF$/i, /^POPULAR1MF$/i, /^PRIME1ICBA$/i, /^RELIANCE1$/i, /^SEABOROIL$/i,
    /^SEBL1STMF$/i, /^TRUSTB1MF$/i
  ],
  
  // Miscellaneous
  "Miscellaneous": [
    /^ACTIVEFINE$/i, /^BDLAMPS$/i, /^MEGCONMIL$/i, /^NAHEE$/i, /^RAKCERAMIC$/i,
    /^SONALILIFE$/i
  ],
};

// Vibrant, modern gradient-inspired sector colors
export const SECTOR_COLORS: Record<string, string> = {
  "Bank": "hsl(217, 91%, 55%)",              // Vivid Blue
  "Pharmaceuticals": "hsl(160, 84%, 42%)",   // Emerald Green
  "NBFI": "hsl(32, 95%, 52%)",               // Bright Orange
  "Insurance": "hsl(330, 81%, 58%)",         // Hot Pink
  "Telecom": "hsl(271, 81%, 56%)",           // Electric Purple
  "IT": "hsl(174, 72%, 45%)",                // Teal
  "Fuel & Power": "hsl(0, 84%, 55%)",        // Vibrant Red
  "Engineering": "hsl(45, 93%, 52%)",        // Golden Yellow
  "Textile": "hsl(262, 83%, 58%)",           // Royal Purple
  "Cement": "hsl(200, 18%, 50%)",            // Steel Gray
  "Food & Allied": "hsl(187, 85%, 45%)",     // Cyan
  "Ceramics": "hsl(25, 95%, 55%)",           // Burnt Orange
  "Paper & Printing": "hsl(142, 71%, 45%)",  // Forest Green
  "Jute": "hsl(80, 61%, 50%)",               // Olive Green
  "Tannery": "hsl(15, 75%, 45%)",            // Brown
  "Travel & Leisure": "hsl(195, 85%, 55%)",  // Sky Blue
  "Services & Real Estate": "hsl(280, 60%, 55%)", // Lavender
  "Mutual Fund": "hsl(82, 78%, 45%)",        // Lime Green
  "Miscellaneous": "hsl(220, 16%, 55%)",     // Neutral Slate
  "Others": "hsl(215, 20%, 50%)",            // Default Gray
};

export function getSector(symbol: string, name: string): string {
  const combined = `${symbol} ${name}`.toUpperCase();
  
  for (const [sector, patterns] of Object.entries(SECTOR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        return sector;
      }
    }
  }
  return "Others";
}

export interface SectorData {
  name: string;
  value: number;
  stocks: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  avgChange: number;
  stockList: Stock[];
}

export function calculateSectorData(stocks: Stock[]): SectorData[] {
  const sectors: Record<string, { 
    value: number; 
    stocks: Stock[];
  }> = {};

  stocks.forEach(stock => {
    const sector = getSector(stock.symbol, stock.name);
    if (!sectors[sector]) {
      sectors[sector] = { value: 0, stocks: [] };
    }
    sectors[sector].value += stock.valueMn;
    sectors[sector].stocks.push(stock);
  });

  return Object.entries(sectors)
    .map(([name, data]) => {
      const advancers = data.stocks.filter(s => s.change > 0).length;
      const decliners = data.stocks.filter(s => s.change < 0).length;
      const unchanged = data.stocks.filter(s => s.change === 0).length;
      const avgChange = data.stocks.reduce((sum, s) => sum + s.changePercent, 0) / data.stocks.length;
      
      return {
        name,
        value: data.value,
        stocks: data.stocks.length,
        advancers,
        decliners,
        unchanged,
        avgChange,
        stockList: data.stocks,
      };
    })
    .sort((a, b) => b.value - a.value);
}

export function formatValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}B`;
  return `${value.toFixed(2)}M`;
}

// Get color based on percentage change (for treemap heatmap)
export function getChangeColor(changePercent: number): string {
  // Clamp to -6% to +6% range
  const clampedChange = Math.max(-6, Math.min(6, changePercent));
  
  if (clampedChange > 0) {
    // Green gradient for positive
    const intensity = Math.min(1, clampedChange / 6);
    const lightness = 45 - (intensity * 20); // 45% to 25%
    return `hsl(142, 71%, ${lightness}%)`;
  } else if (clampedChange < 0) {
    // Red gradient for negative
    const intensity = Math.min(1, Math.abs(clampedChange) / 6);
    const lightness = 51 - (intensity * 20); // 51% to 31%
    return `hsl(0, 72%, ${lightness}%)`;
  }
  // Neutral gray
  return `hsl(215, 16%, 55%)`;
}
