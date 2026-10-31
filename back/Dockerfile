# Imagem do back para a AWS (ECS Fargate, App Runner, Elastic Beanstalk "Docker" ou EC2).
# Build:  docker build -t apae-back ./back
# Rodar:  docker run --env-file apae-aws.env -p 8080:8080 apae-back
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B package -DskipTests && cp target/central-secretaria-*.jar /app.jar

FROM eclipse-temurin:21-jre
# Usuário sem privilégios; o jar fica só para leitura.
RUN groupadd --system apae && useradd --system --gid apae --no-create-home --shell /usr/sbin/nologin apae
WORKDIR /app
COPY --from=build --chown=root:root --chmod=444 /app.jar /app/central-secretaria.jar
USER apae
ENV SPRING_PROFILES_ACTIVE=aws \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/central-secretaria.jar"]
