import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { zip } from "npm:fflate@0.8.2";

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

    const sanitizedVille = ville?.replace(/[^a-zA-Z0-9]/g, '_') || '';
    const zipFileName = sanitizedVille && departement
      ? `${sanitizedVille}_${departement}_${submissionId.substring(0, 8)}.zip`
      : `projet_${submissionId.substring(0, 8)}.zip`;

    console.log("Creating archive:", zipFileName);

    const zipFilePath = `archives/${zipFileName}`;

    const fileDataPromises = files.map(async (file) => {
      const { data, error } = await supabase.storage
        .from("construction-files")
        .download(`${submissionId}/${file.name}`);

      if (error || !data) {
        console.error(`Error downloading file ${file.name}:`, error);
        return null;
      }

      const arrayBuffer = await data.arrayBuffer();
      return {
        name: file.name,
        data: new Uint8Array(arrayBuffer),
      };
    });

    if (submission.audio_description_url) {
      const audioFileName = submission.audio_description_url.split('/').pop();
      if (audioFileName) {
        const { data: audioData, error: audioError } = await supabase.storage
          .from("audio-recordings")
          .download(audioFileName);

        if (!audioError && audioData) {
          const arrayBuffer = await audioData.arrayBuffer();
          fileDataPromises.push(Promise.resolve({
            name: `audio_description.webm`,
            data: new Uint8Array(arrayBuffer),
          }));
        }
      }
    }

    if (submission.video_url) {
      const videoFileName = submission.video_url.split('/').pop();
      if (videoFileName) {
        const { data: videoData, error: videoError } = await supabase.storage
          .from("video-recordings")
          .download(videoFileName);

        if (!videoError && videoData) {
          const arrayBuffer = await videoData.arrayBuffer();
          const extension = videoFileName.split('.').pop() || 'mp4';
          fileDataPromises.push(Promise.resolve({
            name: `video.${extension}`,
            data: new Uint8Array(arrayBuffer),
          }));
        }
      }
    }

    const fileDataArray = (await Promise.all(fileDataPromises)).filter((f) => f !== null);

    const zipData = await new Promise<Uint8Array>((resolve, reject) => {
      const fileMap: Record<string, Uint8Array> = {};

      for (const fileData of fileDataArray) {
        if (fileData) {
          fileMap[fileData.name] = fileData.data;
        }
      }

      zip(fileMap, { level: 6 }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const { error: uploadError } = await supabase.storage
      .from("construction-files")
      .upload(zipFilePath, zipData, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading ZIP:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to create archive" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: urlData } = supabase.storage
      .from("construction-files")
      .getPublicUrl(zipFilePath);

    console.log("Archive created successfully:", urlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        archiveUrl: urlData.publicUrl,
        archiveName: zipFileName,
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