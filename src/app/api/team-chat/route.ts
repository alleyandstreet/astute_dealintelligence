
import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userEmail = session?.user?.email;

        // Fetch messages that are NOT deleted for this user
        // Note: Prisma doesn't support array contains filtering easily on basic arrays in all DBs, 
        // but for Postgres it does. We'll fetch and filter or use raw query if needed. 
        // For simplicity with standard Prisma:
        const messages = await prisma.teamMessage.findMany({
            orderBy: { createdAt: "asc" },
            take: 50,
        });

        // Filter in memory for MVP (deletedFor is string[])
        const visibleMessages = messages.filter(msg =>
            !userEmail || !msg.deletedFor.includes(userEmail)
        );

        return NextResponse.json(visibleMessages);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();
        const { content, sender, attachment, attachmentType } = body; // client still sends sender name for display

        // Content is required unless there's an attachment
        if (!content && !attachment) {
            return NextResponse.json({ error: "Content or attachment is required" }, { status: 400 });
        }

        const message = await prisma.teamMessage.create({
            data: {
                content: content || "",
                sender: sender || "User",
                senderEmail: session?.user?.email, // Securely track who sent it
                attachment,
                attachmentType,
            },
        });

        return NextResponse.json(message);
    } catch (error) {
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}

// Edit Message
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { id, content } = await req.json();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const message = await prisma.teamMessage.findUnique({ where: { id } });

        if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

        // Verify ownership
        if (message.senderEmail !== session.user.email) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Prepare history entry
        const historyEntry = {
            content: message.content,
            timestamp: new Date().toISOString()
        };

        const currentHistory = (message.editHistory as any[]) || [];

        const updatedMessage = await prisma.teamMessage.update({
            where: { id },
            data: {
                content,
                editHistory: [...currentHistory, historyEntry],
            }
        });

        return NextResponse.json(updatedMessage);

    } catch (error) {
        return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
    }
}

// Delete For Me
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await req.json();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const message = await prisma.teamMessage.findUnique({ where: { id } });

        if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

        const updatedMessage = await prisma.teamMessage.update({
            where: { id },
            data: {
                deletedFor: {
                    push: session.user.email
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to hide message" }, { status: 500 });
    }
}

// Admin Permanent Delete
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
        }

        // In a real app, verify Admin role here too

        await prisma.teamMessage.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }
}
