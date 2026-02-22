import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const res = NextResponse.next();
    const pathname = request.nextUrl.pathname;

    // Only protect dashboard routes
    const protectedRoutes = ["/student", "/mentor", "/parent"];
    const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
    if (!isProtected) return res;

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            res.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Not logged in → redirect to login
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Check role matches route
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile) {
            const requiredRole = pathname.split("/")[1]; // "student" | "mentor" | "parent"
            if (profile.role !== requiredRole) {
                // Redirect to their own dashboard
                return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
            }
        }

        return res;
    } catch (err) {
        // If middleware fails (Supabase unreachable, table missing, etc.), pass through
        // instead of returning a 500 error
        console.error("Middleware error (passing through):", err);
        return res;
    }
}

export const config = {
    matcher: ["/student/:path*", "/mentor/:path*", "/parent/:path*"],
};
