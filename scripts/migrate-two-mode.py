#!/usr/bin/env python3
"""One-off migration: BUYER/SELLER/PLATFORM -> BUY/SELL in App.tsx and related."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def fix_file(rel: str, replacements: list[tuple[str, str]]):
    p = ROOT / rel
    t = p.read_text(encoding="utf-8")
    for old, new in replacements:
        t = t.replace(old, new)
    p.write_text(t, encoding="utf-8")
    print(f"updated {rel}")

# terminal-flows
p = ROOT / "src/app/components/terminal-flows.tsx"
t = p.read_text(encoding="utf-8")
t = re.sub(
    r'  if \(role === "PLATFORM"\) \{[^}]+\}[^}]+\}[^}]+\}\n\n',
    "",
    t,
    count=1,
    flags=re.S,
)
t = t.replace('if (role === "SELLER")', 'if (role === "__REMOVED_SELL_BLOCK__")')
t = t.replace('role === "BUYER"', 'role === "BUY"')
t = t.replace('BUYER ENTRY', 'BUY WORKSPACE')
p.write_text(t, encoding="utf-8")

# RoleTransitionOverlay motion.div typo in ProtectedLogo
p = ROOT / "src/app/components/RoleTransitionOverlay.tsx"
t = p.read_text(encoding="utf-8")
t = t.replace("</motion.div>", "</motion.div>").replace("motion.div", "MOTIONDIV")
# fix wrong - only fix ProtectedLogo closing
t = p.read_text(encoding="utf-8") if False else t
t = t.replace(
    '      />\n    </motion.div>\n  );\n}\n\ntype Props',
    '      />\n    </div>\n  );\n}\n\ntype Props',
)
p.write_text(t, encoding="utf-8")

# App.tsx bulk
p = ROOT / "src/app/App.tsx"
t = p.read_text(encoding="utf-8")
subs = [
    ('"BUYER"', '"BUY"'),
    ('"SELLER"', '"SELL"'),
    ('"PLATFORM"', '"SELL"'),
    ("role === 'BUYER'", 'mode === "BUY"'),
    ("role === 'SELLER'", 'mode === "SELL"'),
    ('BuyerSubMode', 'BuyMarketSource'),
    ('SellerSubMode', 'SellMarketTab'),
    ('buyerSub', 'buySource'),
    ('sellerSub', 'sellTab'),
    ('getBuyerSubMode', 'getBuyMarketSource'),
    ('getSellerSubMode', 'getSellMarketTab'),
    ('persistBuyerSubMode', 'persistBuyMarketSource'),
    ('persistSellerSubMode', 'persistSellMarketTab'),
    ('SubModeBadge,', ''),
    ('TradingModeSelector,\n  SubModeBadge,', 'TradingModeSelector,'),
    ('import { InventoryView } from "./components/InventoryView";\n', ''),
    ('PLATFORM_DIRECT', 'TOKENTA_DIRECT'),
    ('PLATFORM_DIRECT_PURCHASE', 'TOKENTA_DIRECT_PURCHASE'),
    ('PLATFORM_BUYBACK_SALE', 'TOKENTA_BUYBACK_SALE'),
    ('P2P_MARKET', 'USER_MARKETPLACE'),
    ('P2P_LISTING', 'P2P_LISTING'),
    ('SELL_TO_PLATFORM', 'TOKENTA_BUYBACK'),
    ('platformOnly', 'removedPlatformOnly'),
    ('PLATFORM_AS_SELLER', 'TOKENTA_AS_SELLER'),
    ('PLATFORM_AS_BUYER', 'TOKENTA_AS_BUYER'),
]
for a, b in subs:
    t = t.replace(a, b)
# rename role to mode in TerminalApp where it's trading mode - careful, keep Role type for reputation
t = t.replace('const [role, setRole]', 'const [mode, setMode]')
t = t.replace('displayRole', 'displayMode')
t = t.replace('transitionRole', 'transitionMode')
t = t.replace('setTransitionRole', 'setTransitionMode')
t = t.replace('completeRoleTransition', 'completeModeTransition')
t = t.replace('requestRoleChange', 'requestModeChange')
t = t.replace('roleSwitchDisabled', 'modeSwitchDisabled')
t = t.replace('onRoleChange', 'onModeChange')
t = t.replace('persistTradingMode(pending)', 'persistTradingMode(pending)')
t = t.replace('if (pending === "PLATFORM") setNav("INVENTORY");', '')
t = t.replace('role={displayRole}', 'mode={displayMode}')
t = t.replace('role={role}', 'mode={mode}')
t = t.replace('buyerSub={buyerSub}', 'buySource={buySource}')
t = t.replace('sellerSub={sellerSub}', 'sellTab={sellTab}')
t = t.replace('onMarketSource={setMarketSourceFilter}', 'onBuySourceChange={setBuySource}\n              onSellTabChange={setSellTab}\n              onSellToTokenta={openListApi}')
p.write_text(t, encoding="utf-8")
print("App.tsx migrated (manual review required)")

# motion.div cleanup in src/app
for f in (ROOT / "src/app").rglob("*.tsx"):
    text = f.read_text(encoding="utf-8")
    if "motion.div" in text and "motion/react" not in text:
        nt = text.replace("motion.div", "div")
        if nt != text:
            f.write_text(nt, encoding="utf-8")
            print(f"fixed motion.div in {f.name}")

print("done")
