import type { Config, YearData } from './types';

function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

function calculateRemainingMortgage(principal: number, annualRate: number, totalYears: number, paidMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateMonthlyMortgage(principal, annualRate, totalYears);
  if (monthlyRate === 0) return principal - monthlyPayment * paidMonths;

  let remaining = principal;
  for (let i = 0; i < paidMonths; i++) {
    const interest = remaining * monthlyRate;
    const principalPart = monthlyPayment - interest;
    remaining -= principalPart;
  }
  return Math.max(0, remaining);
}

export function calculate(config: Config): YearData[] {
  const mortgageAmount = config.propertyPrice - config.downPayment;
  const monthlyMortgage = mortgageAmount > 0
    ? calculateMonthlyMortgage(mortgageAmount, config.mortgageRate, config.mortgageTerm)
    : 0;
  const data: YearData[] = [];

  // V akciovém scénáři stejný vlastní vklad + náklady na koupi jdou rovnou do akcií
  const initialInvestment = config.downPayment + config.acquisitionCost;
  let stockValue = initialInvestment;
  let totalStockInvested = initialInvestment;
  let totalPropertyCosts = initialInvestment; // vlastní vklad + náklady na koupi

  const monthlyStockReturn = Math.pow(1 + config.stockReturnRate / 100, 1 / 12) - 1;

  for (let year = 0; year <= config.years; year++) {
    const currentRent = config.monthlyRent * Math.pow(1 + config.rentGrowthRate / 100, year);
    const currentMaintenance = config.maintenanceFund * Math.pow(1 + config.maintenanceGrowthRate / 100, year);
    const propertyValue = config.propertyPrice * Math.pow(1 + config.propertyGrowthRate / 100, year);
    const remainingMortgage = mortgageAmount <= 0
      ? 0
      : year === 0
        ? mortgageAmount
        : calculateRemainingMortgage(mortgageAmount, config.mortgageRate, config.mortgageTerm, year * 12);

    // Efektivní měsíční příjem z nájmu (po odečtení prázdných měsíců)
    const effectiveMonthlyRent = currentRent * (12 - config.vacancyMonths) / 12;

    // Měsíční náklady na nemovitost
    const monthlyInsurance = config.insuranceYearly / 12;
    const monthlyTax = config.propertyTax / 12;
    const totalMonthlyCosts = monthlyMortgage + currentMaintenance + monthlyInsurance + monthlyTax;

    // Kolik doplácím měsíčně (pokud nájem nepokryje vše)
    const monthlyTopUp = Math.max(0, totalMonthlyCosts - effectiveMonthlyRent);

    if (year > 0) {
      // Simulujeme měsíc po měsíci pro tento rok
      const prevYearRent = config.monthlyRent * Math.pow(1 + config.rentGrowthRate / 100, year - 1);
      const prevYearMaintenance = config.maintenanceFund * Math.pow(1 + config.maintenanceGrowthRate / 100, year - 1);

      for (let month = 0; month < 12; month++) {
        // Lineární interpolace v rámci roku
        const t = month / 12;
        const monthRent = prevYearRent + (currentRent - prevYearRent) * t;
        const monthMaintenance = prevYearMaintenance + (currentMaintenance - prevYearMaintenance) * t;

        const effRent = monthRent * (12 - config.vacancyMonths) / 12;
        const monthlyCosts = monthlyMortgage + monthMaintenance + config.insuranceYearly / 12 + config.propertyTax / 12;
        const topUp = Math.max(0, monthlyCosts - effRent);

        totalPropertyCosts += topUp;

        // Do akcií investuji stejný doplatek
        stockValue = stockValue * (1 + monthlyStockReturn) + topUp;
        totalStockInvested += topUp;
      }
    }

    data.push({
      year,
      propertyValue,
      remainingMortgage,
      propertyEquity: propertyValue - remainingMortgage,
      totalPropertyCosts,
      stockValue,
      totalStockInvested,
      monthlyMortgage,
      monthlyRentIncome: effectiveMonthlyRent,
      monthlyTopUp,
      monthlyMaintenanceFund: currentMaintenance,
      propertyNetWorth: propertyValue - remainingMortgage,
      stockNetWorth: stockValue,
    });
  }

  return data;
}
