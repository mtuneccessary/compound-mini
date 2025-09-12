import "dotenv/config"
import { ethers } from "ethers"
import { getCometContract, getProvider, loadAbi, getEnvAddress } from "../tasks/utils.ts"

async function main() {
	const provider = getProvider()
	const signer = await provider.getSigner()
	const me = await signer.getAddress()
	console.log("Seeding account:", me)

	const latest = await provider.getBlock("latest")
	const base = latest!.baseFeePerGas ?? 0n
	const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei")
	const maxFeePerGas = base * 2n + maxPriorityFeePerGas
	const txOpts = { maxFeePerGas, maxPriorityFeePerGas }

	const WETH_ADDR = process.env.WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
	const wrapAmt = ethers.parseEther("0.5")
	const wethAbi = loadAbi("abis/WETH.json")
	const weth = new ethers.Contract(WETH_ADDR, wethAbi, signer)

	console.log("Wrapping:", wrapAmt.toString())
	await (await weth.deposit({ value: wrapAmt, ...txOpts })).wait()

	console.log("Approving WETH to Comet...")
	await (await weth.approve(getEnvAddress("COMET_ADDRESS"), wrapAmt, txOpts)).wait()

	const comet = getCometContract(signer)
	console.log("Supplying WETH as collateral...")
	await (await comet.supply(WETH_ADDR, wrapAmt, txOpts)).wait()

	console.log("Seed complete.")
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
}) 