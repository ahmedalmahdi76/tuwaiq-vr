// Scene data per station (NATURE_SCENES.md §5). Grows with N.3 / N.4 (props, signs, anchors).
//
// RESTING: where the traveller waits when no journey is playing.
//   x     curve x (function units)
//   pose  one of traveller.js POSES
//   on    'curve' = sitting / standing on top of the light ribbon at (x, f(x)), following the
//         parameters; 'plinth' = on the plinth top (with an optional seat prop under her)
//   yaw   degrees, 0 = facing the visitor; positive turns her toward +x (the right)
//   seat  for on: 'plinth', the height of the seat prop under her (m)
export const RESTING = {
  1: { x: 0, pose: 'sitCalm', on: 'curve', yaw: 15 }, // on the vertex stone
  2: { x: 0.3, pose: 'kneel', on: 'curve', yaw: -35 }, // watering the seed
  3: { x: -2.7, pose: 'sitHug', on: 'curve', yaw: 10 }, // on the rocks at the low end
  4: { x: -1.8, pose: 'sitCalm', on: 'plinth', yaw: -20, seat: { height: 0.09 } }, // on the rock (it comes with the scene), looking at the sunset
  5: { x: 0.35, pose: 'hold', on: 'curve', yaw: 20 }, // holding the lantern at the start
  6: { x: -2.6, pose: 'kneel', on: 'curve', yaw: -30 }, // next to the single flower
  7: { x: 0, pose: 'sitCalm', on: 'curve', yaw: 15 }, // on the turning-point stone
  8: { x: 0.4, pose: 'stand', on: 'curve', yaw: -55 }, // at the fence, right side
  9: { x: -1.7, pose: 'sitHug', on: 'curve', yaw: 15 }, // on the left rocks under the rain cloud
  10: { x: -2.6, pose: 'stand', on: 'curve', yaw: 10 }, // at the bottom with the backpack
};
