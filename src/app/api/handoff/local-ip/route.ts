import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

export async function GET() {
    const nets = networkInterfaces();
    let localIp = "localhost";

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            // Skip over non-IPv4, internal (127.0.0.1), and link-local (169.254.x.x) addresses
            if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254")) {
                localIp = net.address;
                break;
            }
        }
    }

    return NextResponse.json({ ip: localIp });
}
