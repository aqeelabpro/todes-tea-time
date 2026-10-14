import { FLOOR_TILE_SIZE, MAP_HALF_SIZE } from '../config.js';
import { isBlocked } from './World.js';

const width = Math.floor(MAP_HALF_SIZE * 2 / FLOOR_TILE_SIZE);
const cellCenter = (index) => -MAP_HALF_SIZE + (index + 0.5) * FLOOR_TILE_SIZE;

// A small shared grid lets the boss route toward the closest space it can occupy.
export function createFlowField(radius) {
  const cells = Array.from({ length: width * width }, (_, index) => {
    const x = cellCenter(index % width);
    const y = cellCenter(Math.floor(index / width));
    return { x, y, walkable: !isBlocked(x, y, radius), cost: Infinity };
  });
  let goal = -1;

  function nearestCell(position, requireReachable = false) {
    let best = -1;
    let bestDistance = Infinity;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell.walkable || (requireReachable && !Number.isFinite(cell.cost))) continue;
      const distance = (cell.x - position.x) ** 2 + (cell.y - position.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }

  function neighbors(index) {
    const x = index % width;
    const y = Math.floor(index / width);
    const result = [];
    if (x > 0) result.push(index - 1);
    if (x < width - 1) result.push(index + 1);
    if (y > 0) result.push(index - width);
    if (y < width - 1) result.push(index + width);
    return result;
  }

  function rebuild(playerPosition) {
    const nextGoal = nearestCell(playerPosition);
    if (nextGoal === goal) return;
    goal = nextGoal;
    cells.forEach((cell) => { cell.cost = Infinity; });
    if (goal < 0) return;
    cells[goal].cost = 0;
    const queue = [goal];
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      for (const next of neighbors(current)) {
        if (!cells[next].walkable || cells[next].cost !== Infinity) continue;
        cells[next].cost = cells[current].cost + 1;
        queue.push(next);
      }
    }
  }

  function nextPosition(from, playerPosition) {
    rebuild(playerPosition);
    const current = nearestCell(from, true);
    if (current < 0) return null;
    let next = current;
    for (const neighbor of neighbors(current)) {
      if (cells[neighbor].cost < cells[next].cost) next = neighbor;
    }
    if (next === goal && !isBlocked(playerPosition.x, playerPosition.y, radius)) return playerPosition;
    return cells[next];
  }

  return { nextPosition };
}
