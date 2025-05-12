import type { FC } from "react"

interface CryptoIconProps {
  symbol: string
  size?: number
  className?: string
}

export const CryptoIcon: FC<CryptoIconProps> = ({ symbol, size = 24, className = "" }) => {
  const getIconBySymbol = (symbol: string) => {
    const lowerSymbol = symbol.toLowerCase()

    switch (lowerSymbol) {
      case "usdc":
        return (
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="16" cy="16" r="16" fill="#2775CA" />
            <path
              d="M16 25.5C21.2467 25.5 25.5 21.2467 25.5 16C25.5 10.7533 21.2467 6.5 16 6.5C10.7533 6.5 6.5 10.7533 6.5 16C6.5 21.2467 10.7533 25.5 16 25.5Z"
              fill="#2775CA"
            />
            <path
              d="M16.5822 13.2582V11.6178H19.8311V9.25333H12.1689V11.6178H15.4178V13.2582C12.2133 13.4844 9.77778 14.8622 9.77778 16.5333C9.77778 18.2044 12.2133 19.5822 15.4178 19.8311V24.7467H16.5822V19.8311C19.7867 19.6049 22.2222 18.2044 22.2222 16.5333C22.2222 14.8622 19.7867 13.4844 16.5822 13.2582ZM16.5822 19.0756V18.6933H15.4178V19.0756C12.8 18.8722 10.8444 17.8222 10.8444 16.5333C10.8444 15.2444 12.8 14.1944 15.4178 13.9911V17.5467H16.5822V13.9911C19.2 14.1944 21.1556 15.2444 21.1556 16.5333C21.1556 17.8222 19.2 18.8722 16.5822 19.0756Z"
              fill="white"
            />
          </svg>
        )
      case "eth":
        return (
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="16" cy="16" r="16" fill="#627EEA" />
            <path d="M16.498 4V12.87L23.995 16.22L16.498 4Z" fill="white" fillOpacity="0.602" />
            <path d="M16.498 4L9 16.22L16.498 12.87V4Z" fill="white" />
            <path d="M16.498 21.968V27.995L24 17.616L16.498 21.968Z" fill="white" fillOpacity="0.602" />
            <path d="M16.498 27.995V21.967L9 17.616L16.498 27.995Z" fill="white" />
            <path d="M16.498 20.573L23.995 16.22L16.498 12.872V20.573Z" fill="white" fillOpacity="0.2" />
            <path d="M9 16.22L16.498 20.573V12.872L9 16.22Z" fill="white" fillOpacity="0.602" />
          </svg>
        )
      case "wbtc":
        return (
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="16" cy="16" r="16" fill="#F7931A" />
            <path
              d="M22.818 14.354c.216-1.437-.88-2.21-2.377-2.726l.485-1.949-1.186-.295-.473 1.896c-.312-.078-.632-.151-.95-.224l.476-1.91-1.185-.295-.486 1.949c-.258-.059-.512-.117-.758-.178v-.006l-1.636-.408-.315 1.267s.88.202.861.214c.48.12.567.438.553.69l-.553 2.218c.033.008.076.02.123.039l-.125-.031-.775 3.107c-.059.146-.208.365-.544.282.012.017-.862-.215-.862-.215l-.589 1.357 1.544.385c.287.072.568.147.845.218l-.49 1.968 1.185.295.486-1.95c.324.088.638.169.946.245l-.485 1.943 1.186.295.49-1.965c2.025.383 3.548.229 4.188-1.603.516-1.476-.026-2.328-1.09-2.882.776-.179 1.36-.69 1.516-1.745zm-2.712 3.808c-.366 1.476-2.845.678-3.65.478l.652-2.614c.804.2 3.384.597 2.998 2.136zm.367-3.828c-.334 1.338-2.398.658-3.07.491l.592-2.371c.67.167 2.83.48 2.478 1.88z"
              fill="white"
            />
          </svg>
        )
      case "dai":
        return (
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="16" cy="16" r="16" fill="#F5AC37" />
            <path
              d="M16.22 23.312H10.156V16.576H16.22C18.707 16.576 20.644 17.824 20.644 19.944C20.644 22.064 18.707 23.312 16.22 23.312ZM16.22 8.688C18.707 8.688 20.644 9.936 20.644 12.056C20.644 14.176 18.707 15.424 16.22 15.424H10.156V8.688H16.22ZM16.22 7.536H9V24.464H16.22C19.356 24.464 21.8 22.576 21.8 19.944V19.936C21.8 18.032 20.644 16.576 19.044 15.992C20.644 15.408 21.8 13.96 21.8 12.056C21.8 9.424 19.356 7.536 16.22 7.536Z"
              fill="white"
            />
          </svg>
        )
      case "usdt":
        return (
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="16" cy="16" r="16" fill="#26A17B" />
            <path
              d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
              fill="white"
            />
          </svg>
        )
      default:
        // Default icon for unknown symbols
        return (
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="16" cy="16" r="16" fill="#CCCCCC" />
            <text x="16" y="20" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">
              {symbol.substring(0, 2).toUpperCase()}
            </text>
          </svg>
        )
    }
  }

  return <div style={{ width: size, height: size, display: "inline-block" }}>{getIconBySymbol(symbol)}</div>
}
