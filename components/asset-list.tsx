"use client"

import { useCompound } from "@/lib/compound-provider"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import Image from "next/image"

interface AssetListProps {
  type: "supplied" | "borrowed"
}

export function AssetList({ type }: AssetListProps) {
  const { suppliedAssets, borrowedAssets } = useCompound()

  const assets = type === "supplied" ? suppliedAssets : borrowedAssets

  if (assets.length === 0) {
    return <div className="bg-[#252836] rounded-lg p-3 text-center text-gray-400 text-sm">No {type} assets yet</div>
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <div key={asset.symbol} className="bg-[#252836] rounded-lg p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image
                src={`/placeholder.svg?height=32&width=32&text=${asset.symbol}`}
                alt={asset.name}
                width={32}
                height={32}
                className="rounded-full"
              />
            </div>
            <div>
              <div className="font-medium">{asset.symbol}</div>
              <div className="text-xs text-gray-400">{asset.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div>{formatCurrency(asset.amount, asset.symbol)}</div>
            <div className="text-xs text-gray-400">
              {type === "supplied" ? "APY" : "APR"}: {formatPercentage(asset.interestRate)}
            </div>
            <div className="text-xs text-gray-400">Value: {formatCurrency(asset.amount * asset.price)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
