import "dotenv/config"
import { ethers } from "ethers"
import { getCometContract, getErc20Contract, getProvider, loadAbi, getEnvAddress } from "../tasks/utils.ts"

async function main() {
	const provider = getProvider()
	const signer = await provider.getSigner()
	const me = await signer.getAddress()
	console.log("Signer:", me)

	const latest = await provider.getBlock("latest")
	const base = latest!.baseFeePerGas ?? 0n
	const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei")
	const maxFeePerGas = base * 2n + maxPriorityFeePerGas
	const txOpts = { maxFeePerGas, maxPriorityFeePerGas }

	const WETH_ADDR = process.env.WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
	const USDC_ADDR = process.env.USDC_ADDRESS!
	const comet = getCometContract(signer)

	// 1) Wrap 0.5 ETH to WETH (more collateral to satisfy borrow limits)
	const wethAbi = loadAbi("abis/WETH.json")
	const weth = new ethers.Contract(WETH_ADDR, wethAbi, signer)
	const wrapAmt = ethers.parseEther("0.5")
	console.log("Wrapping ETH -> WETH:", wrapAmt.toString())
	await (await weth.deposit({ value: wrapAmt, ...txOpts })).wait()

	// 2) Approve WETH to Comet
	console.log("Approving WETH to Comet...")
	await (await weth.approve(getEnvAddress("COMET_ADDRESS"), wrapAmt, txOpts)).wait()

	// 3) Supply WETH as collateral
	console.log("Supplying WETH as collateral...")
	await (await comet.supply(WETH_ADDR, wrapAmt, txOpts)).wait()

	// 4) Determine minimum borrow and borrow USDC via withdraw(base)
	const minBorrow: bigint = await comet.baseBorrowMin()
	const borrowAmt = minBorrow
	console.log("baseBorrowMin (USDC raw):", borrowAmt.toString())
	const canBorrow: boolean = await comet.isBorrowCollateralized(me)
	console.log("isBorrowCollateralized before borrow:", canBorrow)
	console.log("Borrowing USDC:", borrowAmt.toString())
	await (await comet.withdraw(USDC_ADDR, borrowAmt, txOpts)).wait()

	const usdc = getErc20Contract(USDC_ADDR, provider)
	const usdcBal = await usdc.balanceOf(me)
	console.log("USDC wallet balance:", usdcBal.toString())
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
}) 