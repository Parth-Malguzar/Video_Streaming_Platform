import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce Authentication
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the Multipart Form Data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadType = formData.get("type") as "video" | "image" | null; // "video" or "image"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!uploadType || (uploadType !== "video" && uploadType !== "image")) {
      return NextResponse.json(
        { error: "Invalid upload type. Must be 'video' or 'image'" },
        { status: 400 }
      );
    }

    // 3. Convert Next.js Web File object to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload to Cloudinary (will go to 'dtube/videos' or 'dtube/thumbnails')
    const folder = uploadType === "video" ? "videos" : "thumbnails";
    const uploadResult = await uploadToCloudinary(buffer, folder, uploadType);

    // 5. Return the Cloudinary URLs
    return NextResponse.json({
      message: `${uploadType} uploaded successfully`,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: "Failed to upload file to Cloudinary" },
      { status: 500 }
    );
  }
}
