class PooledList {
constructor(create, reset, prefill) {
this.create = create;
this.reset = reset || null;
this.items = [];
this.free = [];
for (let i = 0; i < (prefill || 0); i++) this.free.push(create());
}
get length() { return this.items.length; }
obtain() {
const o = this.free.length ? this.free.pop() : this.create();
if (this.reset) this.reset(o);
this.items.push(o);
return o;
}
releaseAt(i) {
const items = this.items;
const o = items[i];
const last = items.length - 1;
if (i !== last) items[i] = items[last];
items.pop();
this.free.push(o);
return o;
}
clear() {
const items = this.items;
while (items.length) this.free.push(items.pop());
}
}

const DIRS4 = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];
const DIRS4_XY = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const CARVE_STEPS = [[0, -2], [0, 2], [-2, 0], [2, 0]];

const DIR_VECTORS = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};
const KEY_DIRS = {
ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
w: 'up', s: 'down', a: 'left', d: 'right'
};
const INPUT_BUFFER = 0.45;
const TURN_SLACK = 0.14;

window.PooledList = PooledList;
