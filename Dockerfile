# Verpakt de statische site in een kleine nginx-container.
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*
COPY prototype/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
