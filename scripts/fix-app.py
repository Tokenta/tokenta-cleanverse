import re
from pathlib import Path

p = Path(__file__).parents[1] / "src/app/App.tsx"
t = p.read_text(encoding="utf-8")

# Remove INVENTORY nav blocks
t = re.sub(
    r'\s*\{nav === "INVENTORY"[^}]+\}\s*\{nav === "INVENTORY"[^}]+\}\s*',
    "\n",
    t,
    flags=re.S,
)

repls = [
    ('role === "BUYER"', 'mode === "BUY"'),
    ('role === "SELLER"', 'mode === "SELL"'),
    ('role === "PLATFORM"', 'false /* removed platform mode */'),
    ('PLATFORM_DIRECT_PURCHASE', 'TOKENTA_DIRECT_PURCHASE'),
    ('buyerSub === "PLATFORM_DIRECT"', 'buySource === "TOKENTA_DIRECT"'),
    ('BuyerSubMode', 'BuyMarketSource'),
    ('SellerSubMode', 'SellMarketTab'),
    ('<VerifyView role={role}', '<VerifyView mode={mode}'),
    ('<ChatView role={role}', '<ChatView mode={mode} buySource={buySource}'),
    ('<ReputationView role={role}', '<ReputationView mode={mode}'),
    ('<AnalyticsView role={role}', '<AnalyticsView mode={mode}'),
    ('{nav === "WALLET"', '{false && nav === "WALLET"'),
    ('function VerifyView({ role }', 'function VerifyView({ mode }'),
    ('function ReputationView({ role }', 'function ReputationView({ mode }'),
    ('function AnalyticsView({ role }', 'function AnalyticsView({ mode }'),
    ('function ChatView({ role, activeOrderId }', 'function ChatView({ mode, buySource, activeOrderId }'),
    ('function SideNav({\n  nav,\n  setNav,\n  role,\n  buyerSub,', 'function SideNav({\n  nav,\n  setNav,\n  mode,\n  buySource,'),
    ('role: TradingMode;\n  buyerSub: BuyerSubMode;', 'mode: TradingMode;\n  buySource: BuyMarketSource;'),
    ('role: TradingMode;\n  buyerSub: BuyMarketSource;\n  sellerSub:', 'mode: TradingMode;\n  buySource: BuyMarketSource;\n  sellTab:'),
    ('role={role}', 'mode={mode}'),
    ('buyerSub={buyerSub}', 'buySource={buySource}'),
    ('sellerSub={sellerSub}', 'sellTab={sellTab}'),
    ('NAV.filter((n) => !n.platformOnly || role === "PLATFORM")', 'NAV_ITEMS.map((n) => n) /* was NAV.filter */'),
    ('{role} MODE', '{mode} MODE'),
    ('role === "SELLER" ?', 'mode === "SELL" ?'),
    ('const isBuyer = mode === "BUY"', 'const isBuy = mode === "BUY"'),
    ('const isPlatform = false', 'const isTokentaAlloc = false'),
    ('isPlatform ? "ALLOCATE', 'isTokentaAlloc ? "ALLOCATE'),
    ('isBuyer ?', 'isBuy ?'),
    ('TradePanel role={role}', 'TradePanel mode={mode}'),
    ('OrdersView\n              mode={mode}', 'OrdersView\n              mode={mode}'),
    ('role === "BUYER" ? o.side', 'mode === "BUY" ? o.side'),
    ('DepositBreakdownPanel totalUsdc={100.8} scenario="P2P"', 'DepositBreakdownPanel totalUsdc={100.8} scenario="P2P"'),
    ('PLATFORM_AS_SELLER', 'TOKENTA_AS_SELLER'),
    ('onMarketSource', 'onBuySourceChange'),
]
for a, b in repls:
    t = t.replace(a, b)

# Fix NAV_ITEMS usage in SideNav
t = t.replace(
    'NAV_ITEMS.map((n) => n) /* was NAV.filter */.map((n) => {',
    'NAV_ITEMS.map((n) => {',
)

# Add EscrowView if missing
if 'function EscrowView' not in t:
    escrow_fn = '''
function EscrowView({ mode }: { mode: TradingMode }) {
  const scenario = mode === "BUY" ? "TOKENTA_AS_SELLER" : "P2P";
  return (
    <div className="flex flex-1 flex-col min-h-0 p-4 gap-4">
      <div className="text-[10px] tracking-[0.22em] text-white/40">F3 · ESCROW STATUS</motion.div>
      <DepositBreakdownPanel totalUsdc={100.8} scenario={scenario as "P2P"} />
      <p className="text-[11px] text-white/55 max-w-xl">
        Counterparty-aware escrow: P2P locks bilateral deposits; Tokenta Direct waives buyer deposit; Tokenta Buyback holds seller deposit 30 days.
      </p>
    </motion.div>
  );
}

'''
    t = t.replace('function VerifyView({ mode }', escrow_fn + 'function VerifyView({ mode }')

# MarketView signature block
old_mv = '''function MarketView({
  mode,
  buySource,
  sellerSub,'''
if 'function MarketView' in t and 'onBuySourceChange' not in t.split('function MarketView')[1][:800]:
    t = re.sub(
        r'function MarketView\(\{[^}]+\}: \{[^}]+\}\) \{',
        '''function MarketView({
  mode,
  buySource,
  sellTab,
  onBuySourceChange,
  onSellTabChange,
  active,
  setSelectedAsset,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  onListApi,
  onBuyApi,
  onSellToTokenta,
}: {
  mode: TradingMode;
  buySource: BuyMarketSource;
  sellTab: SellMarketTab;
  onBuySourceChange: (s: BuyMarketSource) => void;
  onSellTabChange: (t: SellMarketTab) => void;
  active: typeof assets[0];
  setSelectedAsset: (id: string) => void;
  filters: MarketFilters;
  onFiltersChange: (f: MarketFilters) => void;
  sort: MarketSortKey;
  onSortChange: (s: MarketSortKey) => void;
  onListApi: () => void;
  onBuyApi: () => void;
  onSellToTokenta: () => void;
}) {''',
        t,
        count=1,
    )

p.write_text(t, encoding="utf-8")
print("wrote App.tsx")
