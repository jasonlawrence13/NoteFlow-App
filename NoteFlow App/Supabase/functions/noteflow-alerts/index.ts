// Supabase Edge Function: teams-webhook
// File: supabase/functions/teams-webhook/index.ts
//
// This function receives POST requests from Power Automate
// containing Teams meeting summaries and action items,
// then saves them as notes in the database.
//
// Deploy with: supabase functions deploy teams-webhook
// Your webhook URL will be:
//   https://YOUR_PROJECT_REF.supabase.co/functions/v1/teams-webhook

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET        = Deno.env.get("TEAMS_WEBHOOK_SECRET")!; // shared secret for security

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ActionItem {
  title: string;       // the action item text
  assignedTo: string;  // person responsible
  dueDate?: string;    // ISO date string or empty
}

interface TeamsPayload {
  secret: string;           // must match TEAMS_WEBHOOK_SECRET
  meetingTitle: string;
  meetingDate: string;      // ISO date string
  attendees: string;        // comma-separated names
  summary: string;          // AI-generated summary text
  actionItems: ActionItem[];
  meetingId?: string;       // Teams meeting ID (optional)
}

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload: TeamsPayload = await req.json();

    // ── Verify shared secret ──────────────────────────────────────────────────
    if (payload.secret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    // ── Parse meeting date ────────────────────────────────────────────────────
    let meetingDate = "";
    try {
      meetingDate = new Date(payload.meetingDate).toISOString().slice(0, 10);
    } catch {
      meetingDate = new Date().toISOString().slice(0, 10);
    }

    // ── Convert action items to NoteFlow follow_ups format ────────────────────
    const follow_ups = (payload.actionItems || [])
      .filter((item) => item.title?.trim())
      .map((item) => {
        let deadline = "";
        if (item.dueDate) {
          try {
            deadline = new Date(item.dueDate).toISOString().slice(0, 10);
          } catch {
            deadline = "";
          }
        }
        return {
          id:       crypto.randomUUID(),
          item:     item.title.trim(),
          person:   item.assignedTo?.trim() || "",
          deadline: deadline,
          done:     false,
        };
      });

    // ── Insert note into database ─────────────────────────────────────────────
    const { data, error } = await supabase.from("notes").insert([{
      date:              meetingDate,
      people:            payload.attendees || "",
      topic:             payload.meetingTitle || "Teams Meeting",
      body:              payload.summary || "",
      category:          "meetings",         // always goes to Meetings folder
      follow_ups:        follow_ups,
      source:            "teams",            // marks it as a Teams import
      teams_reviewed:    false,              // triggers review prompt in app
      teams_meeting_id:  payload.meetingId || null,
    }]).select();

    if (error) throw new Error(`Database error: ${error.message}`);

    return new Response(
      JSON.stringify({
        success:     true,
        noteId:      data?.[0]?.id,
        followUps:   follow_ups.length,
        message:     `Teams meeting "${payload.meetingTitle}" saved to NoteFlow`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("teams-webhook error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
