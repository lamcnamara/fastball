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

Under **New mission**, choose **Tether separation**, **Lateral drift**, **Wide separation**, or **Daily drift**. The daily mission gives everyone the same starting position and velocity for a UTC date, across all four difficulties. A new drift becomes available at 00:00 UTC. **Retry this flight** keeps the original date’s drift and bonus objective, even after midnight.

| Mode | Return reserve | Navigation and capture |
| --- | --- | --- |
| Story | Unlimited | Full coast and throw forecasts. Tools reload. Grab the rail at any speed, or drift completely out of view to end the flight. |
| Easy | 15 minutes | Full trajectory, intercept-time and miss-distance forecasts. Any capture speed is allowed. |
| Medium | 10 minutes | The HUD previews the velocity a throw would produce. Reach the rail at **0.080 m/s or slower**. |
| Hard | 7 minutes 30 seconds | Navigate by raw telemetry. The same capture limit applies, and each release can stray up to **2°** either side of the selected bearing. |

The approach gauge shows the 0.080 m/s reference in every mode. On Medium and Hard it turns red above the capture limit. An empty rack can still get you home if your final coast reaches the rail in time at a permitted speed.

For a replay, try keeping the original drill holstered or returning in two throws or fewer. The station gives Tommi a different welcome on each difficulty. Bring the original drill home to earn **Upmass Hero**, whichever bonus objective you picked. The mission debrief lets you review the plot, retry the same flight, or take the next challenge.
