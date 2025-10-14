import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { submissionId, ville, departement } = await req.json();

    console.log("Archive request received:", { submissionId, ville, departement });

    if (!submissionId) {
      return new Response(
        JSON.stringify({ error: "Missing submissionId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: submission, error: dbError } = await supabase
      .from("file_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (dbError || !submission) {
      console.error("Submission not found:", dbError);
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Submission found:", submission.id);

    const { data: files } = await supabase.storage
      .from("construction-files")
      .list(submissionId);

    console.log("Files found:", files?.length || 0);

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No files found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fileUrls = files.map(file => {
      const { data } = supabase.storage
        .from("construction-files")
        .getPublicUrl(`${submissionId}/${file.name}`);
      return {
        name: file.name,
        url: data.publicUrl,
      };
    });

    if (submission.audio_description_url) {
      fileUrls.push({
        name: "audio_description.webm",
        url: submission.audio_description_url,
      });
    }

    if (submission.video_url) {
      const extension = submission.video_url.split('.').pop() || 'mp4';
      fileUrls.push({
        name: `video.${extension}`,
        url: submission.video_url,
      });
    }

    const sanitizeForFilename = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
    };

    const sanitizedVille = ville ? sanitizeForFilename(ville) : '';
    const archiveName = sanitizedVille && departement
      ? `${sanitizedVille}_${departement}_${submissionId.substring(0, 8)}`
      : `projet_${submissionId.substring(0, 8)}`;

    console.log("Returning file list:", fileUrls.length);

    return new Response(
      JSON.stringify({
        success: true,
        archiveName: archiveName,
        files: fileUrls,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});