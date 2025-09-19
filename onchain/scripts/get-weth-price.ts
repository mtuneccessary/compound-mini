import { ethers } from "ethers"
import { getProvider } from "../tasks/utils"

async function main() {
    const provider = getProvider()
    console.log("Fetching real WETH price from Chainlink...")

    // Chainlink ETH/USD Price Feed on Ethereum Mainnet
    const CHAINLINK_ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
    
    // Chainlink Price Feed ABI (simplified)
    const priceFeedAbi = [
        "function latestRoundData() external view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
    ]

    try {
        const priceFeed = new ethers.Contract(CHAINLINK_ETH_USD_FEED, priceFeedAbi, provider)
        
        console.log("Fetching latest ETH/USD price from Chainlink...")
        const roundData = await priceFeed.latestRoundData()
        
        // Chainlink prices have 8 decimal places
        const ethPrice = Number(roundData.price) / 1e8
        
        console.log("✅ Chainlink ETH/USD Price Feed Data:")
        console.log(`   Round ID: ${roundData.roundId}`)
        console.log(`   ETH Price: $${ethPrice.toFixed(2)}`)
        console.log(`   Started At: ${new Date(Number(roundData.startedAt) * 1000).toISOString()}`)
        console.log(`   Updated At: ${new Date(Number(roundData.updatedAt) * 1000).toISOString()}`)
        console.log(`   Answered In Round: ${roundData.answeredInRound}`)
        
        // Verify the price is reasonable (between $1000 and $10000)
        if (ethPrice < 1000 || ethPrice > 10000) {
            console.warn("⚠️ WARNING: ETH price seems unusual. Please verify the price feed.")
        } else {
            console.log("✅ Price looks reasonable for ETH")
        }

        // Also try to get the price from the Comet contract if it has price feed access
        console.log("\n🔍 Checking if Comet contract has price feed access...")
        const COMET_ADDRESS = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
        
        // Try to call a function that might return price data
        // Note: This might not work as Comet might not expose price feeds directly
        try {
            const cometAbi = [
                "function getAssetInfo(address asset) external view returns (bool isAllowed, uint8 priceFeedDecimals, address priceFeed, uint64 maxSupply, uint64 liquidationThreshold, uint64 liquidationFactor, uint16 collateralFactor, uint64 borrowMin, uint64 borrowMax, uint64 supplyKink, uint64 supplyPerYearInterestRateBase, uint64 supplyPerYearInterestRateSlopeLow, uint64 supplyPerYearInterestRateSlopeHigh, uint64 borrowPerYearInterestRateBase, uint64 borrowPerYearInterestRateSlopeLow, uint64 borrowPerYearInterestRateSlopeHigh, uint64 storeFrontPriceFactor, uint64 trackingIndexScale, uint256 baseTrackingBorrowSpeed, uint256 baseTrackingSupplySpeed, uint256 baseMinForRewards, uint256 baseBorrowMin, uint256 targetReserves)"
            ]
            
            const comet = new ethers.Contract(COMET_ADDRESS, cometAbi, provider)
            const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            
            console.log("Fetching WETH asset info from Comet...")
            const assetInfo = await comet.getAssetInfo(WETH_ADDRESS)
            
            console.log("✅ Comet WETH Asset Info:")
            console.log(`   Is Allowed: ${assetInfo.isAllowed}`)
            console.log(`   Price Feed Decimals: ${assetInfo.priceFeedDecimals}`)
            console.log(`   Price Feed Address: ${assetInfo.priceFeed}`)
            console.log(`   Liquidation Factor: ${assetInfo.liquidationFactor}`)
            console.log(`   Collateral Factor: ${assetInfo.collateralFactor}`)
            
            // If there's a price feed address, try to get the price from it
            if (assetInfo.priceFeed !== "0x0000000000000000000000000000000000000000") {
                console.log(`\n🔍 Fetching price from Comet's price feed: ${assetInfo.priceFeed}`)
                
                const cometPriceFeed = new ethers.Contract(assetInfo.priceFeed, priceFeedAbi, provider)
                const cometRoundData = await cometPriceFeed.latestRoundData()
                const cometEthPrice = Number(cometRoundData.price) / Math.pow(10, assetInfo.priceFeedDecimals)
                
                console.log("✅ Comet Price Feed Data:")
                console.log(`   ETH Price: $${cometEthPrice.toFixed(2)}`)
                console.log(`   Updated At: ${new Date(Number(cometRoundData.updatedAt) * 1000).toISOString()}`)
                
                // Compare prices
                const priceDiff = Math.abs(ethPrice - cometEthPrice)
                const priceDiffPercent = (priceDiff / ethPrice) * 100
                
                console.log(`\n📊 Price Comparison:`)
                console.log(`   Chainlink: $${ethPrice.toFixed(2)}`)
                console.log(`   Comet: $${cometEthPrice.toFixed(2)}`)
                console.log(`   Difference: $${priceDiff.toFixed(2)} (${priceDiffPercent.toFixed(2)}%)`)
                
                if (priceDiffPercent > 5) {
                    console.warn("⚠️ WARNING: Significant price difference between feeds!")
                } else {
                    console.log("✅ Prices are consistent between feeds")
                }
            }
            
        } catch (error) {
            console.log("ℹ️ Comet contract doesn't expose price feed data directly")
        }

    } catch (error) {
        console.error("❌ Error fetching price data:", error)
    }
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
