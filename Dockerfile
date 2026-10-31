# Imagem base: servidor web Nginx enxuto (versao Alpine Linux, bem pequena)
FROM nginx:alpine

# Copia os arquivos da aplicacao para a pasta que o Nginx serve
COPY index.html style.css script.js /usr/share/nginx/html/

# Porta padrao do Nginx
EXPOSE 80
