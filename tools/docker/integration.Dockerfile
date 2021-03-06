FROM node:10.16

# Install docker and docker compose
RUN apt-get update \
    #
    # Install Docker CE CLI
    && apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common lsb-release \
    && curl -fsSL https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/gpg | apt-key add - 2>/dev/null \
    && add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]') $(lsb_release -cs) stable" \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    #
    # Install Docker Compose
    && curl -sSL "https://github.com/docker/compose/releases/download/1.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose \
    #
    # Install jq
    && apt-get -y install jq \
    # Install dependencies needed to run cypress with chrome
    && apt-get install -y xvfb libgtk-3-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 fonts-liberation libappindicator3-1 xdg-utils
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN dpkg -i google-chrome-stable_current_amd64.deb

ENV PATH=/chainlink/tools/bin:./node_modules/.bin:$PATH

# Copy only what we neeed
ARG SRCROOT=/usr/local/src/chainlink
WORKDIR ${SRCROOT}

COPY yarn.lock package.json ./
COPY evm/package.json evm/
COPY evm/v0.5/package.json evm/v0.5/
COPY integration/package.json integration/
COPY integration-scripts/package.json integration-scripts/

# install deps for our integration scripts
RUN yarn

# copy our CI test
COPY tools/ci/ethereum_test tools/ci/
COPY tools/docker tools/docker/

# copy over all our dependencies
COPY evm evm
COPY integration integration
COPY integration-scripts integration-scripts

# setup our integration testing scripts
RUN yarn workspace chainlinkv0.5 setup
RUN yarn workspace chainlink setup
RUN yarn workspace @chainlink/integration-scripts setup

ENTRYPOINT [ "tools/ci/ethereum_test" ]
