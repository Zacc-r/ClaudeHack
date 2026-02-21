'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

const CATALOG: Record<string, { emoji: string; label: string; color: string }> = {
  work:         { emoji: '💼', label: 'Work',           color: '#3B82F6' },
  school:       { emoji: '🎓', label: 'School/Classes', color: '#6366F1' },
  commute:      { emoji: '🚌', label: 'Commute',        color: '#64748B' },
  gym:          { emoji: '🏋️', label: 'Gym',            color: '#EF4444' },
  running:      { emoji: '🏃', label: 'Running/Walk',   color: '#F97316' },
  meditation:   { emoji: '🧘', label: 'Meditation',     color: '#8B5CF6' },
  cooking:      { emoji: '🍳', label: 'Cooking',        color: '#F59E0B' },
  errands:      { emoji: '🛒', label: 'Errands',        color: '#94A3B8' },
  deep_work:    { emoji: '🧠', label: 'Deep Focus',     color: '#14B8A6' },
  learning:     { emoji: '📖', label: 'Learning',       color: '#10B981' },
  creative:     { emoji: '🎨', label: 'Creative',       color: '#EC4899' },
  side_project: { emoji: '🚀', label: 'Side Project',   color: '#8B5CF6' },
  reading:      { emoji: '📚', label: 'Reading',        color: '#22D3EE' },
  social:       { emoji: '👥', label: 'Friends/Social', color: '#A855F7' },
  family:       { emoji: '🏠', label: 'Family Time',    color: '#84CC16' },
  gaming:       { emoji: '🎮', label: 'Gaming/Fun',     color: '#F97316' },
  shows:        { emoji: '📺', label: 'Shows/Movies',   color: '#38BDF8' },
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type Day = typeof DAYS[number];

// Smart default days per activity
const DEFAULT_DAYS: Record<string, Day[]> = {
  work:         ['Mon','Tue','Wed','Thu','Fri'],
  school:       ['Mon','Tue','Wed','Thu','Fri'],
  commute:      ['Mon','Tue','Wed','Thu','Fri'],
  gym:          ['Mon','Wed','Fri'],
  running:      ['Mon','Wed','Fri','Sat'],
  meditation:   ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  cooking:      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  errands:      ['Sat','Sun'],
  deep_work:    ['Mon','Tue','Wed','Thu','Fri'],
  learning:     ['Mon','Tue','Wed','Thu','Fri','Sat'],
  creative:     ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  side_project: ['Mon','Tue','Wed','Thu','Sat'],
  reading:      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  social:       ['Thu','Fri','Sat','Sun'],
  family:       ['Sat','Sun'],
  gaming:       ['Fri','Sat','Sun'],
  shows:        ['Fri','Sat','Sun'],
};

function smartDefault(id: string, userType: string, wakeHour: number, hasWork: boolean, hasSchool: boolean): { startMinutes: number; durationMinutes: number } {
  const anchor = hasSchool ? 8*60 : 9*60;
  const early = wakeHour <= 6, ath = userType === 'athlete';
  switch (id) {
    case 'work':        return { startMinutes:9*60,              durationMinutes:480 };
    case 'school':      return { startMinutes:8*60,              durationMinutes:420 };
    case 'commute':     return { startMinutes:anchor-45,         durationMinutes:45  };
    case 'gym':         return (early||ath)?{startMinutes:(wakeHour+1)*60,durationMinutes:60}:{startMinutes:18*60,durationMinutes:60};
    case 'running':     return early?{startMinutes:wakeHour*60+30,durationMinutes:30}:{startMinutes:7*60,durationMinutes:30};
    case 'meditation':  return { startMinutes:wakeHour*60,       durationMinutes:20  };
    case 'cooking':     return { startMinutes:18*60+30,          durationMinutes:60  };
    case 'errands':     return { startMinutes:17*60+30,          durationMinutes:60  };
    case 'deep_work':   return { startMinutes:(wakeHour+1)*60,   durationMinutes:120 };
    case 'learning':    return { startMinutes:20*60,             durationMinutes:60  };
    case 'creative':    return early?{startMinutes:(wakeHour+1)*60,durationMinutes:90}:{startMinutes:10*60,durationMinutes:90};
    case 'side_project':return { startMinutes:20*60,             durationMinutes:90  };
    case 'reading':     return { startMinutes:21*60,             durationMinutes:30  };
    case 'social':      return { startMinutes:19*60,             durationMinutes:120 };
    case 'family':      return { startMinutes:18*60,             durationMinutes:120 };
    case 'gaming':      return { startMinutes:20*60,             durationMinutes:90  };
    case 'shows':       return { startMinutes:20*60+30,          durationMinutes:90  };
    default:            return { startMinutes:19*60,             durationMinutes:60  };
  }
}

const TL_START=6*60, TL_END=23*60, TL_SPAN=TL_END-TL_START;
function toDisplay(m:number){const h=Math.floor(m/60)%24,mn=m%60,p=h>=12?'PM':'AM';return `${h%12||12}:${String(mn).padStart(2,'0')} ${p}`;}
function toHHMM(m:number){return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function parseWakeHour(r:string){const m=r.match(/^(\d+)/);return m?parseInt(m[1]):7;}
function fmtDur(m:number){if(m<60)return`${m}m`;const h=Math.floor(m/60),r=m%60;return r>0?`${h}h ${r}m`:`${h}h`;}

interface Slot { id:string;emoji:string;label:string;color:string;startMinutes:number;durationMinutes:number;days:Day[]; }

function TimeBar({slot}:{slot:Slot}){
  const lp=Math.max(0,(slot.startMinutes-TL_START)/TL_SPAN)*100;
  const wp=Math.min(slot.durationMinutes/TL_SPAN*100,100-lp);
  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-xs text-[#475569] mb-1"><span>6 AM</span><span>12 PM</span><span>11 PM</span></div>
      <div className="relative h-2 rounded-full overflow-hidden bg-[#1E293B]">
        <div className="absolute top-0 bottom-0 w-px bg-[#334155]" style={{left:`${((12*60-TL_START)/TL_SPAN)*100}%`}}/>
        <div className="absolute top-0 h-full rounded-full transition-all duration-100" style={{left:`${lp}%`,width:`${wp}%`,backgroundColor:slot.color}}/>
      </div>
    </div>
  );
}

const DEFAULT_ACTIVITIES = ['work','gym','deep_work','social'];

export default function PlayPage() {
  const router = useRouter();
  const [slots, setSlots]     = useState<Slot[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [step, setStep]       = useState<15|30>(30);
  const [shaking, setShaking] = useState(false);
  const [done, setDone]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [userName, setUserName] = useState('');
  const [dragX, setDragX]     = useState(0);
  const [dragY, setDragY]     = useState(0);
  const [axis, setAxis]       = useState<'h'|'v'|null>(null);
  const dragStart = useRef<{x:number;y:number}|null>(null);
  const baseStart = useRef(0), baseDur = useRef(0);
  const dragging  = useRef(false), lpTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const axisRef   = useRef<'h'|'v'|null>(null);

  useEffect(() => {
    fetch('/api/user').then(r=>r.json()).then(d=>{
      if (!d.onboarded){router.replace('/onboarding');return;}
      const raw=typeof window!=='undefined'?sessionStorage.getItem('drako_user'):null;
      const user=raw?JSON.parse(raw):d.user;
      setUserName(user?.name||'');
      const activities:string[]=user?.selectedActivities?.length>0?user.selectedActivities:DEFAULT_ACTIVITIES;
      const wakeHour=parseWakeHour(user?.rhythm||'7am');
      const userType=user?.type||'professional';
      const hasWork=activities.includes('work'),hasSchool=activities.includes('school');
      setSlots(activities.map(id=>{
        const meta=CATALOG[id]||{emoji:'📌',label:id,color:'#64748B'};
        const {startMinutes,durationMinutes}=smartDefault(id,userType,wakeHour,hasWork,hasSchool);
        const days:Day[]=[...(DEFAULT_DAYS[id]||['Mon','Tue','Wed','Thu','Fri'])];
        return {id,...meta,startMinutes,durationMinutes,days};
      }));
    }).catch(()=>router.replace('/onboarding'));
  },[router]);

  const current=slots[cardIdx];

  const lockIn=useCallback(()=>{
    if(shaking)return;
    setShaking(true);
    setTimeout(()=>{
      setShaking(false);
      if(cardIdx+1>=slots.length)setDone(true);
      else setCardIdx(i=>i+1);
      setDragX(0);setDragY(0);setAxis(null);axisRef.current=null;
    },500);
  },[shaking,cardIdx,slots.length]);

  const onDown=useCallback((e:React.PointerEvent)=>{
    dragStart.current={x:e.clientX,y:e.clientY};
    baseStart.current=current?.startMinutes??0;
    baseDur.current=current?.durationMinutes??60;
    dragging.current=false;axisRef.current=null;setAxis(null);
    if(lpTimer.current)clearTimeout(lpTimer.current);
    lpTimer.current=setTimeout(()=>{if(!dragging.current)lockIn();},600);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  },[current,lockIn]);

  const onMove=useCallback((e:React.PointerEvent)=>{
    if(!dragStart.current)return;
    const dx=e.clientX-dragStart.current.x,dy=e.clientY-dragStart.current.y;
    if((Math.abs(dx)>12||Math.abs(dy)>12)&&!dragging.current){
      dragging.current=true;
      if(lpTimer.current){clearTimeout(lpTimer.current);lpTimer.current=null;}
    }
    if(!dragging.current)return;
    setDragX(dx);setDragY(dy);
    if(!axisRef.current){
      if(Math.abs(dx)>Math.abs(dy)+8){axisRef.current='h';setAxis('h');}
      else if(Math.abs(dy)>Math.abs(dx)+8){axisRef.current='v';setAxis('v');}
    }
    if(!axisRef.current||!current)return;
    if(axisRef.current==='h'){
      const steps=Math.round(dx/55);
      const newStart=Math.max(TL_START,Math.min(TL_END-current.durationMinutes,baseStart.current+steps*step));
      setSlots(prev=>prev.map((s,i)=>i===cardIdx?{...s,startMinutes:newStart}:s));
    } else {
      const steps=Math.round(-dy/55);
      const newDur=Math.max(15,Math.min(480,baseDur.current+steps*step));
      setSlots(prev=>prev.map((s,i)=>i===cardIdx?{...s,durationMinutes:newDur}:s));
    }
  },[current,cardIdx,step]);

  const onUp=useCallback(()=>{
    if(lpTimer.current){clearTimeout(lpTimer.current);lpTimer.current=null;}
    dragStart.current=null;dragging.current=false;axisRef.current=null;
    setDragX(0);setDragY(0);setAxis(null);
  },[]);

  const toggleDay=useCallback((day:Day)=>{
    setSlots(prev=>prev.map((s,i)=>{
      if(i!==cardIdx)return s;
      const days=s.days.includes(day)?s.days.filter(d=>d!==day):[...s.days,day];
      return {...s,days};
    }));
  },[cardIdx]);

  const handleFinish=useCallback(async()=>{
    setSaving(true);
    try {
      const timeSlots:Record<string,{start:string;end:string;label:string;emoji:string;days:string[]}>={};
      slots.forEach(s=>{timeSlots[s.id]={start:toHHMM(s.startMinutes),end:toHHMM(s.startMinutes+s.durationMinutes),label:s.label,emoji:s.emoji,days:s.days};});
      await fetch('/api/user',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({timeSlots})});
      await fetch('/api/schedule/rebuild',{method:'POST'});
      if(typeof window!=='undefined'){
        const raw=sessionStorage.getItem('drako_user');
        if(raw)sessionStorage.setItem('drako_user',JSON.stringify({...JSON.parse(raw),timeSlots}));
      }
    } catch(e){console.error(e);}
    router.push('/schedule');
  },[slots,router]);

  if(slots.length===0)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)'}}>
      <DrakoRobot size="xl" state="thinking"/>
    </div>
  );

  if(done)return(
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{background:'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)'}}>
      <DrakoRobot size="xl" state="greeting" className="mb-8"/>
      <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#10B981] to-[#38BDF8] bg-clip-text text-transparent">
        {userName?`Perfect, ${userName}!`:'Day mapped!'} 🗓️
      </h2>
      <p className="text-[#94A3B8] mb-8">{slots.length} block{slots.length!==1?'s':''} placed across the week</p>
      <div className="w-full max-w-xs space-y-2 mb-10">
        {slots.map(s=>(
          <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{background:`${s.color}15`,border:`1px solid ${s.color}30`}}>
            <span className="text-sm font-medium" style={{color:s.color}}>{s.emoji} {s.label}</span>
            <div className="text-right">
              <div className="text-xs text-[#64748B]">{toDisplay(s.startMinutes)} – {toDisplay(s.startMinutes+s.durationMinutes)}</div>
              <div className="text-xs text-[#475569]">{s.days.slice(0,3).join(', ')}{s.days.length>3?` +${s.days.length-3}`:''}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleFinish} disabled={saving}
        className="w-full max-w-xs px-8 py-5 rounded-2xl font-bold text-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#38BDF8,#818CF8)',boxShadow:'0 0 40px rgba(56,189,248,0.3)'}}>
        {saving?'Building schedule...':'🎙️ Talk to DRAKO →'}
      </button>
    </div>
  );

  const hSteps=axis==='h'?Math.round(dragX/55):0;
  const vSteps=axis==='v'?Math.round(-dragY/55):0;
  const hLabel=hSteps!==0?`${Math.abs(hSteps)*step}m ${hSteps>0?'later':'earlier'}`:null;
  const vLabel=vSteps!==0?`${Math.abs(vSteps)*step}m ${vSteps>0?'longer':'shorter'}`:null;

  return(
    <>
      <style>{`@keyframes shake{0%,100%{transform:rotate(0deg)}20%{transform:rotate(-4deg)}40%{transform:rotate(4deg)}60%{transform:rotate(-3deg)}80%{transform:rotate(3deg)}}.card-shake{animation:shake 0.45s ease;}`}</style>
      <div className="min-h-screen flex flex-col py-6 px-4 select-none touch-none"
        style={{background:'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)'}}
        onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>

        {/* Header */}
        <div className="w-full max-w-sm mx-auto mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#475569] text-sm">{cardIdx+1} / {slots.length}</span>
            <button onClick={()=>setStep(s=>s===30?15:30)}
              className="px-3 py-1.5 rounded-full text-xs font-bold" style={{background:'rgba(30,41,59,0.8)',border:'1px solid #334155',color:'#38BDF8'}}>
              <span style={{color:step===15?'#38BDF8':'#475569'}}>15m</span>
              <span className="text-[#334155] mx-1">|</span>
              <span style={{color:step===30?'#38BDF8':'#475569'}}>30m</span>
            </button>
            <span className="text-[#38BDF8] text-sm">{slots.length-cardIdx-1>0?`${slots.length-cardIdx-1} left`:'last one!'}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-[#1E293B]">
            <div className="h-full rounded-full transition-all duration-500" style={{width:`${(cardIdx/slots.length)*100}%`,background:'linear-gradient(90deg,#38BDF8,#818CF8)'}}/>
          </div>
          <p className="text-[#64748B] text-center mt-2 text-xs">← → shift time &nbsp;·&nbsp; ↑ ↓ duration &nbsp;·&nbsp; <span className="text-[#38BDF8]">hold to confirm</span></p>
        </div>

        {/* Card */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className={`relative w-80 cursor-grab active:cursor-grabbing ${shaking?'card-shake':''}`}
            style={{transform:`rotate(${axis==='h'?dragX/14:0}deg) scaleY(${axis==='v'?1+Math.max(-0.08,Math.min(0.08,-dragY/400)):1})`,transition:shaking?'none':'transform 0.15s ease'}}
            onPointerDown={onDown}>

            {/* Drag badge */}
            {(hLabel||vLabel)&&(
              <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-20 px-4 py-2 rounded-full text-sm font-bold"
                style={{color:hSteps>0||vSteps>0?'#38BDF8':'#818CF8',background:hSteps>0||vSteps>0?'rgba(56,189,248,0.15)':'rgba(129,140,248,0.15)',border:`1px solid ${hSteps>0||vSteps>0?'rgba(56,189,248,0.4)':'rgba(129,140,248,0.4)'}`}}>
                {hLabel||(vSteps>0?`+${Math.abs(vSteps)*step}m longer`:`-${Math.abs(vSteps)*step}m shorter`)}
              </div>
            )}

            {/* Tint overlays */}
            {axis==='h'&&dragX>20&&<div className="absolute inset-0 rounded-3xl z-10 pointer-events-none" style={{background:`rgba(56,189,248,${Math.min(Math.abs(dragX)/250,0.25)})`,borderRadius:24}}/>}
            {axis==='h'&&dragX<-20&&<div className="absolute inset-0 rounded-3xl z-10 pointer-events-none" style={{background:`rgba(129,140,248,${Math.min(Math.abs(dragX)/250,0.25)})`,borderRadius:24}}/>}
            {axis==='v'&&dragY<-20&&<div className="absolute inset-0 rounded-3xl z-10 pointer-events-none" style={{background:`rgba(16,185,129,${Math.min(Math.abs(dragY)/250,0.25)})`,borderRadius:24}}/>}
            {axis==='v'&&dragY>20&&<div className="absolute inset-0 rounded-3xl z-10 pointer-events-none" style={{background:`rgba(239,68,68,${Math.min(Math.abs(dragY)/250,0.25)})`,borderRadius:24}}/>}

            {current&&(
              <div className="rounded-3xl p-6 flex flex-col items-center text-center"
                style={{background:'rgba(15,23,42,0.95)',border:`2px solid ${current.color}50`,boxShadow:`0 0 60px ${current.color}15,0 20px 60px rgba(0,0,0,0.5)`}}>
                <span className="text-6xl mb-3" style={{filter:`drop-shadow(0 0 20px ${current.color}60)`}}>{current.emoji}</span>
                <h2 className="text-xl font-bold text-white mb-3">{current.label}</h2>

                {/* Time window */}
                <div className="w-full px-3 py-2.5 rounded-2xl mb-2" style={{background:`${current.color}12`,border:`1px solid ${current.color}30`}}>
                  <div className="text-lg font-black" style={{color:current.color}}>
                    {toDisplay(current.startMinutes)}<span className="text-[#475569] font-normal mx-2 text-sm">→</span>{toDisplay(current.startMinutes+current.durationMinutes)}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">{fmtDur(current.durationMinutes)} · {step}m steps</div>
                </div>

                <TimeBar slot={current}/>

                {/* Day selector — stopPropagation so it doesn't trigger drag */}
                <div className="w-full mt-3" onPointerDown={e=>e.stopPropagation()}>
                  <p className="text-xs text-[#475569] mb-2 uppercase tracking-wider">Which days?</p>
                  <div className="flex justify-between gap-1">
                    {DAYS.map(day=>{
                      const on=current.days.includes(day);
                      return(
                        <button key={day} onClick={()=>toggleDay(day)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{background:on?`${current.color}30`:' rgba(30,41,59,0.8)',color:on?current.color:'#475569',border:`1px solid ${on?current.color:'#334155'}`}}>
                          {day.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hold hint */}
        <div className="w-full max-w-sm mx-auto mt-4 text-center">
          <p className="text-xs text-[#38BDF8] font-medium animate-pulse">Press and hold card to confirm ✓</p>
        </div>
      </div>
    </>
  );
}
