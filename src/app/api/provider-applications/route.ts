import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      fullName,
      phone,
      county,
      serviceCategory,
      policeClearanceNumber,
    } = body;

    if (!fullName || !phone || !county || !serviceCategory) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const application = await prisma.user.create({
      data: {
        name: fullName,
        phone,
        role: "PROVIDER",
        providerProfile: {
          create: {
            county,
            serviceCategory,
            policeClearanceNumber,
          },
        },
      },
      include: {
        providerProfile: true,
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not submit application." },
      { status: 500 }
    );
  }
}
