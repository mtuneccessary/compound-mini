import "dotenv/config"
import { ethers } from "ethers"
import { getProvider, loadAbi } from "../tasks/utils.ts"

async function main() {
	const provider = getProvider()
	const signer = await provider.getSigner(0) // Use first account
	const addr = await signer.getAddress()
	const WETH_ADDR = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
	const wethAbi = loadAbi("abis/WETH.json")

	console.log(`Wrapping ETH to WETH for ${addr}...`)
	
	// Check current balance
	const ethBalance = await provider.getBalance(addr)
	console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`)
	
	// Wrap 1 ETH (leave plenty for gas)
	const wrapAmount = ethers.parseEther("1.0")
	
	console.log(`Wrapping ${ethers.formatEther(wrapAmount)} ETH to WETH...`)
	
	const weth = new ethers.Contract(WETH_ADDR, wethAbi, signer)
	
	// Use higher gas price for mainnet fork
	const gasPrice = ethers.parseUnits("20", "gwei") // 20 gwei
	
	const tx = await weth.deposit({ 
		value: wrapAmount,
		gasPrice: gasPrice
	})
	
	console.log(`Transaction sent: ${tx.hash}`)
	await tx.wait()
	
	console.log("✅ Successfully wrapped ETH to WETH!")
	
	// Check WETH balance
	const wethBalance = await weth.balanceOf(addr)
	console.log(`WETH Balance: ${ethers.formatEther(wethBalance)} WETH`)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
