# ---- build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
# Cache dependencies first
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -q -B dependency:go-offline
# Build
COPY src/ src/
RUN ./mvnw -q -B -DskipTests clean package

# ---- run stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/ledger-api-*.jar app.jar
EXPOSE 8080
# Render provides $PORT; Spring reads it (server.port=${PORT:8080}).
ENTRYPOINT ["java", "-jar", "app.jar"]
