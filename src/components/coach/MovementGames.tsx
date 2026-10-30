"use client";
import { Button } from "@/components/ui/button";
import { MOVEMENT_GAMES, type GameMode, type GameSnapshot } from "@/lib/games/movement-game";
import type { useMovementGame } from "@/hooks/useMovementGame";

type GameControl=ReturnType<typeof useMovementGame>;
export function MovementGames({game,cameraOn,workoutRunning,onSelect,onStart}:{game:GameControl;cameraOn:boolean;workoutRunning:boolean;onSelect:(mode:GameMode|null)=>void;onStart:()=>void}) {
  return <section aria-label="Movement games" className="mt-5 rounded-xl bg-secondary px-4 py-5 sm:px-6">
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h3 className="text-xl font-semibold text-foreground">Make movement a game</h3>
      <span className="text-sm text-muted-foreground">Your body sets the range.</span>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-3" role="group" aria-label="Choose a movement game">
      {MOVEMENT_GAMES.map(item=><button key={item.id} type="button" disabled={workoutRunning} aria-pressed={game.mode===item.id} onClick={()=>onSelect(item.id)} className={`min-h-24 rounded-lg p-3 text-left transition-colors disabled:opacity-50 ${game.mode===item.id?"bg-foreground text-background":"bg-background text-foreground hover:bg-card"}`}>
        <span className="block font-semibold">{item.label}</span><span className="mt-2 block text-sm leading-5">{item.description}</span>
      </button>)}
    </div>
    {workoutRunning&&<p className="mt-3 text-sm text-muted-foreground">Finish the workout session before starting a game.</p>}
    {game.mode&&game.snapshot&&<>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm">Level <select aria-label="Game level" value={game.level} onChange={e=>game.setLevel(Number(e.target.value))} className="rounded-md bg-background px-3 py-2 text-foreground">{[1,2,3,4,5].map(level=><option key={level} value={level}>{level}</option>)}</select></label>
        {game.mode!=="cardio"&&<label className="flex items-center gap-2 text-sm">Working side <select aria-label="Working side" value={game.side} onChange={e=>game.setSide(e.target.value as "left"|"right")} className="rounded-md bg-background px-3 py-2 text-foreground"><option value="left">Left</option><option value="right">Right</option></select></label>}
        <span className="text-sm">{game.snapshot.goal} controlled {game.mode==="cardio"?"reaches":"reps"} to finish</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3" aria-label="Game score">
        <div><p className="text-sm text-muted-foreground">Points</p><p className="mt-1 text-3xl font-semibold tabular-nums" data-testid="game-points">{game.snapshot.points}</p></div>
        <div><p className="text-sm text-muted-foreground">Collected</p><p className="mt-1 text-3xl font-semibold tabular-nums">{game.snapshot.completed}<span className="ml-1 text-base font-normal text-muted-foreground">/ {game.snapshot.goal}</span></p></div>
        <div><p className="text-sm text-muted-foreground">Level</p><p className="mt-1 text-3xl font-semibold tabular-nums">{game.snapshot.level}</p></div>
      </div>
      <p className="mt-4 min-h-12 text-sm leading-6" role="status">{!cameraOn?"Enable the camera to play. Video processing stays on this device.":!game.playing&&game.snapshot.status!=="complete"?"Start when ready. We will calibrate your position and practice range first.":game.snapshot.message}</p>
      {game.playing&&!game.snapshot.calibrated&&<progress aria-label="Game calibration" className="mt-2 h-2 w-full accent-current" max={100} value={game.snapshot.calibrationProgress}/>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {game.snapshot.status==="complete"?<Button onClick={()=>game.setLevel(Math.min(5,game.level+1))}>{game.level<5?"Next level":"Play level again"}</Button>:<Button disabled={!cameraOn||workoutRunning} onClick={game.playing?game.pause:()=>{game.start();onStart();}}>{game.playing?"Pause game":game.snapshot.calibrated?"Resume game":"Start game"}</Button>}
        <Button variant="ghost" onClick={game.restart}>Restart game</Button>
        <Button variant="ghost" onClick={()=>onSelect(null)}>Exit game</Button>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Practice sets your targets. A target plus a controlled return earns 100 points. Level changes restart calibration and score. Game points are separate from workout form scores.</p>
    </>}
  </section>;
}

export function MovementGameOverlay({snapshot,aspectRatio,mirror}:{snapshot:GameSnapshot|null;aspectRatio:number;mirror:boolean}) {
  if(!snapshot?.calibrated||!snapshot.targets.length||snapshot.status!=="playing")return null;
  const width=aspectRatio*1000;
  return <svg data-testid="game-overlay" aria-label="Body-aligned movement targets" viewBox={`0 0 ${width} 1000`} preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 z-30 h-full w-full">
    {snapshot.targets.map(target=>{
      const x=(mirror?1-target.x:target.x)*width,y=target.y*1000,r=target.radius*1000;
      return <g key={target.side} data-side={target.side}>
        <circle cx={x} cy={y} r={r} fill={target.hit?"#bdd5c6":"#10281dcc"} stroke="#dcece0" strokeWidth={4}/>
        <circle cx={x} cy={y} r={r*.72} fill="none" stroke={target.hit?"#203b2b":"#dcece0"} strokeWidth={2} strokeDasharray={target.hit?undefined:"4 8"}/>
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={target.hit?"#10251a":"#f7fff9"} fontFamily="system-ui, sans-serif" fontSize={r*.65} fontWeight={600}>{target.hit?"✓":snapshot.goal-snapshot.completed}</text>
      </g>;
    })}
  </svg>;
}
