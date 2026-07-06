import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logSupabaseConnectionOnce } from '@/lib/supabase-connection-log'
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '@/lib/supabase-config'
import { getWorkspaceModeFromRequest } from '@/lib/workspace'

function applyWorkspaceRedirect(request: NextRequest, response: NextResponse): NextResponse {
  const pathname = request.nextUrl.pathname
  const mode = getWorkspaceModeFromRequest(request.cookies)

  if (pathname === '/dashboard' && mode === 'business') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/business'
    const redirect = NextResponse.redirect(url, 307)
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  if (pathname.startsWith('/dashboard/business') && mode === 'personal') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirect = NextResponse.redirect(url, 307)
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  return response
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      const pathname = request.nextUrl.pathname
      const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/auth')
      if (!isPublic) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'config')
        return NextResponse.redirect(url)
      }
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    getSupabaseUrl()!,
    getSupabaseAnonKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  logSupabaseConnectionOnce(!authError, authError?.message)

  const pathname = request.nextUrl.pathname
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth")

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  ) {
    const url = request.nextUrl.clone()
    const mode = getWorkspaceModeFromRequest(request.cookies)
    url.pathname = mode === "business" ? "/dashboard/business" : "/dashboard"
    url.search = ""
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return applyWorkspaceRedirect(request, supabaseResponse)
}
