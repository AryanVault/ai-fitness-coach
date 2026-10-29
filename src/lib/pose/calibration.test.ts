import { expect, it } from "vitest";
import { createCalibrationTimer } from "./calibration";
it("calibrates for elapsed stable time at 10 and 30 Hz and resets after an interruption", () => {
  for (const interval of [100, 1000/30]) {
    const timer = createCalibrationTimer();
    expect(timer.update(0,true,900)).toBe(0);
    for(let t=interval;t<890;t+=interval) expect(timer.update(t,true,900)).toBeLessThan(900);
    expect(timer.update(900,true,900)).toBe(900);
    expect(timer.update(1000,false,900)).toBe(0);
    expect(timer.update(1100,true,900)).toBe(0);
    expect(timer.update(2000,true,900)).toBe(0);
  }
});
