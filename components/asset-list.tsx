"use client"

import { useCompound } from "@/lib/compound-provider"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { CryptoIcon } from "./crypto-icon"

interface AssetListProps {
  type: "supplied" | "borrowed"
}

export function AssetList({ type }: AssetListProps) {
  const { suppliedAssets, borrowedAssets } = useCompound()

  const assets = type === "supplied" ? suppliedAssets : borrowedAssets

  if (assets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-center text-sm text-muted-foreground">
        No {type} assets yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <div
          key={asset.symbol}
          className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3"
        >
          <div className="flex items-center gap-2">
            <CryptoIcon symbol={asset.symbol} size={32} />
            <div>
              <div className="font-medium">{asset.symbol}</div>
              <div className="text-xs text-muted-foreground">{asset.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div>{formatCurrency(asset.amount, asset.symbol)}</div>
            <div className="text-xs text-muted-foreground">
              {type === "supplied" ? "APY" : "APR"}: {formatPercentage(asset.interestRate)}
            </div>
            <div className="text-xs text-muted-foreground">Value: {formatCurrency(asset.amount * asset.price)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
