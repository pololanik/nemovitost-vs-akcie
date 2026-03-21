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

// Výpočet úroků zaplacených za daný rok (pro odpočet z daní)
function calculateYearlyInterest(principal: number, annualRate: number, totalYears: number, yearIndex: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateMonthlyMortgage(principal, annualRate, totalYears);
  if (monthlyRate === 0) return 0;

  let remaining = principal;
  // Dopočítáme zůstatek na začátek roku
  for (let i = 0; i < (yearIndex - 1) * 12; i++) {
    const interest = remaining * monthlyRate;
    remaining -= (monthlyPayment - interest);
  }

  let yearlyInterest = 0;
  for (let m = 0; m < 12; m++) {
    const interest = remaining * monthlyRate;
    yearlyInterest += interest;
    remaining -= (monthlyPayment - interest);
    if (remaining <= 0) break;
  }
  return yearlyInterest;
}

// Výpočet měsíční daně z pronájmu
function calculateRentalTax(
  monthlyRent: number, vacancyMonths: number,
  monthlyCosts: number, // náklady bez hypotéky (fond oprav, pojištění, daň)
  monthlyMortgage: number,
  taxRate: number, useExpenseLumpSum: boolean,
): number {
  const effectiveMonthlyRent = monthlyRent * (12 - vacancyMonths) / 12;
  if (effectiveMonthlyRent <= 0) return 0;

  let taxableIncome: number;
  if (useExpenseLumpSum) {
    // Paušální výdaje 30%
    taxableIncome = effectiveMonthlyRent * 0.7;
  } else {
    // Skutečné výdaje (fond oprav, pojištění, daň z nemovitosti, odpisy...)
    taxableIncome = Math.max(0, effectiveMonthlyRent - monthlyCosts - monthlyMortgage);
  }
  return taxableIncome * (taxRate / 100);
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
  const maxInterestDeduction = 150_000; // max odpočet úroků ročně

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

    // Měsíční náklady na nemovitost (bez hypotéky)
    const monthlyInsurance = config.insuranceYearly / 12;
    const monthlyPropertyTax = config.propertyTax / 12;
    const nonMortgageCosts = currentMaintenance + monthlyInsurance + monthlyPropertyTax;
    const totalMonthlyCosts = monthlyMortgage + nonMortgageCosts;

    // Daň z příjmu z pronájmu
    const monthlyRentalTax = calculateRentalTax(
      currentRent, config.vacancyMonths,
      nonMortgageCosts, monthlyMortgage,
      config.rentalIncomeTaxRate, config.useExpenseLumpSum,
    );

    // Odpočet úroků z hypotéky
    let yearlyInterestDeduction = 0;
    if (config.mortgageInterestDeduction && year > 0 && mortgageAmount > 0) {
      const yearlyInterest = calculateYearlyInterest(mortgageAmount, config.mortgageRate, config.mortgageTerm, year);
      const deductibleInterest = Math.min(yearlyInterest, maxInterestDeduction);
      yearlyInterestDeduction = deductibleInterest * (config.personalTaxRate / 100);
    }
    const monthlyInterestDeduction = yearlyInterestDeduction / 12;

    // Kolik doplácím měsíčně (náklady + daň z pronájmu - nájem - úspora z odpočtu úroků)
    const monthlyTopUp = Math.max(0, totalMonthlyCosts + monthlyRentalTax - effectiveMonthlyRent - monthlyInterestDeduction);

    // Daň z prodeje nemovitosti (15% z kapitálového zisku pokud do 10 let)
    const capitalGain = propertyValue - config.propertyPrice;
    const saleTax = (year <= 10 && capitalGain > 0) ? capitalGain * 0.15 : 0;

    if (year > 0) {
      const prevYearRent = config.monthlyRent * Math.pow(1 + config.rentGrowthRate / 100, year - 1);
      const prevYearMaintenance = config.maintenanceFund * Math.pow(1 + config.maintenanceGrowthRate / 100, year - 1);

      for (let month = 0; month < 12; month++) {
        const t = month / 12;
        const monthRent = prevYearRent + (currentRent - prevYearRent) * t;
        const monthMaintenance = prevYearMaintenance + (currentMaintenance - prevYearMaintenance) * t;

        const effRent = monthRent * (12 - config.vacancyMonths) / 12;
        const monthNonMortgageCosts = monthMaintenance + config.insuranceYearly / 12 + config.propertyTax / 12;
        const monthlyCosts = monthlyMortgage + monthNonMortgageCosts;

        const monthRentalTax = calculateRentalTax(
          monthRent, config.vacancyMonths,
          monthNonMortgageCosts, monthlyMortgage,
          config.rentalIncomeTaxRate, config.useExpenseLumpSum,
        );

        const topUp = Math.max(0, monthlyCosts + monthRentalTax - effRent - monthlyInterestDeduction);

        totalPropertyCosts += topUp;
        stockValue = stockValue * (1 + monthlyStockReturn) + topUp;
        totalStockInvested += topUp;
      }
    }

    data.push({
      year,
      propertyValue,
      remainingMortgage,
      propertyEquity: propertyValue - remainingMortgage - saleTax,
      totalPropertyCosts,
      stockValue,
      totalStockInvested,
      monthlyMortgage,
      monthlyRentIncome: effectiveMonthlyRent,
      monthlyTopUp,
      monthlyMaintenanceFund: currentMaintenance,
      monthlyRentalTax,
      yearlyInterestDeduction,
      saleTax,
      propertyNetWorth: propertyValue - remainingMortgage - saleTax,
      stockNetWorth: stockValue,
    });
  }

  return data;
}
