import "dotenv/config"
import { ethers } from "ethers"
import { getProvider } from "../tasks/utils.ts"

async function main() {
	const provider = getProvider()
	
	// Common Compound Comet v3 addresses on mainnet
	const cometAddresses = [
		"0xc3d688B66703497DAA19211EEdff47f25384cdc3", // USDC Comet
		"0xA17581A9E3356d9A858b789D68B4d866e593aE94", // WETH Comet
		"0x46e6b214b524310239732D51387075E0e70970bf", // WBTC Comet
	]
	
	console.log("Checking Compound Comet v3 contracts on mainnet fork...")
	console.log("RPC URL:", process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545")
	
	for (const address of cometAddresses) {
		try {
			console.log(`\nChecking ${address}...`)
			
			// Check if contract exists
			const code = await provider.getCode(address)
			if (code === "0x") {
				console.log(`  ❌ No contract at ${address}`)
				continue
			}
			
			// Try to call a simple function
			const contract = new ethers.Contract(address, [
				"function name() view returns (string)",
				"function symbol() view returns (string)",
				"function baseToken() view returns (address)",
				"function totalSupply() view returns (uint256)"
			], provider)
			
			try {
				const [name, symbol, baseToken, totalSupply] = await Promise.all([
					contract.name(),
					contract.symbol(),
					contract.baseToken(),
					contract.totalSupply()
				])
				
				console.log(`  ✅ Contract found:`)
				console.log(`     Name: ${name}`)
				console.log(`     Symbol: ${symbol}`)
				console.log(`     Base Token: ${baseToken}`)
				console.log(`     Total Supply: ${ethers.formatUnits(totalSupply, 6)}`)
			} catch (error) {
				console.log(`  ⚠️  Contract exists but error calling functions: ${error.message}`)
			}
			
		} catch (error) {
			console.log(`  ❌ Error checking ${address}: ${error.message}`)
		}
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
