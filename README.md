# Fastball · Alpha v0.3

[Play Fastball on GitHub Pages](https://lamcnamara.github.io/fastball/)

Capt. Tommi Dylan (she/they) was the first test pilot to break Mach 10 in the classified SR-73 reconnaissance craft. These days she spends Saturdays pitching with friends, sometimes against the next town over. Now her tether has snapped and the thrusters on her lightweight prototype suit are stuck closed. Eighteen metres from the handrail, the former high school star pitcher reaches for the wrench pouch.

![The navigation plot shows the power drill’s empty slot, the selected wrench pouch, and the flight clock beside the coast forecast.](preview-qa.png)

## Fly your first rescue

1. Follow the gold ring in **First rescue** to aim the pouch away from the hatch. The pouch travels toward your crosshair and your suit recoils in the opposite direction. Releasing the first throw starts the clock.
2. Check **Current coast** after the throw. On Easy, it tells you whether your path reaches the handrail in time. When it does, **Coast to halfway** advances the flight to the course check. The station calls once when the original gap to the rail has halved.
3. If the path still crosses the reach zone, use **Coast to rail** or let the clock run. If you’ll miss, use a light tool to trim your course. On Medium and Hard, also check your approach speed. Throwing along your velocity arrow slows you down.

**Skip guidance** lets you fly independently. Open **Flight guide** to read the manual or restart the guided rescue. For offline play, download `index.html` and open it in a browser. The game and its artwork are self-contained.

## Equipment rack

The lower-left HUD holds two tools per row. Read left to right, from the lightest tools at the top to the heaviest at the bottom. On narrow screens the rack sits directly below the aiming area. Each button shows the tool's artwork, name, weight class and mass. The selected tool has a lighter charcoal fill. After a throw, its slot fades to a translucent dashed outline marked **Released**. Story mode reloads the tool immediately.

| Key | Equipment | Class | Mass |
| --- | --- | --- | ---: |
| 1 | Socket driver | Light | 0.6 kg |
| 2 | T-handle | Light | 0.8 kg |
| 3 | Worksite gas cartridge | Medium | 1.2 kg |
| 4 | Socket-and-wrench pouch | Medium | 2.4 kg |
| 5 | Power drill | Heavy | 3.6 kg |
| 6 | Spare repair battery | Heavy | 4.8 kg |

Both mass and release speed affect recoil. The **Δv budget** estimates how much total velocity change your remaining equipment can deliver with full-power throws in the best order.

## Aim, throw and control time

| Action | Control |
| --- | --- |
| Select a tool | Click or tap its button, or press **1–6**. |
| Preview a throw | Click or tap the plot. The crosshair sets the tool's bearing. Distance from the suit sets power from 10% to 100%. Press **Throw** beneath the rack to release the selected tool. |
| Throw in one gesture | Drag on the plot or from the crosshair, then release. The dotted ring marks full power. **Escape**, releasing outside the plot, or releasing over the rack or flight clock cancels the drag. |
| Fine-tune aim | With the plot focused, use **← / →** for 1° bearing steps and **↑ / ↓** for 1% power steps. Hold **Shift** for steps of 10. Press **Enter** to throw. |
| Wind up | Hold **Space**, then release to throw. With a tool button focused, Space uses that tool. **Escape** cancels the windup. |
| Start, pause or resume | Use the clock button beside **New mission**, or press **P**. A paused plot fades to grey and shows **PAUSED** at its center. [View the paused HUD](preview-paused.png) |
| Change flight speed | The flight-clock slider inside the lower-right corner of the plot offers **1×, 2×, 5× and 10×**. Amber indicates fast-forward. Move the slider to take over from an automatic coast. |

**Hatch distance** measures the gap to the edge of the handrail reach zone. Green distance and negative radial speed mean you’re closing. Red distance and positive radial speed mean you’re drifting away. **Hatch bearing** points toward the rail, with 000° to the right and 090° up. **Approach speed** measures total speed relative to the station, including sideways drift.

## Missions and difficulty

Under **New mission**, choose **Tether separation**, **Lateral drift**, **Wide separation**, or **Random**. **Retry this flight** restores the same opening, difficulty and bonus objective.

### Share a random rescue

1. Choose **Random** to draw a starting position, drift speed and direction. **Generate seed** deals another start. The preview gives the initial distance from the hatch, speed and heading.
2. Use **Copy link** in setup or beside the seed during flight. Opening the link starts the same drift with the sender’s difficulty and bonus objective. Hard rolls a fresh release error each time a tool is thrown.
3. To enter a flight manually, paste its Scenario Seed or full link under **New mission → Random** and choose **Load seed**, then **Begin mission**. A bare seed keeps your chosen difficulty and objective. Offline players can exchange just the code. For a two-throw Hard playtest, try `F1N73CGPHF`.

**Seed format.** Each ten-character code starts with `F1`. The next seven base-36 characters pack the initial X and Y coordinates in decimetres and the X and Y velocity components in millimetres per second. Each position component uses 10 bits with an offset of 512, and each velocity component uses 8 bits with an offset of 128, in X, Y, Vx, Vy order from most to least significant. The last base-36 character checks the payload. Starting at zero, multiply the running check by 17, add each digit’s value and reduce modulo 36. For example, `F1N73CGPHF` decodes to (24.0, −7.0) m and (+0.046, +0.021) m/s. Case is ignored.

Random starts lie 14–28 m from the hatch and drift at 0.022–0.085 m/s. Each generated or loaded seed must admit a soft capture using whole-degree bearings and whole-percent power, with time to spare on Hard. The same check covers Story’s reloading inventory. Every start needs at least one throw. Run `node qa-balance.cjs` for the seeded 10,000-start recovery and Hard-scatter tests.

[View random mission setup](preview-random.png)

| Mode | Return reserve | Navigation and capture |
| --- | --- | --- |
| Story | Unlimited | Full coast and throw forecasts. Tools reload. Grab the rail at any speed, or drift completely out of view to end the flight. |
| Easy | 15 minutes | Full trajectory, intercept-time and miss-distance forecasts. Any capture speed is allowed. |
| Medium | 10 minutes | The HUD previews the velocity a throw would produce. Reach the rail at **0.080 m/s or slower**. |
| Hard | 7 minutes 30 seconds | Navigate by raw telemetry. The same capture limit applies, and each release can stray up to **2°** either side of the selected bearing. |

The approach gauge shows the 0.080 m/s reference in every mode. On Medium and Hard it turns red above the capture limit. An empty rack can still get you home if your final coast reaches the rail in time at a permitted speed.

For a replay, try keeping the original drill holstered or returning in two throws or fewer. The station gives Tommi a different welcome on each difficulty. Bring the original drill home to earn **Upmass Hero**, whichever bonus objective you picked. The mission debrief lets you review the plot, retry the same flight, or take the next challenge.

### Share a flight log

Choose **View flight log** in any mission debrief, then **Copy flight log**. Each throw lists its flight timestamp, tool and mass, power, actual release bearing, signed changes to X and Y velocity, and the suit’s heading before and after release. On Hard, the log also records the aimed bearing. The final entry includes velocity, speed, heading, elapsed time, remaining oxygen and earned awards. Random flights also include their seed and replay link.

[View a two-throw capture log](preview-flight-log.png)
