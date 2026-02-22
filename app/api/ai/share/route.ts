import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { copySharedAiArtifacts } from "@/lib/db";

async function verifyAuth(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) return null;
    return data.user;
}

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { targetBookId, toneId, storeBookId, bookTitle, bookAuthor } = body;

        // Need targetBookId, toneId, and at least one book identifier
        if (!targetBookId || !toneId || (!storeBookId && !bookTitle)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const success = await copySharedAiArtifacts(
            user.id,
            targetBookId,
            toneId,
            { storeBookId, bookTitle, bookAuthor }
        );

        return NextResponse.json({ success });
    } catch (error: any) {
        console.error("Error in /api/ai/share:", error);
        return NextResponse.json({ error: error.message || "Failed to share artifacts" }, { status: 500 });
    }
}
