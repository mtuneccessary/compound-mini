import "dotenv/config"
import { ethers } from "ethers"
import { getProvider } from "../tasks/utils.ts"

async function main() {
	const provider = getProvider()
	const COMET_ADDRESS = "0xc3d688B66703497DAA19211EEdff47f25384cdc3" // USDC Comet
	const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
	const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
	
	// Test account
	const testAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
	
	console.log("Testing positions for:", testAccount)
	console.log("Using COMET_ADDRESS:", COMET_ADDRESS)
	console.log("Using WETH_ADDRESS:", WETH_ADDRESS)
	console.log("Using USDC_ADDRESS:", USDC_ADDRESS)
	
	const cometAbi = [
		"function balanceOf(address) view returns (uint256)",
		"function borrowBalanceOf(address) view returns (uint256)",
		"function collateralBalanceOf(address, address) view returns (uint256)",
		"function baseToken() view returns (address)"
	]
	
	const wethAbi = [
		"function balanceOf(address) view returns (uint256)",
		"function decimals() view returns (uint8)",
		"function symbol() view returns (string)"
	]
	
	const comet = new ethers.Contract(COMET_ADDRESS, cometAbi, provider)
	const weth = new ethers.Contract(WETH_ADDRESS, wethAbi, provider)
	const usdc = new ethers.Contract(USDC_ADDRESS, wethAbi, provider)
	
	try {
		// Get base token info (USDC)
		const baseToken = await comet.baseToken()
		const [baseSymbol, baseDecimals, usdcSymbol, usdcDecimals] = await Promise.all([
			usdc.symbol(),
			usdc.decimals(),
			usdc.symbol(),
			usdc.decimals()
		])
		
		console.log(`Base Token: ${baseToken} (${baseSymbol}, ${baseDecimals} decimals)`)
		
		// Get positions
		const [baseSupplied, baseBorrowed, collateralWeth, wethBalance, usdcBalance] = await Promise.all([
			comet.balanceOf(testAccount),
			comet.borrowBalanceOf(testAccount),
			comet.collateralBalanceOf(testAccount, WETH_ADDRESS),
			weth.balanceOf(testAccount),
			usdc.balanceOf(testAccount)
		])
		
		console.log("\n=== WALLET BALANCES ===")
		console.log(`WETH Wallet: ${ethers.formatEther(wethBalance)}`)
		console.log(`USDC Wallet: ${ethers.formatUnits(usdcBalance, usdcDecimals)}`)
		
		console.log("\n=== COMPOUND POSITIONS ===")
		console.log(`WETH Collateral: ${ethers.formatEther(collateralWeth)}`)
		console.log(`USDC Supplied: ${ethers.formatUnits(baseSupplied, baseDecimals)}`)
		console.log(`USDC Borrowed: ${ethers.formatUnits(baseBorrowed, baseDecimals)}`)
		
		// Check if any positions exist
		const hasPositions = baseSupplied > 0 || baseBorrowed > 0 || collateralWeth > 0
		console.log(`\nHas Positions: ${hasPositions ? '✅ YES' : '❌ NO'}`)
		
		if (!hasPositions) {
			console.log("\n💡 To create positions:")
			console.log("1. Supply WETH as collateral to Compound (use the Supply page)")
			console.log("2. Borrow USDC against your WETH collateral (use the Borrow page)")
		}
		
	} catch (error) {
		console.error("Error fetching positions:", error)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
