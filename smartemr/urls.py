from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as static_serve
from django.http import HttpResponsePermanentRedirect
import os


def _static_root():
    """Return the directory that contains index.html and app.html."""
    if os.path.exists(os.path.join(settings.STATIC_ROOT, 'index.html')):
        return settings.STATIC_ROOT
    return settings.STATICFILES_DIRS[0]


def login_page(request):
    """Serve the login page (index.html) for the root URL."""
    return static_serve(request, 'index.html', document_root=_static_root())


def app_shell(request):
    """Serve the app shell (app.html) for authenticated users."""
    return static_serve(request, 'app.html', document_root=_static_root())


def redirect_admin(request):
    """Redirect /admin → /admin/ since APPEND_SLASH is False."""
    return HttpResponsePermanentRedirect('/admin/')


urlpatterns = [
    # Django admin
    path('admin/', admin.site.urls),
    path('admin',  redirect_admin),

    # REST API
    path('api/', include('emr.urls')),

    # Static assets (JS, CSS, images, fonts) — must come before SPA catch-all
    re_path(
        r'^static/(?P<path>.+)$',
        static_serve,
        {'document_root': settings.STATICFILES_DIRS[0]},
    ),

    # SPA entry points
    path('app',  app_shell),   # /app  → app shell
    path('',     login_page),  # /     → login page

    # Catch-all for any other non-admin, non-api, non-static route → login
    re_path(r'^(?!admin|api|static).*$', login_page),
]
