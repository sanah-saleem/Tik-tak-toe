FROM heroiclabs/nakama:3.21.0

# Copy server runtime modules + config into the image
COPY ./modules /nakama/data/modules
COPY ./local.yml /nakama/data/local.yml

# Add start script (runs migrate then starts server)
COPY ./start.sh /nakama/start.sh
RUN chmod +x /nakama/start.sh

# Nakama ports
EXPOSE 7350 7351

ENTRYPOINT ["/nakama/start.sh"]
