from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as static_serve
from django.http import HttpResponsePermanentRedirect
import os


def spa(request, path=''):
    """Serve the SPA index.html for all non-API, non-admin routes."""
    # In production, collectstatic writes to STATIC_ROOT (staticfiles/).
    # In development, serve directly from the source static/ directory.
    doc_root = settings.STATIC_ROOT if os.path.exists(
        os.path.join(settings.STATIC_ROOT, 'index.html')
    ) else settings.STATICFILES_DIRS[0]
    return static_serve(request, 'index.html', document_root=doc_root)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('emr.urls')),
    path('', spa),
    re_path(r'^(?!admin|api|static).*$', spa),
] + static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
