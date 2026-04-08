import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REMINDER_1_MESSAGE =
  "Dobrý deň,\n\nradi by sme Vás priateľsky upozornili, že na spracovanie Vašej požiadavky ešte potrebujeme doplniť niektoré informácie. Bez nich, žiaľ, nemôžeme pokračovať.\n\nProsíme, odpovedzte na túto správu alebo sa prihláste do systému a doplňte požadované údaje.\n\nĎakujeme za spoluprácu a prajeme pekný deň!\nVáš tím zákazníckej podpory";

const REMINDER_2_MESSAGE =
  "Dobrý deň,\n\nopäť sa ozývame, pretože stále čakáme na doplnenie informácií k Vašej požiadavke. Chceme ju vybaviť čo najskôr, no bez Vašej odpovede to, žiaľ, nie je možné.\n\nAk potrebujete pomoc alebo máte otázky, neváhajte nás kontaktovať – radi Vám pomôžeme.\n\nĎakujeme za Váš čas!\nVáš tím zákazníckej podpory";

const HOURS_48 = 48 * 60 * 60 * 1000;
const HOURS_96 = 96 * 60 * 60 * 1000;
const DAYS_7 = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all tickets with status 'needs_info' that have a needs_info_since timestamp
    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("status", "needs_info")
      .not("needs_info_since", "is", null);

    if (error) {
      console.error("Error fetching tickets:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const results = { reminders_sent: 0, suspended: 0, skipped: 0 };

    for (const ticket of tickets || []) {
      const elapsed = now - new Date(ticket.needs_info_since).getTime();
      const remindersSent = ticket.reminders_sent || 0;

      // Auto-suspend after 7 days
      if (elapsed >= DAYS_7) {
        await supabase
          .from("tickets")
          .update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);

        results.suspended++;
        console.log(`Ticket ${ticket.ticket_code}: suspended (7+ days without response)`);
        continue;
      }

      // Send reminder 2 after 96 hours
      if (remindersSent < 2 && elapsed >= HOURS_96) {
        const reminderNumber = 2;

        // Log reminder
        await supabase.from("ticket_reminder_log").insert({
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          reminder_number: reminderNumber,
          message: REMINDER_MESSAGE,
        });

        // Update ticket
        await supabase
          .from("tickets")
          .update({
            reminders_sent: reminderNumber,
            last_reminder_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);

        results.reminders_sent++;
        console.log(`Ticket ${ticket.ticket_code}: reminder #${reminderNumber} sent`);
        continue;
      }

      // Send reminder 1 after 48 hours
      if (remindersSent < 1 && elapsed >= HOURS_48) {
        const reminderNumber = 1;

        // Log reminder
        await supabase.from("ticket_reminder_log").insert({
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          reminder_number: reminderNumber,
          message: REMINDER_MESSAGE,
        });

        // Update ticket
        await supabase
          .from("tickets")
          .update({
            reminders_sent: reminderNumber,
            last_reminder_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);

        results.reminders_sent++;
        console.log(`Ticket ${ticket.ticket_code}: reminder #${reminderNumber} sent`);
        continue;
      }

      results.skipped++;
    }

    console.log("Reminder processing complete:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
