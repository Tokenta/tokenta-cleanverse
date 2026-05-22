from pathlib import Path
p = Path(__file__).parents[1] / "src/app/App.tsx"
t = p.read_text(encoding="utf-8")

t = t.replace("  role: TradingMode;\n  buyerSub: BuyMarketSource;", "  mode: TradingMode;\n  buySource: BuyMarketSource;", 1)
t = t.replace("{NAV.filter((n) => !n.platformOnly || false /* removed platform mode */)", "NAV_ITEMS")
t = t.replace('<span className="tracking-[0.14em]">{n.label}</span>', '<span className="tracking-[0.14em]">{n.label[mode]}</span>')
t = t.replace("function MarketView({\n  role,\n  buyerSub,\n  sellerSub,", "function MarketView({\n  mode,\n  buySource,\n  sellTab,\n  onBuySourceChange,\n  onSellTabChange,\n  onSellToTokenta,")
t = t.replace('onBuySourceChange: (s: "P2P" | "PLATFORM") => void;', "onBuySourceChange: (s: BuyMarketSource) => void;\n  onSellTabChange: (t: SellMarketTab) => void;\n  onSellToTokenta: () => void;")
t = t.replace("        onBuySourceChange={onBuySourceChange}\n        onListApi={onListApi}", "        onBuySourceChange={onBuySourceChange}\n        onSellTabChange={onSellTabChange}\n        onSellToTokenta={onSellToTokenta}\n        onListApi={onListApi}")
t = t.replace("function TradePanel({\n  role,", "function TradePanel({\n  mode,")
t = t.replace("  role: TradingMode;\n  active: typeof assets[0];", "  mode: TradingMode;\n  active: typeof assets[0];", 1)
t = t.replace("function VerifyView({ mode }: { role: TradingMode })", "function VerifyView({ mode }: { mode: TradingMode })")
t = t.replace("function BottomBar({ nav }: { nav: NavKey })", "function BottomBar({ nav, mode }: { nav: NavKey; mode: TradingMode })")
t = t.replace(
    'const shortcuts: [string, string][] = [\n    ["F1","MARKET"], ["F2","VERIFY"], ["F3","ORDERS"], ["F4","CHAT"],\n    ["F5","REPUTATION"], ["F6","WALLET"], ["F7","ANALYTICS"], ["F8","INVENTORY"], ["⌘K","COMMAND"],\n  ];',
    'const shortcuts = NAV_ITEMS.map((n) => [n.code, n.label[mode]] as [string, string]).concat([["⌘K", "COMMAND"]]);',
)
t = t.replace('{nav === "WALLET" && <WalletView', '{false && nav === "WALLET" && <WalletView')
t = t.replace("scenario={scenario as \"P2P\"}", "scenario={scenario}")

p.write_text(t, encoding="utf-8")
print("ok")
