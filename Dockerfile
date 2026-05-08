# Serve pre-built Angular files with nginx on port 8080 (Cloud Run requirement)
# Build the app locally first: npm run build
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/travel-planner/browser /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
