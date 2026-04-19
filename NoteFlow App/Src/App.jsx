import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── PASTE YOUR SUPABASE CREDENTIALS HERE ──
const SUPABASE_URL = "https://vlxapdrxehcrtwsisdee.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseGFwZHJ4ZWhjcnR3c2lzZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1Mjk4NDksImV4cCI6MjA5MjEwNTg0OX0._bhnZxX9m0QRfg2BE_y5Sg1XX3SXcl3eyFXIbZnAdLw";
const MY_NAME_KEY  = "noteflow_myname";
const MY_EMAIL_KEY = "noteflow_myemail";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = [
  { id: "meetings", label: "Meetings", color: "#4F8EF7", icon: "👥" },
  { id: "clients",  label: "Clients",  color: "#F76E4F", icon: "🤝" },
  { id: "ideas",    label: "Ideas",    color: "#A04FF7", icon: "💡" },
  { id: "tasks",    label: "Tasks",    color: "#4FC68A", icon: "✅" },
  { id: "research", label: "Research", color: "#F7C44F", icon: "🔍" },
  { id: "personal", label: "Personal", color: "#F74FA0", icon: "🌿" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate  = (s) => { if (!s) return "—"; const d = new Date(s + "T12:00:00"); return d.toLocaleDateString([], { month:"short", day:"numeric", year:"numeric" }); };
const fmtTime  = (iso) => { try { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }); } catch { return ""; } };
const daysDiff = (s) => { if (!s) return null; const d = new Date(s+"T12:00:00"), n = new Date(); n.setHours(0,0,0,0); return Math.round((d-n)/86400000); };
const urgencyColor = (d) => { if(d===null)return"#888"; if(d<0)return"#FF4F4F"; if(d===0)return"#FF8C00"; if(d<=3)return"#FFD700"; return"#4FC68A"; };
const urgencyLabel = (d) => { if(d===null)return"No deadline"; if(d<0)return`${Math.abs(d)}d overdue`; if(d===0)return"Due today"; if(d===1)return"Due tomorrow"; return`${d}d left`; };

function loadMyName()  { try { return localStorage.getItem(MY_NAME_KEY)||""; }  catch { return ""; } }
function saveMyName(n) { try { localStorage.setItem(MY_NAME_KEY, n); }  catch {} }
function loadMyEmail()  { try { return localStorage.getItem(MY_EMAIL_KEY)||""; } catch { return ""; } }
function saveMyEmail(e) { try { localStorage.setItem(MY_EMAIL_KEY, e); } catch {} }

const inputSt = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.11)", borderRadius:11, padding:"9px 13px", color:"#fff", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none" };

function Label({ children }) {
  return <div style={{ color:"rgba(255,255,255,0.35)", fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>{children}</div>;
}
function Field({ label, children, style={} }) {
  return <div style={{ marginBottom:14, ...style }}><Label>{label}</Label>{children}</div>;
}
function CategoryPill({ cat, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ background:selected?cat.color:"rgba(255,255,255,0.07)", border:`1.5px solid ${selected?cat.color:"rgba(255,255,255,0.12)"}`, color:selected?"#fff":"rgba(255,255,255,0.55)", borderRadius:22, padding:"5px 13px", fontSize:12, fontFamily:"'DM Sans',sans-serif", fontWeight:selected?700:400, cursor:"pointer", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", boxShadow:selected?`0 2px 10px ${cat.color}44`:"none", transition:"all 0.15s" }}>
      {cat.icon} {cat.label}
    </button>
  );
}

/* ── Delete Confirm Modal ── */
function DeleteConfirmModal({ note, onConfirm, onCancel }) {
  const cat = CATEGORIES.find((c) => c.id === note.category);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}
      onClick={(e)=>e.target===e.currentTarget&&onCancel()}>
      <div className="modal" style={{ background:"#13161f", border:"1px solid rgba(255,80,80,0.25)", borderRadius:20, padding:"28px 26px", width:"100%", maxWidth:420, boxShadow:"0 24px 80px rgba(0,0,0,0.8)", textAlign:"center" }}>
        <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(255,79,79,0.12)", border:"1px solid rgba(255,79,79,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", fontSize:22 }}>🗑</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#fff", marginBottom:8 }}>Delete this note?</div>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderLeft:`3px solid ${cat?.color||"#888"}`, borderRadius:10, padding:"11px 14px", margin:"14px 0 20px", textAlign:"left" }}>
          {note.topic&&<div style={{ color:"#fff", fontSize:13, fontWeight:600, marginBottom:4 }}>{note.topic}</div>}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {note.date&&<span style={{ color:"rgba(255,255,255,0.4)", fontSize:11, fontFamily:"'DM Mono',monospace" }}>📅 {fmtDate(note.date)}</span>}
            {note.people&&<span style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>👤 {note.people}</span>}
          </div>
          {(note.follow_ups||[]).filter(f=>!f.done).length>0&&(
            <div style={{ marginTop:8, color:"#FFD700", fontSize:11, background:"rgba(255,200,0,0.08)", border:"1px solid rgba(255,200,0,0.2)", borderRadius:6, padding:"4px 9px", display:"inline-block" }}>
              ⚠ {(note.follow_ups||[]).filter(f=>!f.done).length} open follow-up{(note.follow_ups||[]).filter(f=>!f.done).length>1?"s":""} will also be deleted
            </div>
          )}
        </div>
        <div style={{ color:"rgba(255,255,255,0.35)", fontSize:12, marginBottom:22, lineHeight:1.5 }}>This cannot be undone.</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:"11px", fontSize:14, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, background:"linear-gradient(135deg,#c0392b,#e74c3c)", border:"none", borderRadius:12, color:"#fff", cursor:"pointer", padding:"11px", fontSize:14, fontFamily:"'DM Sans',sans-serif", fontWeight:700, boxShadow:"0 4px 16px rgba(231,76,60,0.4)" }}>Delete Note</button>
        </div>
      </div>
    </div>
  );
}

/* ── Teams Import Review Modal ── */
function TeamsImportModal({ note, onSave, onDismiss }) {
  const [form, setForm] = useState({ ...note });
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const updFU = (idx,k,v) => setForm(f=>({...f,follow_ups:f.follow_ups.map((fu,i)=>i===idx?{...fu,[k]:v}:fu)}));
  const remFU = (idx) => setForm(f=>({...f,follow_ups:f.follow_ups.filter((_,i)=>i!==idx)}));
  const addFU = () => setForm(f=>({...f,follow_ups:[...f.follow_ups,{id:Date.now().toString(),item:"",person:"",deadline:"",done:false}]}));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:150, padding:14 }}
      onClick={(e)=>e.target===e.currentTarget&&onDismiss()}>
      <div className="modal" style={{ background:"#13161f", border:"1px solid rgba(79,142,247,0.3)", borderRadius:22, padding:"22px 24px", width:"100%", maxWidth:620, boxShadow:"0 28px 90px rgba(0,0,0,0.85)", maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"rgba(79,142,247,0.15)", border:"1px solid rgba(79,142,247,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>💼</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"#fff" }}>Teams Meeting Imported</div>
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11, marginTop:1, fontFamily:"'DM Mono',monospace" }}>
              Review and confirm before saving to NoteFlow
            </div>
          </div>
          <button onClick={onDismiss} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, color:"rgba(255,255,255,0.4)", cursor:"pointer", width:30, height:30, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Teams badge */}
        <div style={{ background:"rgba(79,142,247,0.08)", border:"1px solid rgba(79,142,247,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>🔵</span>
          <div>
            <div style={{ color:"#4F8EF7", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>Auto-imported from Microsoft Teams</div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginTop:1 }}>Summary, attendees and action items pulled automatically. Review and edit anything before saving.</div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          <Field label="📅 Date" style={{ flex:1, marginBottom:0 }}>
            <input type="date" value={form.date||""} onChange={(e)=>sf("date",e.target.value)} style={inputSt} />
          </Field>
          <Field label="👤 Attendees" style={{ flex:2, marginBottom:0 }}>
            <input value={form.people||""} onChange={(e)=>sf("people",e.target.value)} placeholder="Names from meeting…" style={inputSt} />
          </Field>
        </div>

        <Field label="💬 Meeting Title / Topic">
          <input value={form.topic||""} onChange={(e)=>sf("topic",e.target.value)} style={inputSt} />
        </Field>

        <Field label="📝 Teams AI Summary">
          <textarea value={form.body||""} onChange={(e)=>sf("body",e.target.value)}
            style={{...inputSt, minHeight:120, lineHeight:1.7, resize:"vertical"}} />
        </Field>

        {/* Follow-ups from Teams */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div>
              <Label>✅ Action Items from Teams</Label>
            </div>
            <button onClick={addFU} style={{ background:"rgba(79,198,138,0.12)", border:"1px solid rgba(79,198,138,0.25)", borderRadius:8, color:"#4FC68A", cursor:"pointer", padding:"4px 12px", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>+ Add Item</button>
          </div>
          {(form.follow_ups||[]).length===0?(
            <div style={{ border:"1px dashed rgba(255,255,255,0.1)", borderRadius:11, padding:"14px", textAlign:"center", color:"rgba(255,255,255,0.22)", fontSize:12 }}>
              No action items detected from Teams — tap "+ Add Item" to add manually
            </div>
          ):(form.follow_ups||[]).map((fu,idx)=>(
            <div key={fu.id} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:11, padding:"11px 13px", marginBottom:8, display:"flex", gap:8, alignItems:"flex-start", flexWrap:"wrap" }}>
              <div style={{ flex:"2 1 150px" }}><Label>Action Item</Label><input value={fu.item} onChange={(e)=>updFU(idx,"item",e.target.value)} style={{...inputSt,fontSize:12,padding:"7px 10px"}} /></div>
              <div style={{ flex:"1 1 110px" }}><Label>Person</Label><input value={fu.person} onChange={(e)=>updFU(idx,"person",e.target.value)} style={{...inputSt,fontSize:12,padding:"7px 10px"}} /></div>
              <div style={{ flex:"1 1 120px" }}><Label>Deadline</Label><input type="date" value={fu.deadline} onChange={(e)=>updFU(idx,"deadline",e.target.value)} style={{...inputSt,fontSize:12,padding:"7px 10px"}} /></div>
              <button onClick={()=>remFU(idx)} style={{ background:"rgba(255,60,60,0.1)", border:"1px solid rgba(255,60,60,0.2)", borderRadius:8, color:"rgba(255,90,90,0.7)", cursor:"pointer", width:28, height:28, fontSize:14, flexShrink:0, alignSelf:"flex-end", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          ))}
        </div>

        <Field label="📁 Assign to Folder">
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {CATEGORIES.map((cat)=>(
              <CategoryPill key={cat.id} cat={cat} selected={form.category===cat.id} onClick={()=>sf("category",cat.id)} />
            ))}
          </div>
        </Field>

        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button onClick={onDismiss} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:11, color:"rgba(255,255,255,0.45)", cursor:"pointer", padding:"9px 17px", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            Dismiss
          </button>
          <button onClick={()=>onSave(form)} style={{ flex:1, background:"linear-gradient(135deg,#4F8EF7,#7B5CF7)", border:"none", borderRadius:11, color:"#fff", cursor:"pointer", padding:"11px 21px", fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 4px 14px rgba(79,142,247,0.3)" }}>
            ✓ Save to NoteFlow
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Follow-up badge ── */
function FollowUpBadge({ fu, myName, onToggle }) {
  const days=daysDiff(fu.deadline), color=urgencyColor(days);
  const isMe = myName && fu.person.toLowerCase().includes(myName.toLowerCase());
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:fu.done?"rgba(255,255,255,0.02)":`${color}0d`, border:`1px solid ${fu.done?"rgba(255,255,255,0.06)":color+"33"}`, borderRadius:9, marginBottom:6, flexWrap:"wrap", opacity:fu.done?0.5:1 }}>
      <button onClick={()=>onToggle(fu.id)} style={{ width:18, height:18, borderRadius:5, flexShrink:0, background:fu.done?color:"transparent", border:`2px solid ${fu.done?color:"rgba(255,255,255,0.25)"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:10 }}>{fu.done?"✓":""}</button>
      <span style={{ flex:1, color:fu.done?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.85)", fontSize:12, fontFamily:"'DM Sans',sans-serif", textDecoration:fu.done?"line-through":"none" }}>{fu.item}</span>
      {fu.person&&<span style={{ background:isMe?"rgba(79,142,247,0.15)":"rgba(255,255,255,0.06)", border:`1px solid ${isMe?"rgba(79,142,247,0.3)":"rgba(255,255,255,0.1)"}`, color:isMe?"#4F8EF7":"rgba(255,255,255,0.45)", borderRadius:7, padding:"1px 8px", fontSize:11, fontWeight:isMe?700:400 }}>{isMe?"👤 Me":`👤 ${fu.person}`}</span>}
      {fu.deadline&&<span style={{ color:fu.done?"rgba(255,255,255,0.3)":color, fontSize:11, fontFamily:"'DM Mono',monospace", background:fu.done?"transparent":`${color}15`, border:`1px solid ${fu.done?"transparent":color+"30"}`, borderRadius:7, padding:"1px 8px", whiteSpace:"nowrap" }}>{urgencyLabel(days)}</span>}
    </div>
  );
}

/* ── Note Card ── */
function NoteCard({ note, onDelete, onMove, onToggleFollowUp, onEdit, myName }) {
  const cat = CATEGORIES.find((c)=>c.id===note.category);
  const [expanded, setExpanded] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const openFUs = (note.follow_ups||[]).filter((f)=>!f.done);
  const overdue = openFUs.filter((f)=>f.deadline&&daysDiff(f.deadline)<0);
  const isTeams = note.source === "teams";

  return (
    <div className="note-row" style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${isTeams?"rgba(79,142,247,0.2)":"rgba(255,255,255,0.08)"}`, borderLeft:`3px solid ${cat?.color||"#888"}`, borderRadius:15, marginBottom:9, overflow:"hidden" }}>
      <div onClick={()=>setExpanded((e)=>!e)} style={{ padding:"12px 15px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ color:"rgba(255,255,255,0.22)", fontSize:10, marginTop:3, flexShrink:0, transition:"transform 0.2s", transform:expanded?"rotate(90deg)":"rotate(0deg)" }}>▶</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", marginBottom:4 }}>
            <span style={{ background:`${cat?.color}22`, border:`1px solid ${cat?.color}44`, color:cat?.color, borderRadius:7, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{cat?.icon} {cat?.label}</span>
            {isTeams&&<span style={{ background:"rgba(79,142,247,0.12)", border:"1px solid rgba(79,142,247,0.25)", color:"#4F8EF7", borderRadius:7, padding:"2px 8px", fontSize:10, fontWeight:700 }}>🔵 Teams</span>}
            {note.date&&<span style={{ color:"rgba(255,255,255,0.45)", fontSize:11, fontFamily:"'DM Mono',monospace" }}>📅 {fmtDate(note.date)}</span>}
            {note.people&&<span style={{ color:"rgba(255,255,255,0.45)", fontSize:11 }}>👤 {note.people}</span>}
            {overdue.length>0&&<span style={{ background:"rgba(255,79,79,0.15)", border:"1px solid rgba(255,79,79,0.35)", color:"#FF4F4F", borderRadius:7, padding:"2px 8px", fontSize:10, fontWeight:700 }}>⚠ {overdue.length} overdue</span>}
            {openFUs.length>0&&overdue.length===0&&<span style={{ background:"rgba(255,200,0,0.1)", border:"1px solid rgba(255,200,0,0.25)", color:"#FFD700", borderRadius:7, padding:"2px 8px", fontSize:10, fontWeight:700 }}>⏳ {openFUs.length} open</span>}
            {note.edited_at&&<span style={{ color:"rgba(255,255,255,0.2)", fontSize:10, fontFamily:"'DM Mono',monospace" }}>edited {fmtDate(note.edited_at.slice(0,10))}</span>}
          </div>
          {note.topic&&<div style={{ color:"#fff", fontSize:13, fontWeight:600, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{note.topic}</div>}
          {!expanded&&note.body&&<div style={{ color:"rgba(255,255,255,0.38)", fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{note.body}</div>}
        </div>
        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
          <button onClick={(e)=>{e.stopPropagation();onEdit(note);}} style={{ background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.22)", borderRadius:7, color:"#4F8EF7", cursor:"pointer", width:27, height:27, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✎</button>
          <button onClick={(e)=>{e.stopPropagation();setShowMove((s)=>!s);}} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"rgba(255,255,255,0.4)", cursor:"pointer", width:27, height:27, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>📁</button>
          <button onClick={(e)=>{e.stopPropagation();onDelete(note);}} style={{ background:"rgba(255,60,60,0.08)", border:"1px solid rgba(255,60,60,0.2)", borderRadius:7, color:"rgba(255,90,90,0.6)", cursor:"pointer", width:27, height:27, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🗑</button>
        </div>
      </div>
      {expanded&&(
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.055)", padding:"12px 15px 14px" }}>
          {note.body&&<div style={{ marginBottom:14 }}><Label>{isTeams?"Teams AI Summary":"Notes"}</Label><p style={{ color:"rgba(255,255,255,0.8)", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap", margin:0 }}>{note.body}</p></div>}
          {(note.follow_ups||[]).length>0&&(
            <div><Label>Follow-ups & To-Dos</Label>
              {(note.follow_ups||[]).map((fu)=>(
                <FollowUpBadge key={fu.id} fu={fu} myName={myName} onToggle={(fid)=>onToggleFollowUp(note.id,fid)} />
              ))}
            </div>
          )}
          {note.teams_meeting_id&&(
            <div style={{ marginTop:10, color:"rgba(255,255,255,0.2)", fontSize:10, fontFamily:"'DM Mono',monospace" }}>
              🔵 Teams Meeting ID: {note.teams_meeting_id}
            </div>
          )}
          <div style={{ color:"rgba(255,255,255,0.18)", fontSize:10, fontFamily:"'DM Mono',monospace", marginTop:6 }}>
            {isTeams?"Imported":"Created"} {fmtDate(note.created_at?.slice(0,10))} at {fmtTime(note.created_at)}
            {note.edited_at&&` · Edited ${fmtDate(note.edited_at.slice(0,10))}`}
          </div>
        </div>
      )}
      {showMove&&(
        <div style={{ padding:"9px 15px 11px", borderTop:"1px solid rgba(255,255,255,0.055)", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ color:"rgba(255,255,255,0.28)", fontSize:11 }}>Move to:</span>
          {CATEGORIES.filter((c)=>c.id!==note.category).map((c)=>(
            <button key={c.id} onClick={()=>{onMove(note.id,c.id);setShowMove(false);}} style={{ background:`${c.color}18`, border:`1px solid ${c.color}40`, color:c.color, borderRadius:9, padding:"3px 10px", fontSize:11, cursor:"pointer" }}>{c.icon} {c.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Accountability Panel ── */
function AccountabilityPanel({ notes, myName, onToggleFollowUp }) {
  const allFUs = notes.flatMap((n)=>(n.follow_ups||[]).map((f)=>({...f,noteId:n.id,noteTopic:n.topic,noteDate:n.date})));
  const isMe   = (p) => myName&&p.toLowerCase().includes(myName.toLowerCase());
  const myOpen = allFUs.filter((f)=>!f.done&&isMe(f.person));
  const othOpen= allFUs.filter((f)=>!f.done&&f.person&&!isMe(f.person));

  const FUItem = ({ fu }) => {
    const days=daysDiff(fu.deadline), col=urgencyColor(days);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 11px", marginBottom:6, background:`${col}0d`, border:`1px solid ${col}30`, borderRadius:10, flexWrap:"wrap" }}>
        <button onClick={()=>onToggleFollowUp(fu.noteId,fu.id)} style={{ width:17, height:17, borderRadius:4, flexShrink:0, background:"transparent", border:`2px solid ${col}`, cursor:"pointer" }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:"rgba(255,255,255,0.85)", fontSize:12 }}>{fu.item}</div>
          {fu.noteTopic&&<div style={{ color:"rgba(255,255,255,0.3)", fontSize:10, fontFamily:"'DM Mono',monospace", marginTop:1 }}>from: {fu.noteTopic}</div>}
        </div>
        {fu.person&&!isMe(fu.person)&&<span style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.45)", borderRadius:6, padding:"1px 7px", fontSize:10 }}>👤 {fu.person}</span>}
        {fu.deadline&&<span style={{ color:col, fontSize:10, fontFamily:"'DM Mono',monospace", background:`${col}15`, border:`1px solid ${col}28`, borderRadius:6, padding:"1px 7px", whiteSpace:"nowrap" }}>{urgencyLabel(days)}</span>}
      </div>
    );
  };

  const Sec = ({ title, items, color }) => items.length===0?null:(
    <div style={{ marginBottom:14 }}>
      <div style={{ color:color, fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:0.5, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
        {title}<span style={{ background:`${color}20`, border:`1px solid ${color}40`, borderRadius:999, padding:"0px 7px", fontSize:10 }}>{items.length}</span>
      </div>
      {items.map((fu)=><FUItem key={fu.id} fu={fu} />)}
    </div>
  );

  const myOver=myOpen.filter((f)=>f.deadline&&daysDiff(f.deadline)<0);
  const myToday=myOpen.filter((f)=>f.deadline&&daysDiff(f.deadline)===0);
  const myUp=myOpen.filter((f)=>!f.deadline||daysDiff(f.deadline)>0);
  const oOver=othOpen.filter((f)=>f.deadline&&daysDiff(f.deadline)<0);
  const oToday=othOpen.filter((f)=>f.deadline&&daysDiff(f.deadline)===0);
  const oUp=othOpen.filter((f)=>!f.deadline||daysDiff(f.deadline)>0);

  return (
    <div style={{ padding:"18px 22px", overflowY:"auto", flex:1 }}>
      {myOpen.length===0&&othOpen.length===0?(
        <div style={{ textAlign:"center", color:"rgba(255,255,255,0.2)", marginTop:50 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
          <div style={{ fontSize:14 }}>All caught up!</div>
        </div>
      ):(
        <>
          {myOpen.length>0&&(
            <div style={{ background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.15)", borderRadius:14, padding:"14px 16px", marginBottom:18 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:"#4F8EF7", marginBottom:12 }}>My Action Items</div>
              <Sec title="⚠ OVERDUE"   items={myOver}  color="#FF4F4F" />
              <Sec title="🔥 DUE TODAY" items={myToday} color="#FF8C00" />
              <Sec title="📋 UPCOMING"  items={myUp}    color="#4F8EF7" />
            </div>
          )}
          {othOpen.length>0&&(
            <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>Others' Follow-ups</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginBottom:12 }}>Track whether others completed their commitments</div>
              <Sec title="⚠ OVERDUE — FOLLOW UP NOW" items={oOver}  color="#FF4F4F" />
              <Sec title="🔥 DUE TODAY"               items={oToday} color="#FF8C00" />
              <Sec title="📋 UPCOMING"                 items={oUp}    color="#888"   />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Note Modal (create / edit) ── */
function NoteModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const newFU  = () => ({ id:Date.now().toString()+Math.random(), item:"", person:"", deadline:"", done:false });
  const [form, setForm] = useState(initial
    ? { ...initial, follow_ups:[...(initial.follow_ups||[])] }
    : { date:todayStr(), people:"", topic:"", body:"", category:CATEGORIES[0].id, follow_ups:[] }
  );
  const bodyRef = useRef(null);
  useEffect(()=>{ if(bodyRef.current) bodyRef.current.focus(); },[]);

  const sf   = (k,v) => setForm((f)=>({...f,[k]:v}));
  const addFU= () => setForm((f)=>({...f,follow_ups:[...f.follow_ups,newFU()]}));
  const updFU= (idx,k,v) => setForm((f)=>({...f,follow_ups:f.follow_ups.map((fu,i)=>i===idx?{...fu,[k]:v}:fu)}));
  const remFU= (idx) => setForm((f)=>({...f,follow_ups:f.follow_ups.filter((_,i)=>i!==idx)}));
  const ok   = form.body.trim()||form.topic.trim();

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:14 }}
      onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ background:"#13161f", border:"1px solid rgba(255,255,255,0.09)", borderRadius:22, padding:"22px 24px", width:"100%", maxWidth:600, boxShadow:"0 28px 90px rgba(0,0,0,0.78)", maxHeight:"92vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"#fff" }}>{isEdit?"Edit Note":"New Note"}</div>
            <div style={{ color:"rgba(255,255,255,0.28)", fontSize:10, marginTop:1, fontFamily:"'DM Mono',monospace" }}>
              {isEdit?`Originally created ${fmtDate((form.created_at||"").slice(0,10))}`:"All fields optional except notes or topic"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, color:"rgba(255,255,255,0.4)", cursor:"pointer", width:30, height:30, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          <Field label="📅 Date" style={{ flex:1, marginBottom:0 }}><input type="date" value={form.date||""} onChange={(e)=>sf("date",e.target.value)} style={inputSt} /></Field>
          <Field label="👤 People Involved" style={{ flex:2, marginBottom:0 }}><input value={form.people||""} onChange={(e)=>sf("people",e.target.value)} placeholder="e.g. Sarah Chen, Mike Torres…" style={inputSt} /></Field>
        </div>
        <Field label="💬 Topic"><input value={form.topic||""} onChange={(e)=>sf("topic",e.target.value)} placeholder="e.g. Q3 Budget Review…" style={inputSt} /></Field>
        <Field label="📝 Notes"><textarea ref={bodyRef} value={form.body||""} onChange={(e)=>sf("body",e.target.value)} placeholder="Write your notes…" onKeyDown={(e)=>{ if(e.key==="Enter"&&e.metaKey) ok&&onSave({...form,follow_ups:form.follow_ups.filter(fu=>fu.item.trim())}); }} style={{...inputSt,minHeight:100,lineHeight:1.7,resize:"vertical"}} /></Field>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <Label>✅ Follow-ups & To-Dos</Label>
            <button onClick={addFU} style={{ background:"rgba(79,198,138,0.12)", border:"1px solid rgba(79,198,138,0.25)", borderRadius:8, color:"#4FC68A", cursor:"pointer", padding:"4px 12px", fontSize:12 }}>+ Add Item</button>
          </div>
          {form.follow_ups.length===0?(
            <div style={{ border:"1px dashed rgba(255,255,255,0.1)", borderRadius:11, padding:"14px", textAlign:"center", color:"rgba(255,255,255,0.22)", fontSize:12 }}>Tap "+ Add Item" to log follow-up actions</div>
          ):form.follow_ups.map((fu,idx)=>(
            <div key={fu.id} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:11, padding:"11px 13px", marginBottom:8, display:"flex", gap:8, alignItems:"flex-start", flexWrap:"wrap" }}>
              <div style={{ flex:"2 1 150px" }}><Label>Action Item</Label><input value={fu.item} onChange={(e)=>updFU(idx,"item",e.target.value)} style={{...inputSt,fontSize:12,padding:"7px 10px"}} /></div>
              <div style={{ flex:"1 1 110px" }}><Label>Person</Label><input value={fu.person} onChange={(e)=>updFU(idx,"person",e.target.value)} style={{...inputSt,fontSize:12,padding:"7px 10px"}} /></div>
              <div style={{ flex:"1 1 120px" }}><Label>Deadline</Label><input type="date" value={fu.deadline} onChange={(e)=>updFU(idx,"deadline",e.target.value)} style={{...inputSt,fontSize:12,padding:"7px 10px"}} /></div>
              <button onClick={()=>remFU(idx)} style={{ background:"rgba(255,60,60,0.1)", border:"1px solid rgba(255,60,60,0.2)", borderRadius:8, color:"rgba(255,90,90,0.7)", cursor:"pointer", width:28, height:28, fontSize:14, flexShrink:0, alignSelf:"flex-end", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          ))}
        </div>
        <Field label="📁 Folder">
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {CATEGORIES.map((cat)=>(
              <CategoryPill key={cat.id} cat={cat} selected={form.category===cat.id} onClick={()=>sf("category",cat.id)} />
            ))}
          </div>
        </Field>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:4 }}>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:11, color:"rgba(255,255,255,0.45)", cursor:"pointer", padding:"9px 17px", fontSize:13 }}>Cancel</button>
          <button onClick={()=>ok&&onSave({...form,follow_ups:form.follow_ups.filter(fu=>fu.item.trim())})} disabled={!ok} style={{ background:ok?"linear-gradient(135deg,#4F8EF7,#7B5CF7)":"rgba(255,255,255,0.07)", border:"none", borderRadius:11, color:ok?"#fff":"rgba(255,255,255,0.25)", cursor:ok?"pointer":"not-allowed", padding:"9px 21px", fontSize:13, fontWeight:700, boxShadow:ok?"0 4px 14px rgba(79,142,247,0.3)":"none", transition:"all 0.18s" }}>
            {isEdit?"Save Changes →":"Save Note →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ MAIN APP ══════════════ */
export default function NoteFlow() {
  const [notes,          setNotes]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [myName,         setMyName]         = useState(()=>loadMyName());
  const [myEmail,        setMyEmail]        = useState(()=>loadMyEmail());
  const [editingName,    setEditingName]    = useState(!loadMyName());
  const [editingEmail,   setEditingEmail]   = useState(!loadMyEmail());
  const [activeFolder,   setActiveFolder]   = useState("all");
  const [activeView,     setActiveView]     = useState("notes");
  const [modal,          setModal]          = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [teamsImport,    setTeamsImport]    = useState(null); // pending Teams note to review
  const [teamsInboxCount,setTeamsInboxCount]= useState(0);
  const [savedToast,     setSavedToast]     = useState("");
  const [searchText,     setSearchText]     = useState("");
  const [searchDate,     setSearchDate]     = useState("");
  const [searchPeople,   setSearchPeople]   = useState("");
  const [searchTopic,    setSearchTopic]    = useState("");
  const [showFilters,    setShowFilters]    = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending:false });
    if (!error) {
      setNotes(data||[]);
      // Count unreviewed Teams imports
      const pending = (data||[]).filter(n=>n.source==="teams"&&!n.teams_reviewed);
      setTeamsInboxCount(pending.length);
      // Auto-open first unreviewed Teams note
      if (pending.length>0 && !teamsImport) {
        setTeamsImport(pending[0]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Poll for new Teams imports every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("source","teams")
        .eq("teams_reviewed",false);
      if (data&&data.length>0) {
        setTeamsInboxCount(data.length);
        setTeamsImport(data[0]);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => { setSavedToast(msg); setTimeout(()=>setSavedToast(""),2500); };

  const handleSave = useCallback(async (form) => {
    const isEdit = notes.some((n)=>n.id===form.id);
    if (isEdit) {
      const { error } = await supabase.from("notes").update({
        date:form.date, people:form.people, topic:form.topic,
        body:form.body, category:form.category,
        follow_ups:form.follow_ups, edited_at:new Date().toISOString(),
        teams_reviewed:true,
      }).eq("id", form.id);
      if (!error) { showToast("✓ Note updated"); fetchNotes(); }
      else showToast("❌ Error saving");
    } else {
      const { error } = await supabase.from("notes").insert([{
        date:form.date, people:form.people, topic:form.topic,
        body:form.body, category:form.category,
        follow_ups:form.follow_ups, source:"manual",
      }]);
      if (!error) { showToast("✓ Note saved to cloud"); fetchNotes(); }
      else showToast("❌ Error saving");
    }
    setModal(null);
  }, [notes, fetchNotes]);

  // Save Teams import after review
  const handleTeamsImportSave = useCallback(async (form) => {
    const { error } = await supabase.from("notes").update({
      date:form.date, people:form.people, topic:form.topic,
      body:form.body, category:form.category,
      follow_ups:form.follow_ups,
      teams_reviewed:true,
      edited_at:new Date().toISOString(),
    }).eq("id", form.id);
    if (!error) {
      showToast("✓ Teams meeting saved to NoteFlow");
      setTeamsImport(null);
      fetchNotes();
    }
  }, [fetchNotes]);

  // Dismiss Teams import without saving changes
  const handleTeamsDismiss = useCallback(async () => {
    if (teamsImport) {
      await supabase.from("notes").update({ teams_reviewed:true }).eq("id", teamsImport.id);
    }
    setTeamsImport(null);
    setTeamsInboxCount(0);
    fetchNotes();
  }, [teamsImport, fetchNotes]);

  const requestDelete = useCallback((note) => setDeleteTarget(note), []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await supabase.from("notes").delete().eq("id", deleteTarget.id);
    setNotes((p)=>p.filter((n)=>n.id!==deleteTarget.id));
    setDeleteTarget(null);
    showToast("🗑 Note deleted");
  }, [deleteTarget]);

  const handleMove = useCallback(async (id, cat) => {
    await supabase.from("notes").update({ category:cat }).eq("id", id);
    setNotes((p)=>p.map((n)=>n.id===id?{...n,category:cat}:n));
  }, []);

  const handleToggleFollowUp = useCallback(async (noteId, fuId) => {
    const note = notes.find((n)=>n.id===noteId);
    if (!note) return;
    const updatedFUs = (note.follow_ups||[]).map((f)=>f.id===fuId?{...f,done:!f.done}:f);
    await supabase.from("notes").update({ follow_ups:updatedFUs }).eq("id", noteId);
    setNotes((p)=>p.map((n)=>n.id!==noteId?n:{...n,follow_ups:updatedFUs}));
  }, [notes]);

  const filtered = notes.filter((n)=>{
    if (activeFolder!=="all"&&n.category!==activeFolder) return false;
    if (searchDate   && n.date!==searchDate) return false;
    if (searchPeople && !(n.people||"").toLowerCase().includes(searchPeople.toLowerCase())) return false;
    if (searchTopic  && !(n.topic||"").toLowerCase().includes(searchTopic.toLowerCase())) return false;
    if (searchText) {
      const q=searchText.toLowerCase();
      const fuText=(n.follow_ups||[]).map((f)=>`${f.item} ${f.person}`).join(" ");
      if(![n.body,n.topic,n.people,fmtDate(n.date),fuText].some((s)=>(s||"").toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const allFUs       = notes.flatMap((n)=>(n.follow_ups||[]).map((f)=>({...f})));
  const openCount    = allFUs.filter((f)=>!f.done).length;
  const overdueCount = allFUs.filter((f)=>!f.done&&f.deadline&&daysDiff(f.deadline)<0).length;
  const catCount     = (id)=>notes.filter((n)=>n.category===id).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.09);border-radius:3px;}
        textarea,input{outline:none;}
        button{transition:transform 0.1s;}
        button:active{transform:scale(0.96);}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.5);}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes toast{0%{opacity:0;transform:translateX(-50%) translateY(10px);}15%{opacity:1;transform:translateX(-50%) translateY(0);}80%{opacity:1;}100%{opacity:0;transform:translateX(-50%) translateY(-8px);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        .modal{animation:slideUp 0.2s ease;}
        .note-row{animation:fadeIn 0.18s ease;}
        .toast{animation:toast 2.5s ease forwards;}
        .teams-pulse{animation:pulse 2s infinite;}
      `}</style>

      <div style={{ minHeight:"100vh", background:"linear-gradient(140deg,#0a0c12 0%,#10131e 55%,#0d0f18 100%)", display:"flex", fontFamily:"'DM Sans',sans-serif" }}>

        {/* ══ SIDEBAR ══ */}
        <div style={{ width:215, flexShrink:0, background:"rgba(255,255,255,0.022)", borderRight:"1px solid rgba(255,255,255,0.065)", padding:"24px 11px", display:"flex", flexDirection:"column", gap:3 }}>
          <div style={{ paddingLeft:8, marginBottom:20 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#fff" }}>Note<span style={{color:"#4F8EF7"}}>Flow</span></div>
            <div style={{ color:"rgba(255,255,255,0.28)", fontSize:10, marginTop:2, fontFamily:"'DM Mono',monospace" }}>capture · organize · find</div>
          </div>

          {/* All Notes */}
          <button onClick={()=>setActiveView("notes")} style={{ background:activeView==="notes"?"rgba(79,142,247,0.14)":"transparent", border:"none", borderRadius:9, padding:"8px 11px", color:activeView==="notes"?"#4F8EF7":"rgba(255,255,255,0.42)", fontSize:13, fontWeight:activeView==="notes"?700:400, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
            <span>📋 All Notes</span>
            <span style={{ background:"rgba(255,255,255,0.07)", borderRadius:7, padding:"1px 6px", fontSize:11 }}>{notes.length}</span>
          </button>

          {/* Teams Inbox */}
          <button onClick={()=>setActiveView("teams")} style={{ background:activeView==="teams"?"rgba(79,142,247,0.14)":"transparent", border:"none", borderRadius:9, padding:"8px 11px", color:activeView==="teams"?"#4F8EF7":teamsInboxCount>0?"#4F8EF7":"rgba(255,255,255,0.42)", fontSize:13, fontWeight:activeView==="teams"||teamsInboxCount>0?700:400, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
            <span>🔵 Teams Inbox</span>
            {teamsInboxCount>0&&(
              <span className="teams-pulse" style={{ background:"rgba(79,142,247,0.25)", color:"#4F8EF7", border:"1px solid rgba(79,142,247,0.4)", borderRadius:7, padding:"1px 6px", fontSize:11, fontWeight:700 }}>{teamsInboxCount}</span>
            )}
          </button>

          {/* Follow-ups */}
          <button onClick={()=>setActiveView("accountability")} style={{ background:activeView==="accountability"?"rgba(255,79,79,0.12)":"transparent", border:"none", borderRadius:9, padding:"8px 11px", color:activeView==="accountability"?(overdueCount>0?"#FF4F4F":"#FFD700"):"rgba(255,255,255,0.42)", fontSize:13, fontWeight:activeView==="accountability"?700:400, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
            <span>{overdueCount>0?"⚠":"⏳"} Follow-ups</span>
            {openCount>0&&<span style={{ background:overdueCount>0?"rgba(255,79,79,0.25)":"rgba(255,200,0,0.2)", color:overdueCount>0?"#FF4F4F":"#FFD700", borderRadius:7, padding:"1px 6px", fontSize:11, fontWeight:700 }}>{openCount}</span>}
          </button>

          <div style={{ color:"rgba(255,255,255,0.16)", fontSize:9, letterSpacing:1.3, fontFamily:"'DM Mono',monospace", padding:"9px 11px 3px", textTransform:"uppercase" }}>Folders</div>

          {CATEGORIES.map((cat)=>(
            <button key={cat.id} onClick={()=>{setActiveFolder(cat.id);setActiveView("notes");}} style={{ background:activeFolder===cat.id&&activeView==="notes"?`${cat.color}16`:"transparent", border:"none", borderRadius:9, padding:"8px 11px", color:activeFolder===cat.id&&activeView==="notes"?cat.color:"rgba(255,255,255,0.42)", fontSize:13, fontWeight:activeFolder===cat.id&&activeView==="notes"?700:400, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", transition:"all 0.13s" }}>
              <span>{cat.icon} {cat.label}</span>
              {catCount(cat.id)>0&&<span style={{ background:`${cat.color}20`, color:cat.color, borderRadius:7, padding:"1px 6px", fontSize:11, fontWeight:700 }}>{catCount(cat.id)}</span>}
            </button>
          ))}

          <div style={{flex:1}} />

          {/* My Name */}
          <div style={{ background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"9px 11px", marginBottom:6 }}>
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:5, textTransform:"uppercase" }}>My Name</div>
            {editingName?(
              <div style={{display:"flex",gap:5}}>
                <input value={myName} onChange={(e)=>setMyName(e.target.value)} placeholder="Your name…" onKeyDown={(e)=>{if(e.key==="Enter"){saveMyName(myName);setEditingName(false);}}} style={{...inputSt,fontSize:11,padding:"5px 8px",flex:1}} />
                <button onClick={()=>{saveMyName(myName);setEditingName(false);}} style={{background:"#4F8EF7",border:"none",borderRadius:7,color:"#fff",cursor:"pointer",fontSize:11,padding:"5px 8px"}}>✓</button>
              </div>
            ):(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#4F8EF7",fontSize:12,fontWeight:700}}>{myName||"Not set"}</span>
                <button onClick={()=>setEditingName(true)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:11}}>edit</button>
              </div>
            )}
          </div>

          {/* Alert Email */}
          <div style={{ background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"9px 11px", marginBottom:6 }}>
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:5, textTransform:"uppercase" }}>Alert Email</div>
            {editingEmail?(
              <div style={{display:"flex",gap:5}}>
                <input type="email" value={myEmail} onChange={(e)=>setMyEmail(e.target.value)} placeholder="you@gmail.com" onKeyDown={(e)=>{if(e.key==="Enter"){saveMyEmail(myEmail);setEditingEmail(false);}}} style={{...inputSt,fontSize:11,padding:"5px 8px",flex:1}} />
                <button onClick={()=>{saveMyEmail(myEmail);setEditingEmail(false);}} style={{background:"#4F8EF7",border:"none",borderRadius:7,color:"#fff",cursor:"pointer",fontSize:11,padding:"5px 8px"}}>✓</button>
              </div>
            ):(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#4FC68A",fontSize:11,fontWeight:700,wordBreak:"break-all"}}>{myEmail||"Not set"}</span>
                <button onClick={()=>setEditingEmail(true)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:11,flexShrink:0}}>edit</button>
              </div>
            )}
          </div>

          <div style={{ background:"rgba(79,198,138,0.07)", border:"1px solid rgba(79,198,138,0.13)", borderRadius:9, padding:"7px 11px" }}>
            <div style={{color:"#4FC68A",fontSize:10,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>☁ CLOUD + TEAMS SYNC</div>
            <div style={{color:"rgba(255,255,255,0.28)",fontSize:10,marginTop:1,fontFamily:"'DM Mono',monospace"}}>Mon–Fri 8am + Fri 5pm alerts</div>
          </div>
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {loading?(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.3)",fontSize:14}}>Loading your notes…</div>

          ):activeView==="teams"?(
            /* ── TEAMS INBOX VIEW ── */
            <>
              <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid rgba(255,255,255,0.055)", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{flex:1}}>
                  <h1 style={{color:"#fff",fontSize:18,fontFamily:"'Playfair Display',serif"}}>🔵 Teams Inbox</h1>
                  <div style={{color:"rgba(255,255,255,0.28)",fontSize:11,marginTop:1}}>
                    {teamsInboxCount>0?`${teamsInboxCount} meeting${teamsInboxCount>1?"s":""} imported — tap to review`:"No pending Teams imports"}
                  </div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"16px 22px"}}>
                {notes.filter(n=>n.source==="teams").length===0?(
                  <div style={{textAlign:"center",color:"rgba(255,255,255,0.2)",marginTop:60}}>
                    <div style={{fontSize:40,marginBottom:12}}>🔵</div>
                    <div style={{fontSize:15,fontFamily:"'DM Sans',sans-serif"}}>No Teams meetings yet</div>
                    <div style={{fontSize:12,marginTop:6,opacity:0.7,maxWidth:320,margin:"8px auto 0"}}>
                      Once Power Automate is set up, your Teams meeting summaries will appear here automatically after each meeting ends.
                    </div>
                    <div style={{marginTop:20,background:"rgba(79,142,247,0.07)",border:"1px solid rgba(79,142,247,0.15)",borderRadius:12,padding:"14px 18px",maxWidth:380,margin:"20px auto 0",textAlign:"left"}}>
                      <div style={{color:"#4F8EF7",fontSize:12,fontWeight:700,marginBottom:8}}>Setup checklist:</div>
                      <div style={{color:"rgba(255,255,255,0.5)",fontSize:12,lineHeight:2}}>
                        ① Supabase webhook function deployed<br/>
                        ② Power Automate flow created<br/>
                        ③ Webhook URL added to Power Automate<br/>
                        ④ Test meeting run
                      </div>
                    </div>
                  </div>
                ):notes.filter(n=>n.source==="teams").map((note)=>(
                  <div key={note.id} className="note-row" style={{ background:!note.teams_reviewed?"rgba(79,142,247,0.06)":"rgba(255,255,255,0.03)", border:`1px solid ${!note.teams_reviewed?"rgba(79,142,247,0.25)":"rgba(255,255,255,0.07)"}`, borderRadius:14, padding:"14px 16px", marginBottom:10, cursor:"pointer" }}
                    onClick={()=>!note.teams_reviewed&&setTeamsImport(note)}>
                    <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
                      <div>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}>
                          <span style={{color:"#4F8EF7",fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>🔵 TEAMS</span>
                          {!note.teams_reviewed&&<span style={{background:"rgba(79,142,247,0.2)",color:"#4F8EF7",borderRadius:6,padding:"1px 8px",fontSize:10,fontWeight:700}}>NEEDS REVIEW</span>}
                          {note.teams_reviewed&&<span style={{color:"rgba(255,255,255,0.25)",fontSize:10}}>reviewed</span>}
                        </div>
                        <div style={{color:"#fff",fontSize:13,fontWeight:600}}>{note.topic||"Untitled Meeting"}</div>
                        <div style={{color:"rgba(255,255,255,0.4)",fontSize:11,marginTop:3}}>
                          {note.date&&`📅 ${fmtDate(note.date)}`} {note.people&&`· 👤 ${note.people}`}
                        </div>
                      </div>
                      {!note.teams_reviewed&&(
                        <button onClick={(e)=>{e.stopPropagation();setTeamsImport(note);}} style={{background:"linear-gradient(135deg,#4F8EF7,#7B5CF7)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",padding:"8px 14px",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>Review →</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>

          ):activeView==="notes"?(
            /* ── NOTES VIEW ── */
            <>
              <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid rgba(255,255,255,0.055)", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{flex:1}}>
                  <h1 style={{color:"#fff",fontSize:18,fontFamily:"'Playfair Display',serif"}}>{activeFolder==="all"?"All Notes":CATEGORIES.find((c)=>c.id===activeFolder)?.label}</h1>
                  <div style={{color:"rgba(255,255,255,0.28)",fontSize:11,marginTop:1}}>{filtered.length} note{filtered.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.055)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:11,padding:"7px 12px",gap:7,minWidth:170}}>
                  <span style={{fontSize:13,opacity:0.4}}>🔍</span>
                  <input value={searchText} onChange={(e)=>setSearchText(e.target.value)} placeholder="Search all notes…" style={{background:"transparent",border:"none",color:"#fff",fontSize:13,width:"100%"}} />
                  {searchText&&<button onClick={()=>setSearchText("")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:13,padding:0}}>✕</button>}
                </div>
                <button onClick={()=>setShowFilters((s)=>!s)} style={{background:showFilters?"rgba(79,142,247,0.18)":"rgba(255,255,255,0.055)",border:`1px solid ${showFilters?"rgba(79,142,247,0.4)":"rgba(255,255,255,0.09)"}`,borderRadius:11,padding:"7px 13px",color:showFilters?"#4F8EF7":"rgba(255,255,255,0.45)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  🎛 Filters {(searchDate||searchPeople||searchTopic)&&<span style={{background:"#4F8EF7",color:"#fff",borderRadius:999,width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>!</span>}
                </button>
                <button onClick={()=>setModal("new")} style={{background:"linear-gradient(135deg,#4F8EF7,#7B5CF7)",border:"none",borderRadius:13,padding:"9px 17px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 16px rgba(79,142,247,0.3)",whiteSpace:"nowrap"}}>✏️ New Note</button>
              </div>
              {showFilters&&(
                <div style={{padding:"11px 22px",borderBottom:"1px solid rgba(255,255,255,0.055)",background:"rgba(255,255,255,0.018)",display:"flex",gap:11,flexWrap:"wrap",alignItems:"flex-end"}}>
                  <div><Label>Date</Label><input type="date" value={searchDate} onChange={(e)=>setSearchDate(e.target.value)} style={{...inputSt,width:155,fontSize:12,padding:"7px 10px"}} /></div>
                  <div><Label>People</Label><input value={searchPeople} onChange={(e)=>setSearchPeople(e.target.value)} placeholder="Name…" style={{...inputSt,width:160,fontSize:12,padding:"7px 10px"}} /></div>
                  <div><Label>Topic</Label><input value={searchTopic} onChange={(e)=>setSearchTopic(e.target.value)} placeholder="Topic…" style={{...inputSt,width:160,fontSize:12,padding:"7px 10px"}} /></div>
                  {(searchDate||searchPeople||searchTopic)&&<button onClick={()=>{setSearchDate("");setSearchPeople("");setSearchTopic("");}} style={{background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.22)",borderRadius:9,padding:"7px 13px",color:"rgba(255,100,100,0.75)",fontSize:12,cursor:"pointer",alignSelf:"flex-end"}}>Clear</button>}
                </div>
              )}
              <div style={{flex:1,overflowY:"auto",padding:"16px 22px"}}>
                {filtered.length===0?(
                  <div style={{textAlign:"center",color:"rgba(255,255,255,0.2)",marginTop:60}}>
                    <div style={{fontSize:36,marginBottom:10}}>📝</div>
                    <div style={{fontSize:14}}>No notes found</div>
                    <div style={{fontSize:11,marginTop:4}}>Tap New Note to get started</div>
                  </div>
                ):filtered.map((note)=>(
                  <NoteCard key={note.id} note={note} onDelete={requestDelete} onMove={handleMove}
                    onToggleFollowUp={handleToggleFollowUp} onEdit={(n)=>setModal(n)} myName={myName} />
                ))}
              </div>
            </>

          ):(
            /* ── ACCOUNTABILITY VIEW ── */
            <>
              <div style={{padding:"18px 22px 14px",borderBottom:"1px solid rgba(255,255,255,0.055)",display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1}}>
                  <h1 style={{color:"#fff",fontSize:18,fontFamily:"'Playfair Display',serif"}}>Follow-up Accountability</h1>
                  <div style={{color:"rgba(255,255,255,0.28)",fontSize:11,marginTop:1}}>{overdueCount>0?`⚠ ${overdueCount} overdue`:openCount>0?`${openCount} open`:"All clear"}</div>
                </div>
                <button onClick={()=>setModal("new")} style={{background:"linear-gradient(135deg,#4F8EF7,#7B5CF7)",border:"none",borderRadius:13,padding:"9px 17px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 16px rgba(79,142,247,0.3)"}}>✏️ New Note</button>
              </div>
              <AccountabilityPanel notes={notes} myName={myName} onToggleFollowUp={handleToggleFollowUp} />
            </>
          )}
        </div>
      </div>

      {/* TOAST */}
      {savedToast&&<div className="toast" style={{position:"fixed",bottom:26,left:"50%",background:"rgba(79,198,138,0.95)",color:"#fff",borderRadius:12,padding:"8px 18px",fontSize:13,fontWeight:700,zIndex:300,boxShadow:"0 4px 20px rgba(79,198,138,0.4)",display:"flex",alignItems:"center",gap:7,pointerEvents:"none"}}>{savedToast}</div>}

      {/* NOTE MODAL */}
      {modal&&<NoteModal initial={modal==="new"?null:modal} onSave={handleSave} onClose={()=>setModal(null)} />}

      {/* DELETE CONFIRM */}
      {deleteTarget&&<DeleteConfirmModal note={deleteTarget} onConfirm={confirmDelete} onCancel={()=>setDeleteTarget(null)} />}

      {/* TEAMS IMPORT REVIEW */}
      {teamsImport&&<TeamsImportModal note={teamsImport} onSave={handleTeamsImportSave} onDismiss={handleTeamsDismiss} />}
    </>
  );
}
