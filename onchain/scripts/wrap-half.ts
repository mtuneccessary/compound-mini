import "dotenv/config"
import { ethers } from "ethers"
import { getProvider, loadAbi } from "../tasks/utils.ts"

async function main() {
	const provider = getProvider()
	const accounts = await provider.listAccounts()
	const WETH_ADDR = process.env.WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
	const wethAbi = loadAbi("abis/WETH.json")

	const num = Math.min(accounts.length, 10)
	console.log(`Wrapping half ETH to WETH for ${num} accounts...`)
	for (let i = 0; i < num; i++) {
		const signer = await provider.getSigner(i)
		const addr = await signer.getAddress()
		const weth = new ethers.Contract(WETH_ADDR, wethAbi, signer)
		const bal = await provider.getBalance(addr)
		// wrap half minus a small buffer for gas
		const half = bal / BigInt(2)
		const buffer = ethers.parseEther("0.01")
		const wrapAmt = half > buffer ? half - buffer : BigInt(0)
		if (wrapAmt === BigInt(0)) {
			console.log(`[${i}] ${addr} skip, low balance`)
			continue
		}
		console.log(`[${i}] ${addr} wrapping`, wrapAmt.toString())
		await (await weth.deposit({ value: wrapAmt })).wait()
	}
	console.log("Done.")
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
}) 