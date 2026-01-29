import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // Check if accessing admin routes
        if (req.nextUrl.pathname.startsWith("/admin")) {
            const token = req.nextauth.token;
            // Only super_admin can access admin routes
            if ((token as any)?.role !== "super_admin") {
                return NextResponse.redirect(new URL("/", req.url));
            }
        }
        return NextResponse.next();
    },
    {
        pages: {
            signIn: "/login",
        },
    }
);

export const config = {
    matcher: [
        "/((?!login|api/auth|api/scan|_next/static|_next/image|favicon.ico|.*\\.).*)",
    ],
};
