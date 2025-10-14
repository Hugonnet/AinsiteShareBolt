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
    const formData = await req.formData();
    
    const entreprise = formData.get("entreprise") as string;
    const ville = formData.get("ville") as string || "";
    const departement = formData.get("departement") as string || "";
    const typeProjet = formData.get("typeProjet") as string || "";
    const description = formData.get("description") as string || "";
    const latitude = formData.get("latitude") as string || null;
    const longitude = formData.get("longitude") as string || null;
    const accuracy = formData.get("accuracy") as string || null;
    const audioDuration = formData.get("audioDuration") as string || null;
    const files = formData.getAll("files") as File[];
    const audioFile = formData.get("audio") as File | null;

    if (!entreprise) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No files provided" }),
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

    let audioUrl = null;

    if (audioFile) {
      const timestamp = Date.now();
      const audioPath = `${timestamp}_audio.webm`;
      const arrayBuffer = await audioFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { data: audioUploadData, error: audioUploadError } = await supabase.storage
        .from("audio-recordings")
        .upload(audioPath, uint8Array, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (!audioUploadError && audioUploadData) {
        const { data: audioUrlData } = supabase.storage
          .from("audio-recordings")
          .getPublicUrl(audioPath);
        audioUrl = audioUrlData.publicUrl;
      }
    }

    const { data: submission, error: dbError } = await supabase
      .from("file_submissions")
      .insert({
        entreprise,
        ville,
        departement,
        type_projet: typeProjet,
        message: description,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        location_accuracy: accuracy ? parseFloat(accuracy) : null,
        audio_description_url: audioUrl,
        audio_duration: audioDuration ? parseInt(audioDuration) : null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const uploadedFiles: { name: string; path: string; url: string }[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${submission.id}/${timestamp}_${sanitizedFileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("construction-files")
        .upload(filePath, uint8Array, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("construction-files")
        .getPublicUrl(filePath);

      uploadedFiles.push({
        name: file.name,
        path: uploadData.path,
        url: urlData.publicUrl,
      });
    }

    const archiveResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-archive`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId: submission.id,
          ville: ville,
          departement: departement,
        }),
      }
    );

    let archiveUrl = null;
    let archiveName = null;

    if (archiveResponse.ok) {
      const archiveData = await archiveResponse.json();
      archiveUrl = archiveData.archiveUrl;
      archiveName = archiveData.archiveName;
    } else {
      console.error("Failed to create archive");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          uploadedFiles: uploadedFiles.length
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const locationInfo = latitude && longitude ? `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">📍 Localisation</h2>
        <p style="color: #4b5563; line-height: 1.6; margin: 0; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          ${ville}<br>
          Coordonnées: ${parseFloat(latitude).toFixed(6)}, ${parseFloat(longitude).toFixed(6)}<br>
          ${accuracy ? `Précision: ±${Math.round(parseFloat(accuracy))}m<br>` : ''}
          <a href="https://www.google.com/maps?q=${latitude},${longitude}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Voir sur Google Maps</a>
        </p>
      </div>
    ` : ville ? `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">📍 Localisation</h2>
        <p style="color: #4b5563; line-height: 1.6; margin: 0; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          ${ville}
        </p>
      </div>
    ` : '';

    const audioInfo = audioUrl ? `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">🎤 Message vocal</h2>
        <p style="color: #4b5563; line-height: 1.6; margin: 0; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          Durée: ${audioDuration ? `${Math.floor(parseInt(audioDuration) / 60)}:${(parseInt(audioDuration) % 60).toString().padStart(2, '0')}` : 'N/A'}<br>
          <a href="${audioUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Écouter l'enregistrement</a>
        </p>
      </div>
    ` : '';

    const fileListHtml = uploadedFiles
      .map(
        (f, i) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${f.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <a href="${f.url}" style="color: #3b82f6; text-decoration: none;">Télécharger</a>
          </td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0;">
                  Nouveau projet partagé
                </h1>
              </div>
              
              <div style="margin-bottom: 24px;">
                <h2 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Informations</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Entreprise:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${entreprise}</td>
                  </tr>
                  ${departement ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Département:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${departement}</td>
                  </tr>
                  ` : ''}
                  ${typeProjet ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Type de projet:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${typeProjet === 'neuf' ? 'Projet neuf' : 'Rénovation'}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              ${locationInfo}
              ${audioInfo}
              
              ${description ? `
              <div style="margin-bottom: 24px;">
                <h2 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">Description</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0; background-color: #f9fafb; padding: 16px; border-radius: 8px;">${description}</p>
              </div>
              ` : ''}

              ${archiveUrl ? `
              <div style="margin-bottom: 32px; text-align: center;">
                <a href="${archiveUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                  📦 Télécharger l'archive complète (${archiveName})
                </a>
                <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">
                  Tous les fichiers et l'audio dans une seule archive ZIP
                </p>
              </div>
              ` : ''}

              <div style="margin-bottom: 24px;">
                <h2 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Photos (${uploadedFiles.length})</h2>
                <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f3f4f6;">
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">#</th>
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Nom du fichier</th>
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${fileListHtml}
                  </tbody>
                </table>
              </div>
              
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                  Soumission reçue le ${new Date().toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Partage Fichiers <onboarding@resend.dev>",
        to: ["ainsitenet@gmail.com"],
        subject: `Nouveau projet - ${entreprise} (${typeProjet === 'neuf' ? 'Projet neuf' : 'Rénovation'})`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send email",
          details: emailError,
          uploadedFiles: uploadedFiles.length
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        submissionId: submission.id,
        filesUploaded: uploadedFiles.length,
        emailSent: true,
        emailId: emailResult.id,
        archiveUrl: archiveUrl,
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