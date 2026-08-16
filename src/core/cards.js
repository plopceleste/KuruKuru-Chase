// The draft pool. Actives get an `onUse(scene)` that runs against the live
// GameScene and may return false to skip the cooldown; passives get an
// `apply(run)` that folds into the run's stat block.
export const CARDS = {
  veil: {
    name: 'smoke veil', type: 'active', rarity: 'rare', cd: 30,
    desc: 'ghosts lose your trail for 4s',
    onUse: (scene) => { scene.veilTimer = 4; }
  },
  snap: {
    name: 'cold snap', type: 'active', rarity: 'rare', cd: 40,
    desc: 'freeze every ghost for 4s',
    onUse: (scene) => { scene.timeStop = 4; }
  },
  anchor: {
    name: 'warp anchor', type: 'active', rarity: 'rare', cd: 15,
    desc: 'drop a marker, press again to jump back',
    onUse: (scene) => scene.useAnchor()
  },
  pulse: {
    name: 'magnet pulse', type: 'active', rarity: 'common', cd: 25,
    desc: 'yank nearby coins toward you',
    onUse: (scene) => { scene.magnetPulse = 1.4; }
  },
  bait: {
    name: 'ghost bait', type: 'active', rarity: 'common', cd: 30,
    desc: 'drop a lure that ghosts chase for 6s',
    onUse: (scene) => scene.spawnBait()
  },
  surge: {
    name: 'pocket surge', type: 'active', rarity: 'epic', cd: 60,
    desc: 'start a 4s surge on the spot',
    onUse: (scene) => scene.startSurge(4)
  },
  quake: {
    name: 'floor quake', type: 'active', rarity: 'rare', cd: 45,
    desc: 'stun every ghost for 3s',
    onUse: (scene) => scene.quake()
  },
  burrow: {
    name: 'burrow', type: 'active', rarity: 'epic', cd: 35,
    desc: 'pass through walls for 3s',
    onUse: (scene) => scene.player.burrow(3)
  },

  shoes: {
    name: 'track shoes', type: 'passive', rarity: 'common',
    desc: '+12% move speed', apply: (run) => { run.stats.speed *= 1.12; }
  },
  boots: {
    name: 'swamp boots', type: 'passive', rarity: 'common',
    desc: 'mud never slows you', apply: (run) => { run.stats.mudProof = true; }
  },
  longdash: {
    name: 'long dash', type: 'passive', rarity: 'common',
    desc: 'dash reaches 2 tiles further', apply: (run) => { run.stats.dashDist += 2; }
  },
  quickstep: {
    name: 'quick step', type: 'passive', rarity: 'common',
    desc: 'dash cooldown -40%', apply: (run) => { run.stats.dashCd *= 0.6; }
  },
  spook: {
    name: 'spook step', type: 'passive', rarity: 'rare',
    desc: 'dashing through a ghost stuns it', apply: (run) => { run.stats.dashStun = true; }
  },
  heart: {
    name: 'spare heart', type: 'passive', rarity: 'rare',
    desc: '+1 max heart and heal 1',
    apply: (run) => { run.maxHealth += 1; run.health = Math.min(run.maxHealth, run.health + 1); }
  },
  bubble: {
    name: 'bubble', type: 'passive', rarity: 'rare',
    desc: 'soak the first hit on each floor', apply: (run) => { run.stats.bubble = true; }
  },
  chains: {
    name: 'chains', type: 'passive', rarity: 'common',
    desc: 'ghosts move 8% slower', apply: (run) => { run.stats.ghostSlow *= 0.92; }
  },
  longsurge: {
    name: 'long surge', type: 'passive', rarity: 'common',
    desc: 'surges last 3s longer', apply: (run) => { run.stats.surgePlus += 3; }
  },
  clock: {
    name: 'alarm clock', type: 'passive', rarity: 'common',
    desc: 'curfew starts 15s later', apply: (run) => { run.stats.curfewPlus += 15; }
  },
  pass: {
    name: 'night pass', type: 'passive', rarity: 'rare',
    desc: 'the warden moves 30% slower', apply: (run) => { run.stats.wardenSlow *= 0.7; }
  },
  encore: {
    name: 'encore', type: 'passive', rarity: 'epic',
    desc: 'once per run, get back up with 1 heart', apply: (run) => { run.stats.encore = true; }
  },
  fat: {
    name: 'fat coins', type: 'passive', rarity: 'common',
    desc: 'coins pay +5', apply: (run) => { run.stats.coinPlus += 5; }
  },
  hot: {
    name: 'hot streak', type: 'passive', rarity: 'rare',
    desc: 'streak climbs twice as fast', apply: (run) => { run.stats.streakStep = 2; }
  },
  net: {
    name: 'safety net', type: 'passive', rarity: 'rare',
    desc: 'keep half your streak when hit', apply: (run) => { run.stats.streakKeep = 0.5; }
  },
  shift: {
    name: 'double shift', type: 'passive', rarity: 'rare',
    desc: 'overtime coins pay 3x', apply: (run) => { run.stats.overtimeRate = 3; }
  },
  latch: {
    name: 'loose latch', type: 'passive', rarity: 'rare',
    desc: 'gate opens at 60% of coins', apply: (run) => { run.stats.quotaRate = 0.6; }
  },
  banker: {
    name: 'banker', type: 'passive', rarity: 'rare',
    desc: 'banking a floor pays +10% extra', apply: (run) => { run.stats.bankBonus += 0.1; }
  },
  bounty: {
    name: 'bounty', type: 'passive', rarity: 'common',
    desc: 'surge catches pay double', apply: (run) => { run.stats.bounty *= 2; }
  },
  sugar: {
    name: 'sugar rush', type: 'passive', rarity: 'common',
    desc: 'surge orbs also pay 250', apply: (run) => { run.stats.orbPay += 250; }
  },
  mend: {
    name: 'mending gate', type: 'passive', rarity: 'common',
    desc: 'leaving a floor heals 2 hearts', apply: (run) => { run.stats.gateHeal = 2; }
  },
  lucky: {
    name: 'lucky coin', type: 'passive', rarity: 'epic',
    desc: 'coins have a 10% chance to pay 5x', apply: (run) => { run.stats.lucky = 0.1; }
  }
};

export const RARITY_COLORS = {
  common: '#8b9bb4',
  rare: '#2ce8f5',
  epic: '#fee761'
};
