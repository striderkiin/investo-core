import { describe, expect, it } from 'vitest';
import {
  createDefaultMarketSettings,
  decreaseMarketValue,
  decreasePercentage,
  enableManualControl,
  increaseMarketValue,
  increasePercentage,
  resetAllManualControls,
  resetCurrentMetric,
  returnToAutomatic,
  setControlToggle,
  setMarketValueStep,
  setTrend,
  setVolatility,
  tickAutomatic,
} from './marketEngine';

describe('Manual Chart Control Acceptance Test (spec section 93)', () => {
  it('Scenario 1: automatic market with manual control OFF updates automatically and ignores manual arrows', () => {
    let state = createDefaultMarketSettings();
    state = { ...state, currentMarketValue: 42580.25, automaticBehavior: 'upward', minMovement: 10, maxMovement: 10 };

    const afterTick = tickAutomatic(state, () => 0.5);
    expect(afterTick.currentMarketValue).toBeGreaterThan(state.currentMarketValue);

    // Manual arrows are disabled while manual control is off — value must not move.
    const afterIncreaseAttempt = increaseMarketValue(afterTick);
    expect(afterIncreaseAttempt.currentMarketValue).toBe(afterTick.currentMarketValue);
  });

  it('Scenario 2: manual ON + market value control ON + step $100, tap once: 42580 -> 42680', () => {
    let state = createDefaultMarketSettings();
    state = { ...state, currentMarketValue: 42580 };
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = setMarketValueStep(state, 100);

    state = increaseMarketValue(state);

    expect(state.currentMarketValue).toBe(42680);
  });

  it('Scenario 3: tapping increase three times with step $100 walks 42580 -> 42680 -> 42780 -> 42880', () => {
    let state = createDefaultMarketSettings();
    state = { ...state, currentMarketValue: 42580 };
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = setMarketValueStep(state, 100);

    const values: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      state = increaseMarketValue(state);
      values.push(state.currentMarketValue);
    }

    expect(values).toEqual([42680, 42780, 42880]);
  });

  it('Scenario 4: changing step from $100 to $500 and tapping once moves 42880 -> 43380', () => {
    let state = createDefaultMarketSettings();
    state = { ...state, currentMarketValue: 42880 };
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = setMarketValueStep(state, 100);
    state = setMarketValueStep(state, 500);

    state = increaseMarketValue(state);

    expect(state.currentMarketValue).toBe(43380);
  });

  it('Scenario 5: disabling market value control disables its arrows while other enabled controls keep working', () => {
    let state = createDefaultMarketSettings();
    state = { ...state, currentMarketValue: 43380, currentPercentageChange: 2.8 };
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = setControlToggle(state, 'percentageControlEnabled', true);

    state = setControlToggle(state, 'marketValueControlEnabled', false);

    const afterValueAttempt = increaseMarketValue(state);
    expect(afterValueAttempt.currentMarketValue).toBe(43380);

    const afterPercentageChange = increasePercentage(afterValueAttempt);
    expect(afterPercentageChange.currentPercentageChange).toBeCloseTo(3.3, 4);
  });

  it('Scenario 6: Return To Automatic disables manual controls and automatic ticking resumes', () => {
    let state = createDefaultMarketSettings();
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = increaseMarketValue(state);

    state = returnToAutomatic(state);

    expect(state.mode).toBe('automatic');
    expect(state.manualControlEnabled).toBe(false);
    expect(state.marketValueControlEnabled).toBe(false);

    // Manual arrows are now inert...
    const afterIncreaseAttempt = increaseMarketValue(state);
    expect(afterIncreaseAttempt.currentMarketValue).toBe(state.currentMarketValue);

    // ...but the automatic engine keeps advancing the chart.
    state = { ...state, automaticBehavior: 'upward', minMovement: 5, maxMovement: 5 };
    const afterTick = tickAutomatic(state, () => 0.5);
    expect(afterTick.currentMarketValue).toBeGreaterThan(state.currentMarketValue);
  });
});

describe('Additional manual control behavior', () => {
  it('decreaseMarketValue floors at zero and respects the enable guard', () => {
    let state = createDefaultMarketSettings();
    state = { ...state, currentMarketValue: 50 };
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = setMarketValueStep(state, 100);

    state = decreaseMarketValue(state);

    expect(state.currentMarketValue).toBe(0);
  });

  it('trend and volatility controls only apply while their toggle and the master switch are on', () => {
    let state = createDefaultMarketSettings();
    state = enableManualControl(state);

    const unchanged = setTrend(state, 'bearish');
    expect(unchanged.currentTrend).toBe(state.currentTrend);

    state = setControlToggle(state, 'trendControlEnabled', true);
    state = setTrend(state, 'bearish');
    expect(state.currentTrend).toBe('bearish');

    state = setControlToggle(state, 'volatilityControlEnabled', true);
    state = setVolatility(state, 'extreme');
    expect(state.currentVolatility).toBe('extreme');
  });

  it('resetCurrentMetric turns off a single toggle without touching others', () => {
    let state = createDefaultMarketSettings();
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = setControlToggle(state, 'percentageControlEnabled', true);

    state = resetCurrentMetric(state, 'marketValueControlEnabled');

    expect(state.marketValueControlEnabled).toBe(false);
    expect(state.percentageControlEnabled).toBe(true);
  });

  it('resetAllManualControls turns off every toggle but keeps the master switch on', () => {
    let state = createDefaultMarketSettings();
    state = enableManualControl(state);
    state = setControlToggle(state, 'marketValueControlEnabled', true);
    state = setControlToggle(state, 'percentageControlEnabled', true);
    state = setControlToggle(state, 'trendControlEnabled', true);

    state = resetAllManualControls(state);

    expect(state.manualControlEnabled).toBe(true);
    expect(state.marketValueControlEnabled).toBe(false);
    expect(state.percentageControlEnabled).toBe(false);
    expect(state.trendControlEnabled).toBe(false);
  });

  it('decreasePercentage moves the opposite direction of increasePercentage', () => {
    let state = createDefaultMarketSettings();
    state = { ...state, currentPercentageChange: 2.8 };
    state = enableManualControl(state);
    state = setControlToggle(state, 'percentageControlEnabled', true);

    state = decreasePercentage(state);

    expect(state.currentPercentageChange).toBeCloseTo(2.3, 4);
  });
});
