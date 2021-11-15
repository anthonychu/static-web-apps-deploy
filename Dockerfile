FROM mcr.microsoft.com/appsvc/staticappsclient:stable

RUN apt-get update && \
    apt-get -y install curl gnupg && \
    curl -sL https://deb.nodesource.com/setup_12.x  | bash - && \
    apt-get -y install nodejs

COPY entrypoint.sh /entrypoint.sh
COPY nextjs2swa /nextjs2swa
ENTRYPOINT ["sh", "/entrypoint.sh"]