# Sirve la build estática de Vite desde dist/ usando nginx
FROM nginx:stable-alpine

# Configuración nginx personalizada (SPA fallback para React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia la build compilada al directorio HTML de nginx
COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
