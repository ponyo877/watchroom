FROM golang:1.23-alpine

# Use http for apk to avoid Docker Desktop SSL issues in local development
RUN sed -i 's/https/http/' /etc/apk/repositories && \
    apk add --no-cache git gcc musl-dev
RUN go install github.com/air-verse/air@v1.61.7

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 8080

CMD ["air", "-c", "./cmd/api-server/air.toml"]
