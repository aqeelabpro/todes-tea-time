# Tode's Tea Time

The playable game built on the course scaffold. For the project overview and credits, see the [repository README](../README.md).

Tode the frog defends his home from monsters so he can finally enjoy his tea in peace. Hop around the checkerboard, survive waves of enemies, and defeat the Monster King. Victory can lead into Endless Mode.

## Run

From the `game` directory:

```sh
npm install
npm run dev
```

For a production build, run `npm run build`. To serve that build locally, run `npm run preview`.

## Controls

- **WASD** or **arrow keys:** hop
- **Space:** ring attack
- **E:** tongue attack
- **P:** pause or resume
- **M:** mute or unmute
- **1, 2, 3** or click: choose an upgrade when cards appear

## Features

Defeated enemies may drop tea leaves that grant Green Tea speed, a Chamomile shield, or a Matcha Burst. Tode has hearts and can choose stacking upgrades as his score grows. Brutes and the multi-phase Monster King bring heavier attacks; luring the King into a house makes it crash. Tode can eat nearby Grunts with his tongue. The stages shift from dusk to night with fireflies, crickets, and synthesized music and effects. Achievements and the high score are saved locally. Defeating the King opens a victory ending or a choice to keep playing in Endless Mode.

All audio is synthesized with the Web Audio API. Extra effects and visuals are generated from Three.js primitives and CSS; the three character and house models are supplied with the course.
