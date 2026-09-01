// ponytail: minimal self-check, run with `node test_molerush.js`
global.window = global;
global.document = {
  getElementById: () => null,
  addEventListener: () => {},
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

require("./game.js");

// spawning over time
window.newGame();
for (let i = 0; i < 40; i++) window.tick(200);
console.assert(window.getState().holes.some(h => h.kind), "moles/bombs should spawn over time");

// whacking a mole scores +1
window.newGame();
window.getState().holes[0] = { kind: "mole", hideAt: 99999 };
window.whack(0);
console.assert(window.getState().score === 1, "whacking a mole should score +1");
console.assert(window.getState().holes[0].kind === null, "whacked hole should clear");

// whacking a bomb costs 3, floored at 0
window.newGame();
window.getState().score = 1;
window.getState().holes[0] = { kind: "bomb", hideAt: 99999 };
window.whack(0);
console.assert(window.getState().score === 0, "whacking a bomb should floor score at 0");

// whacking an empty hole does nothing
window.newGame();
window.whack(0);
console.assert(window.getState().score === 0, "whacking empty hole should not change score");

// round ends when time runs out
window.newGame();
window.tick(window.ROUND_MS + 1000);
console.assert(window.getState().over === true, "round should end after ROUND_MS elapses");
console.assert(window.getState().timeLeft === 0, "timeLeft should clamp at 0");

// tick is a no-op once over
window.newGame();
window.tick(window.ROUND_MS + 1000);
const scoreAfterOver = window.getState().score;
window.tick(500);
console.assert(window.getState().score === scoreAfterOver, "tick should no-op after game over");

console.log("MoleRush self-check passed");
