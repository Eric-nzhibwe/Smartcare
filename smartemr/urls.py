from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as static_serve


def spa(request, path=''):
    """Serve the SPA index.html for all non-API, non-admin routes."""
    return static_serve(request, 'index.html', document_root=settings.STATICFILES_DIRS[0])


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('emr.urls')),
    # Catch-all: anything that is NOT admin/ or api/ goes to the SPA
    path('', spa),
    re_path(r'^(?!admin|api|static).*$', spa),
] + static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
