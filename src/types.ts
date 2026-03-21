export interface Config {
  // Nemovitost
  propertyPrice: number;          // Cena nemovitosti (Kč)
  downPayment: number;            // Vlastní vklad (Kč)
  mortgageRate: number;           // Úroková sazba hypotéky (% p.a.)
  mortgageTerm: number;           // Doba splácení (roky)
  propertyGrowthRate: number;     // Roční růst ceny nemovitosti (%)
  acquisitionCost: number;        // Náklady na koupi - provize, daň z nabytí atd. (Kč)

  // Pronájem
  monthlyRent: number;            // Měsíční nájem (Kč)
  rentGrowthRate: number;         // Roční růst nájmu (%)
  vacancyMonths: number;          // Měsíce bez nájemníka za rok

  // Náklady
  maintenanceFund: number;        // Fond oprav měsíčně (Kč)
  maintenanceGrowthRate: number;  // Roční růst fondu oprav (%)
  insuranceYearly: number;        // Pojištění ročně (Kč)
  propertyTax: number;            // Daň z nemovitosti ročně (Kč)

  // Daně
  rentalIncomeTaxRate: number;    // Sazba daně z příjmu z pronájmu (%)
  useExpenseLumpSum: boolean;     // Použít paušální výdaje 30%?
  mortgageInterestDeduction: boolean; // Odpočet úroků z hypotéky od základu daně?
  personalTaxRate: number;        // Sazba daně z příjmu (%)

  // Akcie
  stockReturnRate: number;        // Průměrný roční výnos akcií (%)

  // Horizont
  years: number;                  // Investiční horizont (roky)
}

export interface YearData {
  year: number;
  // Nemovitost
  propertyValue: number;
  remainingMortgage: number;
  propertyEquity: number;       // propertyValue - remainingMortgage
  totalPropertyCosts: number;   // kumulativní doplatek

  // Akcie
  stockValue: number;
  totalStockInvested: number;   // kumulativní investice

  // Měsíční toky
  monthlyMortgage: number;
  monthlyRentIncome: number;    // po odečtení vacancy
  monthlyTopUp: number;         // kolik doplácím
  monthlyMaintenanceFund: number;

  // Daně
  monthlyRentalTax: number;       // měsíční daň z pronájmu
  yearlyInterestDeduction: number; // roční úspora z odpočtu úroků
  saleTax: number;                // daň z prodeje nemovitosti (0 pokud > 10 let)

  // Čistý výnos
  propertyNetWorth: number;     // equity - kumulativní náklady navíc
  stockNetWorth: number;
}
