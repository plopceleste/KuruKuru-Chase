import { CARDS } from './cards.js';
import { save } from './save.js';
import { seededRandom } from './rng.js';

function freshStats() {
  return {
    speed: 1, mudProof: false, dashDist: 0, dashCd: 3, dashStun: false,
    ghostSlow: 1, surgePlus: 0, curfewPlus: 0, wardenSlow: 1,
    bubble: false, encore: false,
    coinPlus: 0, streakStep: 1, streakKeep: 0, overtimeRate: 2,
    quotaRate: 0.7, bankBonus: 0, bounty: 1, orbPay: 0, gateHeal: 1, lucky: 0
  };
}

/**
 * Everything that survives from floor to floor: the purse, the stat block, the
 * card list and the seeded RNG. Scenes are torn down between floors, so this is
 * the only thing that carries the run.
 */
export class RunState {
  constructor() {
    this.highScore = save.best;
    this.themeIndex = Math.min(Math.max(save.theme, 0), 5);
    this.randomSeed = true;
    this.seedText = '';
    this.seed = '';
    this.rng = Math.random;
    this.reset();
  }

  reset() {
    this.floor = 1;
    this.bank = 0;
    this.carry = 0;
    this.lostCarry = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.health = 5;
    this.maxHealth = 5;
    this.stats = freshStats();
    this.cards = [];
    this.activeItem = null;
    this.startTime = 0;
    this.finalTime = '0:00';
  }

  get score() {
    return this.bank + this.carry;
  }

  /** Starts a fresh run, fixing the seed and the RNG stream it drives. */
  begin() {
    this.reset();
    this.seed = this.randomSeed
      ? Math.random().toString(36).slice(2, 8)
      : (this.seedText || 'maze');
    this.rng = seededRandom(this.seed);
    this.startTime = Date.now();
  }

  /** Banks the floor's carry, applies the gate heal and steps to the next floor. */
  bankFloor() {
    const gain = this.stats.bankBonus > 0
      ? Math.floor(this.carry * (1 + this.stats.bankBonus))
      : this.carry;
    this.bank += gain;
    this.carry = 0;
    this.health = Math.min(this.maxHealth, this.health + this.stats.gateHeal);
    this.floor++;
  }

  /** Rolls three cards, weighted by rarity and biased toward epics as floors climb. */
  draftChoices() {
    const owned = new Set(this.cards);
    const pool = Object.keys(CARDS).filter((key) => (
      CARDS[key].type === 'active' ? this.activeItem !== key : !owned.has(key)
    ));

    const weight = (key) => {
      const rarity = CARDS[key].rarity;
      if (rarity === 'epic') return 8 + Math.min(12, this.floor);
      if (rarity === 'rare') return 26;
      return 52;
    };

    const picks = [];
    while (picks.length < 3 && pool.length > 0) {
      let total = 0;
      for (const key of pool) total += weight(key);
      let roll = this.rng() * total;
      let index = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        roll -= weight(pool[i]);
        if (roll <= 0) { index = i; break; }
      }
      picks.push(pool.splice(index, 1)[0]);
    }
    return picks;
  }

  takeCard(key) {
    const card = CARDS[key];
    if (!card) return;
    if (card.type === 'active') {
      this.activeItem = key;
    } else {
      card.apply(this);
    }
    this.cards.push(key);
  }

  /** Closes the run out, recording the score and the elapsed time. */
  finish() {
    this.lostCarry = this.carry;
    this.carry = 0;
    if (this.bank > this.highScore) {
      this.highScore = this.bank;
      save.best = this.bank;
    }
    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    this.finalTime = `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
}
