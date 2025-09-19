import { task } from "hardhat/config"
import { ethers } from "ethers"
import { getCometContract, getErc20Contract, getProvider, getEnvAddress } from "./utils"

function formatUnits(value: bigint, decimals = 18) {
	return ethers.formatUnits(value, decimals)
}

task("comet:info", "Show basic Comet info").setAction(async () => {
	const comet = getCometContract(getProvider())
	const [symbol, name, baseToken, numAssets, totalSupply, totalBorrow] = await Promise.all([
		comet.symbol(),
		comet.name(),
		comet.baseToken(),
		comet.numAssets(),
		comet.totalSupply(),
		comet.totalBorrow(),
	])
	console.log("Comet:", name, symbol)
	console.log("Base token:", baseToken)
	console.log("numAssets:", numAssets)
	console.log("totalSupply (base):", totalSupply.toString())
	console.log("totalBorrow (base):", totalBorrow.toString())
})

task("comet:rates", "Show utilization and current supply/borrow APR").setAction(async () => {
	const comet = getCometContract(getProvider())
	const utilization: bigint = await comet.getUtilization()
	const [supplyRate, borrowRate] = await Promise.all([
		comet.getSupplyRate(utilization),
		comet.getBorrowRate(utilization),
	])
	const secondsPerYear = 31536000n
	const denom = 10n ** 18n
	const supplyApr = Number((BigInt(supplyRate) * secondsPerYear * 100n) / denom)
	const borrowApr = Number((BigInt(borrowRate) * secondsPerYear * 100n) / denom)
	console.log("Utilization (1e18):", utilization.toString())
	console.log("Supply APR %:", supplyApr)
	console.log("Borrow APR %:", borrowApr)
})

task("token:approve", "Approve ERC20 to Comet")
	.addParam("asset", "ERC20 address")
	.addParam("amount", "Amount in raw units")
	.setAction(async ({ asset, amount }) => {
		const provider = getProvider()
		const signer = await provider.getSigner()
		const erc20 = getErc20Contract(asset, signer)
		const tx = await erc20.approve(getEnvAddress("COMET_ADDRESS"), amount)
		console.log("approve tx:", tx.hash)
		await tx.wait()
		console.log("approved")
	})

task("comet:supply", "Supply asset to Comet")
	.addParam("asset", "ERC20 address")
	.addParam("amount", "Amount in raw units")
	.setAction(async ({ asset, amount }) => {
		const provider = getProvider()
		const signer = await provider.getSigner()
		const comet = getCometContract(signer)
		const tx = await comet.supply(asset, amount)
		console.log("supply tx:", tx.hash)
		await tx.wait()
		console.log("supplied")
	})

task("comet:withdraw", "Withdraw asset from Comet (base borrow or redeem collateral)")
	.addParam("asset", "Asset address")
	.addParam("amount", "Amount in raw units")
	.setAction(async ({ asset, amount }) => {
		const provider = getProvider()
		const signer = await provider.getSigner()
		const comet = getCometContract(signer)
		const tx = await comet.withdraw(asset, amount)
		console.log("withdraw tx:", tx.hash)
		await tx.wait()
		console.log("withdrawn")
	})

task("comet:account", "Show account base and collateral balances")
	.addOptionalParam("account", "Account address; default signer[0]")
	.addOptionalParam("asset", "Collateral to check")
	.setAction(async ({ account, asset }) => {
		const provider = getProvider()
		const signer = await provider.getSigner()
		const address = account || (await signer.getAddress())
		const comet = getCometContract(provider)
		const [suppliedBase, borrowedBase] = await Promise.all([
			comet.balanceOf(address),
			comet.borrowBalanceOf(address),
		])
		console.log("Account:", address)
		console.log("base supplied:", suppliedBase.toString())
		console.log("base borrowed:", borrowedBase.toString())
		if (asset) {
			const bal = await comet.collateralBalanceOf(address, asset)
			console.log(`collateral[${asset}]:`, bal.toString())
		}
	}) 