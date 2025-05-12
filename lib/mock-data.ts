// Mock assets data
export const mockAssets = [
  {
    symbol: "USDC",
    name: "USD Coin",
    price: 1,
    supplyRate: 0.0312, // 3.12% APY
    borrowRate: 0.0412, // 4.12% APR
    collateralFactor: 0.8, // 80%
    amount: 0,
    interestRate: 0,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3500,
    supplyRate: 0.0215, // 2.15% APY
    borrowRate: 0.0315, // 3.15% APR
    collateralFactor: 0.75, // 75%
    amount: 0,
    interestRate: 0,
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    price: 60000,
    supplyRate: 0.0185, // 1.85% APY
    borrowRate: 0.0285, // 2.85% APR
    collateralFactor: 0.7, // 70%
    amount: 0,
    interestRate: 0,
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    price: 1,
    supplyRate: 0.0325, // 3.25% APY
    borrowRate: 0.0425, // 4.25% APR
    collateralFactor: 0.8, // 80%
    amount: 0,
    interestRate: 0,
  },
  {
    symbol: "USDT",
    name: "Tether",
    price: 1,
    supplyRate: 0.0318, // 3.18% APY
    borrowRate: 0.0418, // 4.18% APR
    collateralFactor: 0.8, // 80%
    amount: 0,
    interestRate: 0,
  },
]

// Mock transactions
export const mockTransactions = [
  {
    type: "supply" as const,
    asset: "USDC",
    amount: 10000,
    timestamp: Date.now() - 86400000 * 2, // 2 days ago
  },
]

// Function to simulate market changes
export function simulateMarketChanges(assets: any[]) {
  return assets.map((asset) => {
    // Don't change stablecoin prices
    const isStablecoin = ["USDC", "DAI", "USDT"].includes(asset.symbol)

    // Random price fluctuation (±2% for non-stablecoins)
    const priceChange = isStablecoin ? 0 : (Math.random() * 0.04 - 0.02) * asset.price
    const newPrice = isStablecoin ? 1 : Math.max(asset.price + priceChange, 0.01)

    // Random interest rate fluctuation (±0.2%)
    const supplyRateChange = Math.random() * 0.004 - 0.002
    const borrowRateChange = Math.random() * 0.004 - 0.002

    const newSupplyRate = Math.max(Math.min(asset.supplyRate + supplyRateChange, 0.1), 0.005)
    const newBorrowRate = Math.max(Math.min(asset.borrowRate + borrowRateChange, 0.15), newSupplyRate + 0.005)

    return {
      ...asset,
      price: newPrice,
      supplyRate: newSupplyRate,
      borrowRate: newBorrowRate,
    }
  })
}
