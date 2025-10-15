import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

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

    const zip = new JSZip();
    let fileCount = 0;

    for (const file of files) {
      try {
        const { data } = supabase.storage
          .from("construction-files")
          .getPublicUrl(`${submissionId}/${file.name}`);

        const response = await fetch(data.publicUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          zip.file(file.name, arrayBuffer);
          fileCount++;
          console.log(`Added file to zip: ${file.name}`);
        }
      } catch (err) {
        console.error(`Error adding file ${file.name} to zip:`, err);
      }
    }

    if (submission.audio_description_url) {
      try {
        const response = await fetch(submission.audio_description_url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          zip.file("audio_description.webm", arrayBuffer);
          fileCount++;
          console.log("Added audio to zip");
        }
      } catch (err) {
        console.error("Error adding audio to zip:", err);
      }
    }

    if (submission.video_url) {
      try {
        const response = await fetch(submission.video_url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const extension = submission.video_url.split('.').pop() || 'mp4';
          zip.file(`video.${extension}`, arrayBuffer);
          fileCount++;
          console.log("Added video to zip");
        }
      } catch (err) {
        console.error("Error adding video to zip:", err);
      }
    }

    if (fileCount === 0) {
      return new Response(
        JSON.stringify({ error: "No files could be added to archive" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating ZIP with ${fileCount} files...`);
    const zipBlob = await zip.generateAsync({ type: "uint8array" });

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

    const zipPath = `archives/${archiveName}.zip`;

    console.log(`Uploading ZIP to storage: ${zipPath}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("construction-files")
      .upload(zipPath, zipBlob, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading ZIP:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload archive" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: urlData } = supabase.storage
      .from("construction-files")
      .getPublicUrl(zipPath);

    console.log(`Archive created successfully: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        archiveName: archiveName,
        archiveUrl: urlData.publicUrl,
        filesCount: fileCount,
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