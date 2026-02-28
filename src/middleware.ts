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
    // Current matcher protects everything EXCEPT the ones listed.
    // We'll keep the current structure but ensure all sensitive API routes are NOT in the exclusion list.
    // Actually, a cleaner "secure-by-default" approach is to list what's PUBLIC.
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - login (sign in page)
         * - api/auth (NextAuth endpoints)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets
         */
        "/((?!login|api/auth|_next/static|_next/image|favicon.ico|uploads|.*\\.).*)",
    ],
};
