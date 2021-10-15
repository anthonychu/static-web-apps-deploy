FROM anthonychu/staticappsclient:20211001.2
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]
