import { describe, it, expect } from 'vitest';
import { solve24, make24Puzzle, check24, brokenPuzzle, checkBroken, sprintQuestion, estimateQuestion, estimateScore } from '../src/ui/games/logic.js';
import { evaluate } from '../src/engine/index.js';

describe('Make 24', () => {
  it('solves the classic hard one', () => {
    const s = solve24([3, 3, 8, 8]);
    expect(s).toBeTruthy();
    expect(evaluate(s).value).toBeCloseTo(24, 9);
  });
  it('knows unsolvable', () => expect(solve24([1, 1, 1, 1])).toBeNull());
  it('generated puzzles validate their own solution', () => {
    for (let i = 0; i < 50; i++) {
      const p = make24Puzzle();
      expect(check24(p.solution, p.nums).ok).toBe(true);
    }
  });
  it('rejects reused numbers / functions', () => {
    expect(check24('8×3', [8, 3, 1, 1]).ok).toBe(false);
    expect(check24('4!', [4, 1, 1, 1]).ok).toBe(false);
  });
});

describe('Broken Keys', () => {
  it('example solution always passes and target is not directly typeable', () => {
    for (let lvl = 1; lvl < 12; lvl++) {
      const p = brokenPuzzle(lvl);
      expect(checkBroken(p.example, p).ok).toBe(true);
      expect([...String(p.target)].every((d) => p.working.includes(d))).toBe(false);
    }
  });
});

describe('Sprint & Estimate', () => {
  it('sprint answers are integers', () => {
    for (let l = 0; l < 10; l++) for (let i = 0; i < 30; i++) expect(Number.isInteger(sprintQuestion(l).answer)).toBe(true);
  });
  it('estimate questions evaluate', () => {
    for (let r = 0; r < 10; r++) expect(Number.isFinite(estimateQuestion(r).answer)).toBe(true);
  });
  it('estimate scoring', () => {
    expect(estimateScore(100, 100)).toBe(100);
    expect(estimateScore(130, 100)).toBe(0);
    expect(estimateScore(110, 100)).toBe(60);
  });
});
