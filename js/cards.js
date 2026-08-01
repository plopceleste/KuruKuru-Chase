const CARDS = {
veil: { name: "smoke veil", type: "active", rarity: "rare", cd: 30, desc: "ghosts lose your trail for 4s", onUse: (g) => { g.veilTimer = 4; } },
snap: { name: "cold snap", type: "active", rarity: "rare", cd: 40, desc: "freeze every ghost for 4s", onUse: (g) => { g.timeStop = 4; } },
anchor: { name: "warp anchor", type: "active", rarity: "rare", cd: 15, desc: "drop a marker, press again to jump back", onUse: (g) => {
const p = g.player;
if (!p.anchor) { p.anchor = { x: p.x, y: p.y }; return false; }
p.x = p.anchor.x; p.y = p.anchor.y;
p.dirX = 0; p.dirY = 0; g.dirBuffer = null;
g.spawnParticle(p.x * TILE_SIZE, p.y * TILE_SIZE, 0, 0, 0.6, '#2ce8f5');
p.anchor = null;
} },
pulse: { name: "magnet pulse", type: "active", rarity: "common", cd: 25, desc: "yank nearby coins toward you", onUse: (g) => { g.magnetPulse = 1.4; } },
bait: { name: "ghost bait", type: "active", rarity: "common", cd: 30, desc: "drop a lure that ghosts chase for 6s", onUse: (g) => { g.spawnEntity('bait', g.player.x, g.player.y, 6); } },
surge: { name: "pocket surge", type: "active", rarity: "epic", cd: 60, desc: "start a 4s surge on the spot", onUse: (g) => { g.startSurge(4); } },
quake: { name: "floor quake", type: "active", rarity: "rare", cd: 45, desc: "stun every ghost for 3s", onUse: (g) => { g.ghosts.forEach(gh => { if (!gh.dead) gh.stun = Math.max(gh.stun, 3); }); g.shake = 1; } },
burrow: { name: "burrow", type: "active", rarity: "epic", cd: 35, desc: "pass through walls for 3s", onUse: (g) => { g.player.intangible = 3; g.player.colorOverride = '#ffffff'; } },
shoes: { name: "track shoes", type: "passive", rarity: "common", desc: "+12% move speed", apply: (p) => p.stats.speed *= 1.12 },
boots: { name: "swamp boots", type: "passive", rarity: "common", desc: "mud never slows you", apply: (p) => p.stats.mudProof = true },
longdash: { name: "long dash", type: "passive", rarity: "common", desc: "dash reaches 2 tiles further", apply: (p) => p.stats.dashDist += 2 },
quickstep: { name: "quick step", type: "passive", rarity: "common", desc: "dash cooldown -40%", apply: (p) => p.stats.dashCd *= 0.6 },
spook: { name: "spook step", type: "passive", rarity: "rare", desc: "dashing through a ghost stuns it", apply: (p) => p.stats.dashStun = true },
heart: { name: "spare heart", type: "passive", rarity: "rare", desc: "+1 max heart and heal 1", apply: (p) => { p.maxHealth += 1; p.health = Math.min(p.maxHealth, p.health + 1); } },
bubble: { name: "bubble", type: "passive", rarity: "rare", desc: "soak the first hit on each floor", apply: (p) => p.stats.bubble = true },
chains: { name: "chains", type: "passive", rarity: "common", desc: "ghosts move 8% slower", apply: (p) => p.stats.ghostSlow *= 0.92 },
longsurge: { name: "long surge", type: "passive", rarity: "common", desc: "surges last 3s longer", apply: (p) => p.stats.surgePlus += 3 },
clock: { name: "alarm clock", type: "passive", rarity: "common", desc: "curfew starts 15s later", apply: (p) => p.stats.curfewPlus += 15 },
pass: { name: "night pass", type: "passive", rarity: "rare", desc: "the warden moves 30% slower", apply: (p) => p.stats.wardenSlow *= 0.7 },
encore: { name: "encore", type: "passive", rarity: "epic", desc: "once per run, get back up with 1 heart", apply: (p) => p.stats.encore = true },
fat: { name: "fat coins", type: "passive", rarity: "common", desc: "coins pay +5", apply: (p) => p.stats.coinPlus += 5 },
hot: { name: "hot streak", type: "passive", rarity: "rare", desc: "streak climbs twice as fast", apply: (p) => p.stats.streakStep = 2 },
net: { name: "safety net", type: "passive", rarity: "rare", desc: "keep half your streak when hit", apply: (p) => p.stats.streakKeep = 0.5 },
shift: { name: "double shift", type: "passive", rarity: "rare", desc: "overtime coins pay 3x", apply: (p) => p.stats.overtimeRate = 3 },
latch: { name: "loose latch", type: "passive", rarity: "rare", desc: "gate opens at 60% of coins", apply: (p) => p.stats.quotaRate = 0.6 },
banker: { name: "banker", type: "passive", rarity: "rare", desc: "banking a floor pays +10% extra", apply: (p) => p.stats.bankBonus += 0.1 },
bounty: { name: "bounty", type: "passive", rarity: "common", desc: "surge catches pay double", apply: (p) => p.stats.bounty *= 2 },
sugar: { name: "sugar rush", type: "passive", rarity: "common", desc: "surge orbs also pay 250", apply: (p) => p.stats.orbPay += 250 },
mend: { name: "mending gate", type: "passive", rarity: "common", desc: "leaving a floor heals 2 hearts", apply: (p) => p.stats.gateHeal = 2 },
lucky: { name: "lucky coin", type: "passive", rarity: "epic", desc: "coins have a 10% chance to pay 5x", apply: (p) => p.stats.lucky = 0.1 }
};
