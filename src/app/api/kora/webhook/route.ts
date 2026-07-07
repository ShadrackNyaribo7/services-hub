import { NextResponse } from "next/server";
import { koraVerificationService } from "@/lib/kora/koraVerificationService";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Validate webhook signature for security
    const signature = request.headers.get('x-kora-signature');
    if (signature && !koraVerificationService.validateWebhookSignature(payload, signature)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Process the webhook
    const { success, reference, status } = koraVerificationService.processWebhook(payload);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to process webhook" },
        { status: 400 }
      );
    }

    // Update provider profile verification status based on webhook
    // This assumes you store the verification reference in your database
    const providerProfile = await prisma.providerProfile.findFirst({
      where: {
        // You'll need to add a field to store the Kora verification reference
        // For now, this is a placeholder
      },
    });

    if (providerProfile) {
      // Update verification status based on Kora response
      const verificationStatus = status === 'success' ? 'APPROVED' : 'REJECTED';
      
      await prisma.providerProfile.update({
        where: { id: providerProfile.id },
        data: {
          verificationStatus: verificationStatus as any,
          adminNotes: `Kora verification completed: ${status}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    }, { status: 200 });

  } catch (error) {
    console.error("Kora webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
