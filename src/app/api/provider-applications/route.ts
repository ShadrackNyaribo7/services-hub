import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to apply." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const {
      fullName,
      phone,
      county,
      serviceCategory,
      policeClearanceNumber,
      IDnumber,
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
            idNumber: IDnumber,
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
