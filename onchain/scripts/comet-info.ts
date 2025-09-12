import "dotenv/config"
import { getCometContract, getProvider } from "../tasks/utils.ts"

async function main() {
	const comet = getCometContract(getProvider())
	const [symbol, name, baseToken, numAssets, totalSupply, totalBorrow] = await Promise.all([
		comet.symbol(),
		comet.name(),
		comet.baseToken(),
		comet.numAssets(),
		comet.totalSupply(),
		comet.totalBorrow(),
	])
	console.log({ symbol, name, baseToken, numAssets: Number(numAssets), totalSupply: totalSupply.toString(), totalBorrow: totalBorrow.toString() })
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
}) 