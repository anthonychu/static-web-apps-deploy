FROM anthonychu/staticappsclient:20211001.1
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]
